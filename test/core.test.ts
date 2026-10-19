import { describe, it, expect } from "vitest";
import { parseRefs, parseMerged, selectStale, timeAgo } from "../src/core.js";

const now = new Date("2026-06-01T00:00:00Z");
const ts = (daysAgo: number) => Math.floor((now.getTime() - daysAgo * 86_400_000) / 1000);
const refs = [
  `*|main||${ts(0)}`,
  ` |feature/login||${ts(40)}`,
  ` |fix/typo|[gone]|${ts(3)}`,
  ` |wip/experiment||${ts(1)}`,
  ` |develop||${ts(100)}`,
].join("\n");
const merged = parseMerged("* main\n  feature/login\n  develop\n");

describe("git-sweep core", () => {
  it("parses refs", () => {
    const b = parseRefs(refs, merged);
    expect(b).toHaveLength(5);
    expect(b[0].current).toBe(true);
    expect(b[2].gone).toBe(true);
  });
  it("selects merged branches and protects defaults", () => {
    const s = selectStale(parseRefs(refs, merged), { base: "main", protect: [], includeGone: false, now });
    expect(s.map((b: { name: string }) => b.name)).toEqual(["feature/login"]);
  });
  it("includes gone branches when asked", () => {
    const s = selectStale(parseRefs(refs, merged), { base: "main", protect: [], includeGone: true, now });
    expect(s.map((b: { name: string }) => b.name)).toEqual(["feature/login", "fix/typo"]);
  });
  it("respects age and protect", () => {
    const s = selectStale(parseRefs(refs, merged), { base: "main", protect: ["feature/login"], includeGone: true, olderThanDays: 2, now });
    expect(s.map((b: { name: string }) => b.name)).toEqual(["fix/typo"]);
  });
  it("formats time", () => {
    expect(timeAgo(new Date(ts(90) * 1000), now)).toBe("3 months ago");
  });
});
