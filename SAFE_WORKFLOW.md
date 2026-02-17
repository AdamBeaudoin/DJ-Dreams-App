# Safe Workflow (PR-First)

This repo is configured for a PR-first flow.

## One-time local setup

Run:

```sh
./scripts/setup-safe-workflow.sh
```

This enables a local `pre-push` hook that blocks direct pushes to `main`.

## Daily workflow

1. Pull latest `main`.
2. Create a feature branch.
3. Commit changes to the feature branch.
4. Open a pull request.
5. Wait for "PR Checks" (lint, test, build) to pass.
6. Merge PR to deploy to production.

## Example commands

```sh
git checkout main
git pull
git checkout -b codex/short-task-name
# edit files
git add .
git commit -m "Short clear message"
git push -u origin codex/short-task-name
```
