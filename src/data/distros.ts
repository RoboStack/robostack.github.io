import distrosJson from "./distros.json";

/**
 * One RoboStack channel and the ROS release behind it.
 *
 * The distro pages in `src/pages/[distro].astro` are generated from this
 * list; `public/data/<name>.json` carries the matching package table data.
 */
export interface Distro {
  name: string;
  /** ROS generation, 1 or 2. Shown in the heading and breaks release-date ties. */
  ros: 1 | 2;
  channel: string;
  /** Where the channel lives. A key into BROWSE. */
  base: typeof PREFIX | typeof ANACONDA;
  /** rosdistro's own vocabulary from index-v4.yaml: rolling, active or eol. */
  status: "rolling" | "active" | "eol";
  /** Long-term support release: the even-year May releases per REP-2000. */
  lts: boolean;
  /** YYYY-MM. */
  released: string;
  /** YYYY-MM, or null when the support window is not published yet. */
  eol: string | null;
  /**
   * The pipeline still rebuilds this distro's table (it has a `dataChannel`
   * in distros.json). False for the frozen end-of-life snapshots.
   */
  maintained: boolean;
}

// Channel bases, as passed to `pixi workspace channel add`.
const PREFIX = "https://prefix.dev";
const ANACONDA = "https://conda.anaconda.org";

// Where a human browses that channel. Not the same host for anaconda:
// `conda.anaconda.org` serves repodata and 404s on a bare channel path.
const BROWSE = {
  [PREFIX]: (channel: string) => `https://prefix.dev/channels/${channel}`,
  [ANACONDA]: (channel: string) => `https://anaconda.org/${channel}`,
};

// The list itself lives in distros.json, which the table pipeline
// (`scripts/compare_pkg_completeness.py --all`) reads too: its `dataChannel`
// is the channel repodata is fetched from, null for the end-of-life distros
// whose `public/data/<name>.json` is a committed snapshot. The platform list
// is shared the same way; its order is the pipeline's bitmask order.
//
// Dates come from REP-2000 for ROS 2 and REP-3 for ROS 1, not from the actual
// tag dates, so the pages agree with what ROS itself documents. Lyrical is
// not in REP-2000 yet; May 2031 follows the established cadence of five-year
// LTS windows for even-year releases.
//
// Galactic is the odd one out for `base`: `robostack-experimental` 404s on
// prefix.dev, so it points at anaconda.org.
const BASES = { prefix: PREFIX, anaconda: ANACONDA } as const;

export const DISTROS: Distro[] = distrosJson.distros.map((d) => ({
  name: d.name,
  ros: d.ros as Distro["ros"],
  channel: d.channel,
  base: BASES[d.base as keyof typeof BASES],
  status: d.status as Distro["status"],
  lts: d.lts,
  released: d.released,
  eol: d.eol,
  maintained: d.dataChannel !== null,
}));

/** Platforms the channels build for. */
export const PLATFORMS: string[] = distrosJson.platforms;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Turn `2026-05` into `May 2026`. */
export function monthYear(value: string): string {
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Where a human browses the distro's channel. */
export function browseUrl(distro: Distro): string {
  return BROWSE[distro.base](distro.channel);
}

export function title(distro: Distro): string {
  return distro.name.charAt(0).toUpperCase() + distro.name.slice(1);
}
/**
 * The conda package prefix used for the distro's primary packages.
 *
 * Rolling switched from `ros-rolling-` to `ros2-` with mutex 0.19. The package
 * table reads the prefix per mutex out of its dataset; this is the build-time
 * answer for the current one, which is what an install snippet wants.
 */
export function packagePrefix(distro: Distro): string {
  return distro.name === "rolling" ? "ros2" : `ros-${distro.name}`;
}

/** The release and support summary shown under the title. */
export function supportLine(distro: Distro): string {
  if (distro.status === "rolling") {
    return "Rolling release, rebuilt continuously against the newest index. No support window.";
  }
  const released = `Released ${monthYear(distro.released)}`;
  if (distro.status === "eol") {
    return `${released} · end of life ${monthYear(distro.eol ?? "")}`;
  }
  if (distro.eol) {
    return `${released} · supported until ${monthYear(distro.eol)}`;
  }
  return `${released} · support window not yet published`;
}

/**
 * Rolling first, then every other release newest to oldest.
 *
 * Sorted rather than hand-ordered so a distro added to `DISTROS` cannot
 * quietly land in the wrong place. Noetic and Foxy share a release month in
 * the REPs, so the ROS generation breaks the tie and keeps the ROS 1 entry
 * last.
 */
export function tabOrder(distros: Distro[] = DISTROS): Distro[] {
  const rolling = distros.filter((d) => d.status === "rolling");
  const dated = distros
    .filter((d) => d.status !== "rolling")
    .sort((a, b) => b.released.localeCompare(a.released) || b.ros - a.ros);
  return [...rolling, ...dated];
}

/**
 * The newest dated release: the second tab on the distro pages, after
 * rolling. The site recommends no distro; links into the package tables and
 * the example commands simply land here, and move on their own when the next
 * release enters `DISTROS`.
 */
export function newestRelease(): Distro {
  return tabOrder()[1];
}
