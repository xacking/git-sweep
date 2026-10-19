export interface Branch {
  name: string;
  current: boolean;
  merged: boolean;
  gone: boolean; // upstream deleted on remote
  lastCommit: Date;
}

export interface FilterOptions {
  base: string;
  protect: string[];
  olderThanDays?: number;
  includeGone: boolean;
  now?: Date;
}

const DEFAULT_PROTECTED = ["main", "master", "develop", "dev", "staging", "production"];

/** Turn `git for-each-ref` output into Branch objects. */
export function parseRefs(output: string, merged: Set<string>): Branch[] {
  return output
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [head, name, track, date] = line.split("|");
      return {
        name,
        current: head === "*",
        merged: merged.has(name),
        gone: track.includes("gone"),
        lastCommit: new Date(Number(date) * 1000),
      };
    });
}

export function parseMerged(output: string): Set<string> {
  return new Set(
    output
      .split("\n")
      .map((l) => l.replace(/^[*+]?\s*/, "").trim())
      .filter(Boolean),
  );
}

/** Pick the branches that are safe to delete. */
export function selectStale(branches: Branch[], opts: FilterOptions): Branch[] {
  const protect = new Set([...DEFAULT_PROTECTED, ...opts.protect, opts.base]);
  const now = opts.now ?? new Date();
  return branches.filter((b) => {
    if (b.current || protect.has(b.name)) return false;
    if (!(b.merged || (opts.includeGone && b.gone))) return false;
    if (opts.olderThanDays !== undefined) {
      const ageDays = (now.getTime() - b.lastCommit.getTime()) / 86_400_000;
      if (ageDays < opts.olderThanDays) return false;
    }
    return true;
  });
}

export function timeAgo(date: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}
