/**
 * The pure data layer behind PackageTable.svelte: the document format, the
 * positional unpacking, version comparison, and the per-mutex row
 * derivation, filters and sorters. Nothing here is reactive; the component
 * wires these functions into its derived state.
 */

/**
 * One entry per mutex, aligned with doc.mutexes: 0 when nothing is built
 * for that mutex, otherwise a platform bitmask plus the version built.
 */
export type BuildSlot = 0 | [number, string];

/** Positional; doc.fields names the positions. */
export type PackageEntry = (string | number | BuildSlot[])[];

/** What scripts/compare_pkg_completeness.py writes to /data/<distro>.json. */
export interface Doc {
  distro: string;
  channel: string;
  platforms: string[];
  mutexPackage: string;
  mutexes: string[];
  fields: string[];
  repos: string[];
  packages: PackageEntry[];
}

export interface Upgrade {
  version: string;
  mutex: string;
}

export interface Row {
  /** Prefix-free key used to identify the row. It normally uses the ROS package
   * name with Conda's hyphen spelling; compatibility aliases are disambiguated. */
  name: string;
  /** Complete package name exactly as published in the Conda channel, such as
   * `ros2-desktop` or its `ros-rolling-desktop` compatibility alias. */
  condaName: string;
  desc: string;
  indexVersion: string;
  updated: number;
  repo: string;
  /** Whether this is the primary Conda row for a package released into the
   * ROS index. False for channel-only packages and compatibility aliases. */
  indexed: boolean;
  builds: BuildSlot[];
  haystack: string;
}

/** A row as seen from one selected mutex. */
export interface MutexRow extends Row {
  mask: number;
  version: string;
  built: number;
  total: number;
  behind: boolean;
  older: string[];
  upgrade: Upgrade | null;
  never: boolean;
}

// rosdistro versions carry a release increment ("2.0.2-1"); drop it to
// compare against the plain version conda publishes.
export function baseVersion(value: string): string {
  return String(value || "").split("-")[0];
}

function versionParts(value: string): number[] {
  return baseVersion(value)
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? parseInt(part, 10) : -1));
}

export function compareVersions(a: string, b: string): number {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const delta =
      (x[i] === undefined ? -1 : x[i]) - (y[i] === undefined ? -1 : y[i]);
    if (delta) return delta < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * The JSON is positional and the head's `fields` list names the positions,
 * so unpacking goes through it instead of hard-coded indices. That keeps the
 * committed end-of-life snapshots working across schema changes: they still
 * carry a `license` field and predate `indexed`, which defaults to
 * released-into-the-index for them.
 */
export function unpackRows(doc: Doc): Row[] {
  const at: Record<string, number> = {};
  doc.fields.forEach((field, i) => (at[field] = i));
  return doc.packages.map((pkg) => {
    const name = pkg[at.name] as string;
    // Older snapshots predate condaName and used ros-<distro>-<name>.
    // Preserve that exact historical spelling instead of applying today's
    // Rolling ros2-* convention to old data.
    const condaName =
      ((pkg[at.condaName] ?? "") as string) || `ros-${doc.distro}-${name}`;
    const desc = (pkg[at.desc] ?? "") as string;
    const repo = pkg[at.repo] as number;
    return {
      name,
      condaName,
      desc,
      indexVersion: (pkg[at.indexVersion] ?? "") as string,
      updated: (pkg[at.updated] ?? 0) as number,
      repo: repo >= 0 ? (doc.repos[repo] ?? "") : "",
      indexed: at.indexed === undefined || Boolean(pkg[at.indexed]),
      builds: pkg[at.builds] as BuildSlot[], // aligned with doc.mutexes
      haystack: (name + " " + condaName + " " + desc).toLowerCase(),
    };
  });
}

/**
 * Every row as seen from the selected mutex. `list` is doc.mutexes, newest
 * first; `bits` are the bit positions of the platforms with any build for
 * that mutex.
 */
export function deriveMutexRows(
  all: Row[],
  mutex: number,
  list: string[],
  bits: number[],
): MutexRow[] {
  return all.map((row) => {
    const slot = row.builds[mutex];
    const mask = slot ? slot[0] : 0;
    const version = slot ? slot[1] : "";
    // Which other mutexes do have it, so a gap reads as "built, but not
    // for this mutex" rather than "never built". Newer and older are kept
    // apart because only one of them is actionable: a package waiting on a
    // newer mutex arrives if you move up, one that exists only on an older
    // mutex has been dropped and will not come back.
    // doc.mutexes is newest first, so a lower index means newer.
    const older: string[] = [];
    let upgrade: Upgrade | null = null;
    for (let i = 0; i < list.length; i++) {
      const other = row.builds[i];
      if (i === mutex || !other) continue;
      if (i > mutex) {
        if (!mask) older.push(list[i]);
        continue;
      }
      // A newer mutex: worth reporting when it offers this package at all,
      // or offers a newer version of it than the selected mutex does.
      if (!upgrade || compareVersions(other[1], upgrade.version) > 0) {
        upgrade = { version: other[1], mutex: list[i] };
      }
    }
    if (upgrade && version && compareVersions(upgrade.version, version) <= 0) {
      upgrade = null;
    }
    return {
      ...row,
      mask,
      version,
      built: bits.reduce((n, bit) => n + ((mask >> bit) & 1), 0),
      total: bits.length,
      behind:
        !!version &&
        !!row.indexVersion &&
        compareVersions(version, row.indexVersion) < 0,
      older,
      upgrade,
      // Never built for any mutex. Distinct from "not built for the
      // selected mutex": that one is answered by changing the mutex, this
      // one only by someone adding the package.
      never: !row.builds.some((slot) => Boolean(slot)),
    };
  });
}

export function matchesFilter(row: MutexRow, id: string): boolean {
  switch (id) {
    case "full":
      return row.total > 0 && row.built === row.total;
    case "partial":
      return row.built > 0 && row.built < row.total;
    case "missing":
      return row.built === 0;
    case "behind":
      return row.behind;
    case "upgrade":
      return !!row.upgrade;
    default:
      return true;
  }
}

export const SORTERS: Record<string, (a: MutexRow, b: MutexRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  coverage: (a, b) => b.built - a.built || a.name.localeCompare(b.name),
  gaps: (a, b) => a.built - b.built || a.name.localeCompare(b.name),
  recent: (a, b) => b.updated - a.updated || a.name.localeCompare(b.name),
};

/**
 * While searching, relevance outranks the chosen sort: exact name match,
 * then name prefix, then name substring, then matches only in the
 * description. Without this, "moveit" surfaces dual-arm-panda-moveit-config
 * before moveit itself.
 */
export function relevanceTier(name: string, query: string): number {
  return name === query
    ? 0
    : name.startsWith(query)
      ? 1
      : name.includes(query)
        ? 2
        : 3;
}
