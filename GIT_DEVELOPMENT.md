# ARPPL Git Development Guide

This file records the Git/GitHub workflow for this project so future work can continue even without prior chat context.

## Repository

- Local path: `D:\PhD\ARPPL_code`
- GitHub owner: `ZhangChule`
- GitHub repository: `ARPPL`
- Remote URL: `https://github.com/ZhangChule/ARPPL.git`
- Local author name: `ZhangChule`
- Local author email: `zhangchule_2002@163.com`

Recorded on 2026-05-08. The local directory contains `.git`, the active branch is `main`, and the initial local commit exists:

```text
8b85cd3 chore: initialize ARPPL project repository
```

The current Codex terminal cannot find the `git` executable, but the user's IDE terminal can run Git. The initial push to GitHub failed because the machine could not connect to `github.com:443`.

## First Setup On A New Machine

Do not store GitHub passwords or long-lived tokens in chat or in repository files. Prefer GitHub CLI authentication:

```powershell
gh auth login
```

Confirm Git is available:

```powershell
git --version
git status
git remote -v
```

If `git` is not available, install Git for Windows or add the Git installation directory to the system `PATH`.

## Remote Configuration

This project should use the following remote repository:

```powershell
git remote add origin https://github.com/ZhangChule/ARPPL.git
```

If `origin` already exists but points to the wrong URL:

```powershell
git remote set-url origin https://github.com/ZhangChule/ARPPL.git
```

Verify:

```powershell
git remote -v
```

## Recommended Branches

- `main`: stable code that can reproduce experiments or be demonstrated.
- `dev`: daily integration branch.
- `feature/<short-name>`: one feature or bug fix.
- `experiment/<short-name>`: temporary experiment or parameter exploration.

If the current default branch is still `master`, rename it before the first formal push:

```powershell
git branch -M main
```

## First Commit Suggestion

The first commit has already been created locally. Before retrying the first push, check status:

```powershell
git status
```

If additional repository-management files were added after the first commit, commit them before pushing:

```powershell
git add .gitattributes GIT_DEVELOPMENT.md
git commit -m "docs: document git troubleshooting workflow"
```

Then push:

```powershell
git push -u origin main
```

If raw test data under `testcase` must be committed, check file sizes first. GitHub has a hard 100 MB single-file limit. Large point clouds, images, and binary result files should usually use Git LFS or external data storage.

## Daily Workflow

Start a new task:

```powershell
git checkout dev
git pull
git checkout -b feature/<short-name>
```

Commit changes:

```powershell
git status
git diff
git add <files>
git commit -m "type: short description"
```

Push the branch:

```powershell
git push -u origin feature/<short-name>
```

Common commit types:

- `feat`: new feature.
- `fix`: bug fix.
- `test`: test changes.
- `docs`: documentation changes.
- `refactor`: behavior-preserving refactor.
- `chore`: build, dependency, config, or repository management.

## Verification Before Push

For workflow-platform frontend changes, run at least:

```powershell
node --check workflow_platform/frontend/app.js
node --check workflow_platform/frontend/virtualMachiningWidget.js
```

For virtual-machining backend changes, run at least:

```powershell
python -m compileall -q virtual_machining_platform/backend
```

For process-app backend changes, run a Python compile check on the touched app, for example:

```powershell
python -m compileall -q process_apps/wall-thickness-compensation/backend
```

For deployment changes, rebuild the affected Compose stack:

```powershell
docker compose -f workflow_platform/docker/compose.yml up -d --build
```

If a verification step is too slow, blocked by Docker Hub/GitHub network access, or requires unavailable local test data, record exactly what was and was not tested in the commit or handoff note.

## Line Endings

On Windows, Git may print a warning like:

```text
warning: in the working copy of 'process_apps/arppl/backend/requirements.txt', LF will be replaced by CRLF the next time Git touches it
```

This is not an error. It means Git is warning about line-ending conversion in the working tree. The repository includes `.gitattributes` to keep source, config, and documentation files normalized with LF line endings.

If needed, inspect the current setting:

```powershell
git config --get core.autocrlf
```

Recommended local setting for this project:

```powershell
git config core.autocrlf false
```

After changing line-ending policy, refresh tracked files if necessary:

```powershell
git add --renormalize .
git status
```

## GitHub Connectivity

If push fails with:

```text
fatal: unable to access 'https://github.com/ZhangChule/ARPPL.git/': Failed to connect to github.com port 443
```

the local commit is usually safe; only the network push failed. Try:

```powershell
git remote -v
git ls-remote https://github.com/ZhangChule/ARPPL.git
git push -u origin main
```

If `git ls-remote` also times out, the problem is network/proxy/firewall access to GitHub, not the repository content.

If using a local proxy, configure Git with the proxy port used on the machine, for example:

```powershell
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

To remove proxy settings:

```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

Alternative: use SSH after adding an SSH key to GitHub:

```powershell
git remote set-url origin git@github.com:ZhangChule/ARPPL.git
git push -u origin main
```

## Ignore Policy

The root `.gitignore` and `.dockerignore` ignore:

- Python caches, virtual environments, and test caches.
- Frontend `node_modules`, `dist`, temporary folders, and logs under each process app.
- Backend runtime logs and `process_apps/*/backend/records/`.
- Local `testcase/` data for Git and Docker build contexts.

Principle: source code, configs, reproducible scripts, and essential small fixtures belong in Git. Large local datasets, generated results, virtual environments, logs, and rebuildable caches do not.

## Working With Codex

When asking Codex to manage versions, prefer this sequence:

1. Check `git status --short --branch`.
2. Check `git remote -v`.
3. Explain the intended file scope for the commit.
4. Generate a clear commit message.
5. Run `git commit` and `git push` only after confirmation.

Remote pushes need network permission, so Codex may ask for approval before running network commands. Do not send GitHub passwords or tokens directly to Codex. If authentication is needed, use `gh auth login` or Git Credential Manager on the local machine.

## Useful Recovery Commands

Show recent commits:

```powershell
git log --oneline -10
```

Unstage a file while keeping local edits:

```powershell
git restore --staged <file>
```

View changes for one file:

```powershell
git diff -- <file>
```

Show remote branches:

```powershell
git branch -r
```
