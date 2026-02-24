# Sakai Website (Astro + Tailwind)

Modern rebuild of the Sakai LMS website.

## Local Development

```bash
npm ci
npm run dev
```

Build:

```bash
npm run build
```

## AI Issue-to-PR Workflow

This repository includes GitHub Actions that let non-technical contributors open an issue and get an AI-generated pull request.

### User Flow

1. Open **AI Change Request** issue template.
2. Automation reads the issue and generates a patch with an LLM.
3. A PR is opened with labels `ai-generated` and `ai-automerge-candidate`.
4. Maintainers can review/merge manually anytime.
5. If no human comments/reviews occur for 7 days, automation attempts to auto-merge.

### Workflows

- [`.github/workflows/ai-issue-to-pr.yml`](.github/workflows/ai-issue-to-pr.yml)
  - Triggers on issue activity and every 30 minutes.
  - Processes open issues with label `ai-change-request`.
  - Runs build verification before opening/updating PRs.
- [`.github/workflows/auto-merge-ai-prs.yml`](.github/workflows/auto-merge-ai-prs.yml)
  - Runs daily.
  - Merges open PRs labeled `ai-automerge-candidate` when inactive for configured days.

### Required Repo Configuration

1. Add secret `OPENAI_API_KEY`.
2. Optional repo variable `OPENAI_MODEL` (default in script is `gpt-4.1`).
3. Optional repo variable `AI_AUTOMERGE_DAYS` (default is `7`).
4. Recommended: enable branch protections/required checks so unsafe PRs cannot merge.

### Notes

- Label lifecycle on issues:
  - `ai-change-request` -> `ai-in-progress` -> `ai-pr-opened`
  - `ai-failed` is applied on workflow failure.
- The patch generator reads repository text files and asks the model for a unified diff.
- The workflow uses `GITHUB_TOKEN` to open PRs and merge eligible PRs.
