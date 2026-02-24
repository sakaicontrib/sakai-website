import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAX_FILE_CHARS = 4000;
const MAX_CONTEXT_CHARS = 120000;
const INCLUDE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".astro",
  ".css",
  ".html",
]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function safeRun(cmd, args, opts = {}) {
  try {
    return run(cmd, args, opts);
  } catch {
    return "";
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function stripFences(input) {
  const trimmed = input.trim();
  const fenced = trimmed.match(/^```(?:diff)?\n([\s\S]*?)\n```$/i);
  return fenced ? fenced[1] : trimmed;
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  const normalized = String(value ?? "");

  if (!outputFile) {
    process.stdout.write(`${name}=${normalized}\n`);
    return;
  }

  appendFileSync(outputFile, `${name}<<__OUT__\n${normalized}\n__OUT__\n`);
}

function extensionOf(path) {
  const idx = path.lastIndexOf(".");
  return idx >= 0 ? path.slice(idx).toLowerCase() : "";
}

function includeFile(path) {
  if (path.startsWith("public/images/")) return false;
  if (path.startsWith("dist/")) return false;
  if (path.startsWith("node_modules/")) return false;
  return INCLUDE_EXTENSIONS.has(extensionOf(path));
}

function readTextFile(path) {
  try {
    const size = statSync(path).size;
    if (size > 100_000) return "";
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function hasSubIssueSyntax(text) {
  if (!text) return false;

  // Common markdown task list patterns used to represent sub-issues.
  if (/(^|\n)\s*-\s*\[[ xX]\]\s*#\d+\b/.test(text)) return true;
  if (/(^|\n)\s*-\s*\[[ xX]\]\s*https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+\b/i.test(text)) return true;
  if (/\bsub-issues?\b/i.test(text)) return true;

  return false;
}

async function githubRequest(pathname, token) {
  const repo = requireEnv("GITHUB_REPOSITORY");
  const url = `https://api.github.com/repos/${repo}${pathname}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function resolveOpenRouterConfig() {
  const apiKey = requireEnv("OPENROUTER_API_KEY");
  const baseUrl = String(process.env.LLM_API_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const endpoint = String(process.env.LLM_CHAT_COMPLETIONS_PATH || "/chat/completions");
  const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2.5";
  const maxTokens = Number(process.env.LLM_MAX_TOKENS || 4000);

  return {
    apiKey,
    baseUrl,
    endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
    model,
    maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? Math.floor(maxTokens) : 4000,
  };
}

function buildOpenRouterHeaders() {
  const repo = process.env.GITHUB_REPOSITORY || "";
  const referer =
    process.env.OPENROUTER_HTTP_REFERER ||
    (repo ? `https://github.com/${repo}` : "https://github.com");
  const title = process.env.OPENROUTER_X_TITLE || (repo ? `${repo} ai issue bot` : "ai issue bot");

  return {
    "HTTP-Referer": referer,
    "X-Title": title,
  };
}

async function llmCompletion({ providerConfig, systemPrompt, userPrompt }) {
  const { apiKey, model, baseUrl, endpoint, maxTokens } = providerConfig;
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...buildOpenRouterHeaders(),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(`LLM API ${res.status}: ${JSON.stringify(payload)}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM API returned no content");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Model output is not valid JSON: ${error}`);
  }

  return parsed;
}

async function main() {
  const issueNumber = Number(requireEnv("ISSUE_NUMBER"));
  const githubToken = requireEnv("GITHUB_TOKEN");
  const providerConfig = resolveOpenRouterConfig();

  const issue = await githubRequest(`/issues/${issueNumber}`, githubToken);
  if (issue.pull_request) {
    throw new Error(`Issue #${issueNumber} is a pull request`);
  }

  if (hasSubIssueSyntax(issue.body || "")) {
    setOutput("changed", "false");
    setOutput(
      "no_change_reason",
      "Sub-issues are not allowed. Please submit one standalone change request per issue.",
    );
    return;
  }

  const fileList = safeRun("git", ["ls-files"])
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter(includeFile);

  let remaining = MAX_CONTEXT_CHARS;
  const fileBlocks = [];

  for (const file of fileList) {
    const content = readTextFile(file);
    if (!content) continue;

    const snippet = content.slice(0, MAX_FILE_CHARS);
    const block = `FILE: ${file}\n${snippet}`;
    if (block.length > remaining) break;

    fileBlocks.push(block);
    remaining -= block.length;
  }

  const agentsMd = existsSync("AGENTS.md") ? readTextFile("AGENTS.md") : "";

  const systemPrompt = [
    "You are a senior engineer creating minimal, correct git patches.",
    "Return ONLY JSON with keys: patch, pr_title, pr_body, commit_message, branch_suffix.",
    "patch must be a valid unified diff that applies to the provided repository snapshot.",
    "Do not include markdown fences.",
    "Prefer small, targeted edits and preserve existing style.",
    "If no code/content change is possible, return an empty patch and explain in pr_body.",
  ].join(" ");

  const userPrompt = [
    `Issue #${issueNumber}: ${issue.title}`,
    "",
    "Issue body:",
    issue.body || "(empty)",
    "",
    "Project guidance (AGENTS.md excerpt):",
    agentsMd.slice(0, 5000) || "(none)",
    "",
    "Repository files:",
    fileList.join("\n"),
    "",
    "Repository content excerpt:",
    fileBlocks.join("\n\n---\n\n"),
    "",
    "Generate the patch now.",
  ].join("\n");

  const generated = await llmCompletion({
    providerConfig,
    systemPrompt,
    userPrompt,
  });

  const rawPatch = String(generated.patch || "");
  const patch = stripFences(rawPatch);

  if (!patch.trim()) {
    setOutput("changed", "false");
    setOutput("no_change_reason", generated.pr_body || "Model returned an empty patch.");
    return;
  }

  const patchPath = join(process.cwd(), ".ai-generated.patch");
  writeFileSync(patchPath, patch.endsWith("\n") ? patch : `${patch}\n`, "utf8");

  try {
    run("git", ["apply", "--3way", "--whitespace=fix", patchPath]);
  } finally {
    if (existsSync(patchPath)) {
      unlinkSync(patchPath);
    }
  }

  const status = safeRun("git", ["status", "--porcelain"]);
  if (!status) {
    setOutput("changed", "false");
    setOutput("no_change_reason", "Patch applied but produced no file changes.");
    return;
  }

  const branchSuffix = slugify(String(generated.branch_suffix || issue.title || "update")) || "update";
  const branchName = `codex/issue-${issueNumber}-${branchSuffix}`;

  const prTitle = String(generated.pr_title || `AI: Resolve #${issueNumber}`).slice(0, 240).trim();

  let prBody = String(generated.pr_body || "").trim();
  if (!/\b(closes|fixes|resolves)\s+#\d+\b/i.test(prBody)) {
    prBody = `${prBody}\n\nCloses #${issueNumber}`.trim();
  }

  const commitMessage = String(generated.commit_message || `feat: address issue #${issueNumber}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  setOutput("changed", "true");
  setOutput("branch_name", branchName);
  setOutput("pr_title", prTitle || `AI: Resolve #${issueNumber}`);
  setOutput("pr_body", prBody || `Closes #${issueNumber}`);
  setOutput("commit_message", commitMessage || `feat: address issue #${issueNumber}`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
