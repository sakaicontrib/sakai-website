const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token) {
  throw new Error("Missing GITHUB_TOKEN");
}

if (!repository || !repository.includes("/")) {
  throw new Error("Missing or invalid GITHUB_REPOSITORY");
}

const [owner, repo] = repository.split("/");
const requiredLabel = process.env.REQUIRED_LABEL || "ai-automerge-candidate";
const inactivityDays = Number(process.env.INACTIVITY_DAYS || 7);
const mergeMethod = process.env.MERGE_METHOD || "squash";
const dryRun = String(process.env.DRY_RUN || "false").toLowerCase() === "true";
const inactivityMs = inactivityDays * 24 * 60 * 60 * 1000;
const cutoff = Date.now() - inactivityMs;

function isHumanUser(user) {
  if (!user?.login) return false;
  if (user.type === "Bot") return false;
  return !user.login.endsWith("[bot]");
}

async function githubRequest(path, init = {}) {
  const url = `https://api.github.com/repos/${owner}/${repo}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ${path}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function paginate(path) {
  const results = [];
  let page = 1;

  for (;;) {
    const sep = path.includes("?") ? "&" : "?";
    const chunk = await githubRequest(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    results.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }

  return results;
}

async function getLatestHumanCommentTime(prNumber, prCreatedAt) {
  let latest = new Date(prCreatedAt).getTime();

  const [issueComments, reviews, reviewComments] = await Promise.all([
    paginate(`/issues/${prNumber}/comments`),
    paginate(`/pulls/${prNumber}/reviews`),
    paginate(`/pulls/${prNumber}/comments`),
  ]);

  for (const item of issueComments) {
    if (!isHumanUser(item.user)) continue;
    const ts = Date.parse(item.created_at || "");
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }

  for (const item of reviews) {
    if (!isHumanUser(item.user)) continue;
    const ts = Date.parse(item.submitted_at || item.created_at || "");
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }

  for (const item of reviewComments) {
    if (!isHumanUser(item.user)) continue;
    const ts = Date.parse(item.created_at || "");
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }

  return latest;
}

async function hasRequiredLabel(prNumber) {
  const issue = await githubRequest(`/issues/${prNumber}`);
  const labels = (issue.labels || []).map((label) => (typeof label === "string" ? label : label.name));
  return labels.includes(requiredLabel);
}

async function mergePullRequest(prNumber, title) {
  if (dryRun) {
    process.stdout.write(`[dry-run] Would merge PR #${prNumber} (${title})\n`);
    return;
  }

  await githubRequest(`/pulls/${prNumber}/merge`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merge_method: mergeMethod,
      commit_title: `Auto-merge: #${prNumber} ${title}`.slice(0, 240),
    }),
  });

  process.stdout.write(`Merged PR #${prNumber} (${title})\n`);
}

async function main() {
  process.stdout.write(
    `Scanning open PRs in ${owner}/${repo} for label '${requiredLabel}' with ${inactivityDays} days inactivity.\n`,
  );

  const prs = await paginate("/pulls?state=open");

  for (const pr of prs) {
    if (pr.draft) continue;

    const prNumber = pr.number;
    const prTitle = pr.title || "";

    const eligible = await hasRequiredLabel(prNumber);
    if (!eligible) continue;

    const latestHumanComment = await getLatestHumanCommentTime(prNumber, pr.created_at);
    if (latestHumanComment > cutoff) {
      const iso = new Date(latestHumanComment).toISOString();
      process.stdout.write(`Skipping PR #${prNumber}; recent human comment/review at ${iso}.\n`);
      continue;
    }

    try {
      await mergePullRequest(prNumber, prTitle);
    } catch (error) {
      process.stdout.write(`Could not merge PR #${prNumber}: ${error instanceof Error ? error.message : error}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
