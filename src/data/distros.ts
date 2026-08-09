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
  status: 'rolling' | 'active' | 'eol';
  /** YYYY-MM. */
  released: string;
  /** YYYY-MM, or null when the support window is not published yet. */
  eol: string | null;
}

// Channel bases, as passed to `pixi workspace channel add`.
const PREFIX = 'https://prefix.dev';
const ANACONDA = 'https://conda.anaconda.org';

// Where a human browses that channel. Not the same host for anaconda:
// `conda.anaconda.org` serves repodata and 404s on a bare channel path.
const BROWSE = {
  [PREFIX]: (channel: string) => `https://prefix.dev/channels/${channel}`,
  [ANACONDA]: (channel: string) => `https://anaconda.org/${channel}`,
};

// Dates come from REP-2000 for ROS 2 and REP-3 for ROS 1, not from the actual
// tag dates, so the pages agree with what ROS itself documents.
//
// Galactic is the odd one out for `base`: `robostack-experimental` 404s on
// prefix.dev, so it points at anaconda.org.
export const DISTROS: Distro[] = [
  { name: 'noetic', ros: 1, channel: 'robostack-noetic', base: PREFIX, status: 'eol', released: '2020-05', eol: '2025-05' },
  { name: 'foxy', ros: 2, channel: 'robostack', base: PREFIX, status: 'eol', released: '2020-05', eol: '2023-05' },
  { name: 'galactic', ros: 2, channel: 'robostack-experimental', base: ANACONDA, status: 'eol', released: '2021-05', eol: '2022-11' },
  { name: 'humble', ros: 2, channel: 'robostack-humble', base: PREFIX, status: 'active', released: '2022-05', eol: '2027-05' },
  { name: 'jazzy', ros: 2, channel: 'robostack-jazzy', base: PREFIX, status: 'active', released: '2024-05', eol: '2029-05' },
  { name: 'kilted', ros: 2, channel: 'robostack-kilted', base: PREFIX, status: 'active', released: '2025-05', eol: '2026-11' },
  // Lyrical is not in REP-2000 yet. May 2031 follows the established cadence:
  // even-year releases are LTS with five years of support (Humble 2022-2027,
  // Jazzy 2024-2029), odd-year ones get eighteen months (Kilted 2025-2026).
  // Replace it with the published date once the REP lists it.
  { name: 'lyrical', ros: 2, channel: 'robostack-lyrical', base: PREFIX, status: 'active', released: '2026-05', eol: '2031-05' },
  { name: 'rolling', ros: 2, channel: 'robostack-rolling', base: PREFIX, status: 'rolling', released: '2020-06', eol: null },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/** Turn `2026-05` into `May 2026`. */
export function monthYear(value: string): string {
  const [year, month] = value.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Where a human browses the distro's channel. */
export function browseUrl(distro: Distro): string {
  return BROWSE[distro.base](distro.channel);
}

export function title(distro: Distro): string {
  return distro.name.charAt(0).toUpperCase() + distro.name.slice(1);
}

/** The release and support summary shown under the title. */
export function supportLine(distro: Distro): string {
  if (distro.status === 'rolling') {
    return 'Rolling release, rebuilt continuously against the newest index. No support window.';
  }
  const released = `Released ${monthYear(distro.released)}`;
  if (distro.status === 'eol') {
    return `${released} · end of life ${monthYear(distro.eol ?? '')}`;
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
  const rolling = distros.filter((d) => d.status === 'rolling');
  const dated = distros
    .filter((d) => d.status !== 'rolling')
    .sort((a, b) => b.released.localeCompare(a.released) || b.ros - a.ros);
  return [...rolling, ...dated];
}
