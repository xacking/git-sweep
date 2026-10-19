#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseRefs, parseMerged, selectStale, timeAgo } from "./core.js";

const HELP = `git-sweep — delete local branches that are already merged

Usage: git-sweep [options]

Options:
  -b, --base <branch>     branch to compare against (default: main or master)
  -g, --gone              also delete branches whose remote was deleted
  -o, --older-than <days> only branches with no commits for N days
  -p, --protect <name>    never delete this branch (repeatable)
  -y, --yes               delete without asking
  -n, --dry-run           only list what would be deleted
  -h, --help              show this help
`;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function parseArgs(argv: string[]) {
  const o = { base: "", gone: false, olderThan: undefined as number | undefined, protect: [] as string[], yes: false, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
    else if (a === "-b" || a === "--base") o.base = argv[++i];
    else if (a === "-g" || a === "--gone") o.gone = true;
    else if (a === "-o" || a === "--older-than") o.olderThan = Number(argv[++i]);
    else if (a === "-p" || a === "--protect") o.protect.push(argv[++i]);
    else if (a === "-y" || a === "--yes") o.yes = true;
    else if (a === "-n" || a === "--dry-run") o.dry = true;
    else { console.error(`Unknown option: ${a}\n\n${HELP}`); process.exit(1); }
  }
  return o;
}

function detectBase(): string {
  for (const b of ["main", "master"]) {
    try { git("rev-parse", "--verify", "--quiet", b); return b; } catch { /* try next */ }
  }
  throw new Error("Could not find main or master. Use --base <branch>.");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  try { git("rev-parse", "--git-dir"); } catch { console.error("Not a git repository."); process.exit(1); }

  const base = opts.base || detectBase();
  if (opts.gone) { try { git("fetch", "--prune", "--quiet"); } catch { /* offline is fine */ } }

  const merged = parseMerged(git("branch", "--merged", base));
  const refs = git("for-each-ref", "--format=%(HEAD)|%(refname:short)|%(upstream:track)|%(committerdate:unix)", "refs/heads");
  const stale = selectStale(parseRefs(refs, merged), { base, protect: opts.protect, olderThanDays: opts.olderThan, includeGone: opts.gone });

  if (!stale.length) { console.log("✨ Nothing to sweep."); return; }

  console.log(`Branches to delete (base: ${base}):\n`);
  for (const b of stale) console.log(`  ${b.name.padEnd(40)} ${b.gone && !b.merged ? "[gone]  " : "[merged]"} ${timeAgo(b.lastCommit)}`);
  console.log();
  if (opts.dry) return;

  if (!opts.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Delete ${stale.length} branch(es)? [y/N] `);
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) { console.log("Aborted."); return; }
  }

  for (const b of stale) {
    // -D for gone-but-unmerged branches, -d otherwise so git double-checks
    git("branch", b.merged ? "-d" : "-D", b.name);
    console.log(`  deleted ${b.name}`);
  }
}

main().catch((e) => { console.error((e as Error).message); process.exit(1); });
