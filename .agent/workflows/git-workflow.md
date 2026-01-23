---
description: Git branching workflow with develop and main branches
---

# Git Workflow

## Branch Structure
- `main` - Protected production branch (never push directly)
- `develop` - Active development branch

## Daily Workflow

### 1. Ensure you're on develop
```powershell
git checkout develop
```

### 2. Make changes and commit
```powershell
git add .
git commit -m "your message"
git push
```

### 3. When ready to merge to main
1. Go to GitHub → Pull Requests → New PR
2. Set: base=`main`, compare=`develop`
3. Create PR, review, then merge

## Quick Commands

// turbo
### Check current branch
```powershell
git branch
```

// turbo
### Switch to develop
```powershell
git checkout develop
```

// turbo
### Pull latest changes
```powershell
git pull
```

## Setting Up Branch Protection (GitHub)

1. Go to your repo → **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable: **Require a pull request before merging**
5. Save changes
