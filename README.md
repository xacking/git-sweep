# git-sweep

Clean up the pile of old local git branches in one command. Deletes only branches that are already merged (or whose remote was deleted), never your current branch, and never `main`, `master`, `develop`, `staging` or `production`.

```
$ git-sweep
Branches to delete (base: main):

  feature/login                            [merged] 40 days ago
  fix/navbar                               [merged] 12 days ago
  chore/deps                               [gone]   3 days ago

Delete 3 branch(es)? [y/N] y
  deleted feature/login
  deleted fix/navbar
  deleted chore/deps
```

## Install

```bash
npm install -g github:xacking/git-sweep
```

## Usage

```bash
git-sweep                 # merged into main/master, asks first
git-sweep --dry-run       # just show the list
git-sweep --gone          # also branches whose remote branch was deleted (runs fetch --prune)
git-sweep --older-than 30 # only branches untouched for 30+ days
git-sweep -p release -y   # protect "release", don't ask
git-sweep --base develop  # compare against develop
```

Merged branches are removed with `git branch -d`, so git itself double-checks they are merged.

## License

MIT
