"""Build the package dataset behind the Available Packages pages.

Writes `public/data/<distro>.json`, which `src/components/PackageTable.svelte`
fetches and renders in the browser. Three sources are combined:

- `rosdistro`'s `distribution.yaml` for the package list, the released version, and
  the upstream source repository.
- `rosdistro`'s distribution cache for each package's `package.xml`, which is where
  the descriptions come from.
- The channel's `repodata.json` per platform, for what actually got built.

Packages that exist on the channel but were never released into `rosdistro` (extra
recipes, mostly) get a row too, marked with `indexed` 0: they have no description
and no index version, but they are installable and should be findable.

Availability is always relative to a mutex. Everything on a channel is built against
one version of `ros2-distro-mutex` (`ros-distro-mutex` on ROS 1), and builds for
different mutex versions cannot be installed together. A package built for 0.8 but
not 0.9 is unavailable to anyone on 0.9, even though it is sitting in the channel.
So the dataset records, per package and per mutex, which platforms have a build and
what the newest version there is.

Which mutex an artifact targets comes from matching its dependency spec against the
real mutex records with `py-rattler`. Parsing the version out of the spec string
would work today, but the specs appear in two forms (`0.9.* humble_*` and
`>=0.9.0,<0.10.0a0`) and nothing stops a third from showing up.

The JSON is positional to keep it small; `PackageTable.svelte` unpacks it via the
`fields` list in the document head, so the two only have to agree on the names.

Usage: python scripts/compare_pkg_completeness.py <distro> <channel>
       channel is an anaconda.org channel name or a full base URL.
       python scripts/compare_pkg_completeness.py --all
       regenerates every distro with a `dataChannel` in src/data/distros.json.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import gzip
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TypeAlias

import niquests
import yaml
from rattler import MatchSpec, PackageRecord
from urllib3.util.retry import Retry

# The distro list and the platform list are shared with the site through
# src/data/distros.json.
DISTROS_JSON = Path(__file__).parent.parent / "src" / "data" / "distros.json"

# The order is the bit-position order the page reads. The page takes the
# platform order from the generated JSON itself; only the icon map in
# src/components/PackageTable.svelte is keyed by platform id.
PLATFORMS: list[str] = json.loads(DISTROS_JSON.read_text())["platforms"]

ROSDISTRO = "https://raw.githubusercontent.com/ros/rosdistro/master"
LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)

# ROS 1 and ROS 2 name their mutex differently, and a channel only ever has one.
MUTEX_NAMES: tuple[str, ...] = ("ros2-distro-mutex", "ros-distro-mutex")

# Newest mutex generations to keep. Jazzy has published eleven; the old ones
# dominate the payload while only the recent generations are still useful to
# select in the table.
MUTEX_LIMIT = 4

# A raw repodata record, as it comes out of the JSON.
Artifact: TypeAlias = dict[str, Any]
# Mutex version -> every artifact published for it. A version can ship more than
# one build, and a spec only has to match one of them.
MutexRecords: TypeAlias = dict[str, list[PackageRecord]]

# The whole document is a handful of GETs against rosdistro and the channel;
# retrying transient failures (anaconda.org 5xxs, mostly) keeps one hiccup from
# failing a whole six-hourly refresh.
session = niquests.Session(
    retries=Retry(total=5, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
)


@dataclass
class Slot:
    """What one package has for one mutex version.

    `mask` is a bitmask over `PLATFORMS`; `version` is the newest built there.
    """

    mask: int = 0
    version: str = ""


@dataclass(frozen=True)
class IndexEntry:
    """A package as `rosdistro` describes it, before we look at any channel."""

    version: str
    source: str


def fetch_yaml(url: str) -> Any:  # noqa: ANN401 - shape differs per rosdistro file
    """GET and parse a YAML document, raising on a bad status."""
    response = session.get(url)
    response.raise_for_status()
    return yaml.load(response.text, Loader=LOADER)


def index_packages(distro: str) -> dict[str, IndexEntry]:
    """Every package released into the ROS index for `distro`.

    The source URL is the real upstream repository, not the `-release` fork, and is
    shared by every package built out of the same repository.
    """
    distribution = fetch_yaml(f"{ROSDISTRO}/{distro}/distribution.yaml")
    packages: dict[str, IndexEntry] = {}
    for repo_name, repo in distribution["repositories"].items():
        release = repo.get("release")
        if not release:
            continue
        version = release.get("version") or ""
        source = re.sub(r"\.git$", "", (repo.get("source") or {}).get("url") or "")
        for name in release.get("packages", [repo_name]):
            packages[name] = IndexEntry(version=version, source=source)
    return packages


def package_metadata(distro: str) -> dict[str, str]:
    """`{package: description}` from the rosdistro distribution cache.

    The cache is the only place these live, but the table is still useful without
    them, so a failure here is logged and skipped rather than raised.
    """
    try:
        index = fetch_yaml(f"{ROSDISTRO}/index-v4.yaml")
        url = index["distributions"][distro]["distribution_cache"]
        # An unconsumed body types as None; the empty fallback fails decompression
        # and lands in the same warning path.
        cache = yaml.load(gzip.decompress(session.get(url).content or b""), Loader=LOADER)
    except Exception as error:  # noqa: BLE001 - any upstream failure is non-fatal
        print(f"  warning: no distribution cache ({error})", file=sys.stderr)
        return {}

    metadata: dict[str, str] = {}
    for name, package_xml in cache.get("release_package_xmls", {}).items():
        try:
            root = ET.fromstring(package_xml)
        except ET.ParseError:
            continue
        metadata[name] = " ".join((root.findtext("description") or "").split())
    return metadata


def repodata(channel: str, platform: str) -> tuple[str, list[Artifact]]:
    """Every artifact one platform of `channel` publishes.

    A 404 means the channel has no such platform. That is normal: most distros
    build nothing for `emscripten-wasm32`.
    """
    if channel.startswith(("http://", "https://")):
        url = f"{channel.rstrip('/')}/{platform}/repodata.json"
    else:
        url = f"https://conda.anaconda.org/{channel}/{platform}/repodata.json"

    response = session.get(url)
    if response.status_code == 404:
        return platform, []
    response.raise_for_status()
    payload = response.json()
    artifacts = {**payload.get("packages", {}), **payload.get("packages.conda", {})}
    return platform, list(artifacts.values())


def channel_name(channel: str) -> str:
    """The bare channel name, for display and for prefix.dev package links.

    Repodata is fetched from whichever form the CLI was given, but everything
    user-facing wants the plain name. Skipping this produces links like
    `prefix.dev/channels/https%3A%2F%2Fprefix.dev%2Frobostack-rolling/...`.
    """
    channel = channel.rstrip("/")
    if channel.startswith(("http://", "https://")):
        return channel.rsplit("/", 1)[-1]
    return channel


def version_key(version: str) -> tuple[int, ...]:
    """Sort key for a version string. Numeric segments compare numerically.

    Loose on purpose: this only has to order builds of the same package, and a
    non-numeric segment sorting last is good enough for that.
    """
    return tuple(int(p) if p.isdigit() else -1 for p in re.split(r"[._-]", str(version))[:4])


def normalize_timestamp(timestamp: int) -> int:
    """Repodata timestamps in milliseconds; some artifacts carry seconds instead.

    Workaround for https://github.com/RoboStack/ros-humble/issues/258: a timestamp
    that would place the build before 2001 is taken to be in seconds.
    """
    if 0 < timestamp < 1_000_000_000_000:
        timestamp *= 1000
    return timestamp


def collect_mutexes(repos: dict[str, list[Artifact]]) -> tuple[str, MutexRecords]:
    """Find the channel's mutex package and every version of it that was published.

    Returns the package name and its records. Noetic ships 0.6.0 as both `noetic_0`
    and `noetic_1`, so a version maps to a list.
    """
    name = ""
    records: MutexRecords = {}
    for platform, artifacts in repos.items():
        for artifact in artifacts:
            if artifact["name"] not in MUTEX_NAMES:
                continue
            name = artifact["name"]
            records.setdefault(artifact["version"], []).append(
                PackageRecord(
                    name=artifact["name"],
                    version=artifact["version"],
                    build=artifact["build"],
                    build_number=artifact.get("build_number", 0),
                    subdir=platform,
                )
            )
    return name, records


def mutex_matcher(mutex_records: MutexRecords) -> Callable[[str], set[str]]:
    """Return a memoised `spec -> {mutex versions it allows}`.

    A channel only has a handful of distinct specs across thousands of artifacts, so
    parsing each one once keeps `MatchSpec` off the hot path.
    """
    cache: dict[str, set[str]] = {}

    def resolve(spec: str) -> set[str]:
        """Which mutex versions satisfy `spec`. An unparsable spec allows none."""
        if spec not in cache:
            try:
                match = MatchSpec(spec)
                cache[spec] = {
                    version
                    for version, records in mutex_records.items()
                    if any(match.matches(record) for record in records)
                }
            except Exception:  # noqa: BLE001 - an unparsable spec constrains nothing
                cache[spec] = set()
        return cache[spec]

    return resolve


def collect_builds(
    repos: dict[str, list[Artifact]],
    mutexes: list[str],
    resolve: Callable[[str], set[str]],
) -> tuple[dict[str, dict[str, Slot]], dict[str, int]]:
    """Fold every artifact into `{conda name: {mutex version: Slot}}`.

    Also returns the newest build timestamp per package, which drives the "recently
    built" sort. An artifact with no mutex dependency works with any of them.
    """
    builds: dict[str, dict[str, Slot]] = {}
    newest_build: dict[str, int] = {}
    unconstrained = 0

    for bit, platform in enumerate(PLATFORMS):
        for artifact in repos[platform]:
            name = artifact["name"]
            if not name.startswith("ros-") or name in MUTEX_NAMES:
                continue

            newest_build[name] = max(
                newest_build.get(name, 0), normalize_timestamp(artifact.get("timestamp") or 0)
            )

            specs = [d for d in artifact.get("depends", []) if d.split(" ")[0] in MUTEX_NAMES]
            if specs:
                allowed: set[str] = set()
                for spec in specs:
                    allowed |= resolve(spec)
            else:
                allowed = set(mutexes)
                unconstrained += 1

            for version in allowed:
                slot = builds.setdefault(name, {}).setdefault(version, Slot())
                slot.mask |= 1 << bit
                if not slot.version or version_key(artifact["version"]) > version_key(slot.version):
                    slot.version = artifact["version"]

    print(f"  artifacts with no mutex constraint: {unconstrained}", file=sys.stderr)
    return builds, newest_build


def build(distro: str, channel: str) -> dict[str, Any]:
    """Assemble the whole document for one distro."""
    index = index_packages(distro)
    metadata = package_metadata(distro)
    print(f"  index: {len(index)} packages, {len(metadata)} with package.xml", file=sys.stderr)

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(PLATFORMS)) as pool:
        repos = dict(pool.map(lambda p: repodata(channel, p), PLATFORMS))
    for platform in PLATFORMS:
        print(f"  {platform}: {len(repos[platform])}", file=sys.stderr)

    mutex_package, mutex_records = collect_mutexes(repos)
    mutexes = sorted(mutex_records, key=version_key, reverse=True)[:MUTEX_LIMIT]
    print(f"  mutex: {mutex_package} {mutexes}", file=sys.stderr)

    builds, newest_build = collect_builds(repos, mutexes, mutex_matcher(mutex_records))

    # Hundreds of packages come out of the same repository, so the URLs are interned
    # and each package stores an index into this list.
    repo_urls: list[str] = []
    repo_index: dict[str, int] = {}

    def slots(per_mutex: dict[str, Slot]) -> list[Any]:
        # Aligned with "mutexes": 0 where nothing is built for that mutex,
        # otherwise [platform bitmask, newest version built there].
        return [[per_mutex[v].mask, per_mutex[v].version] if v in per_mutex else 0 for v in mutexes]

    packages: list[list[Any]] = []
    for name in sorted(index):
        conda_name = f"ros-{distro}-{name.replace('_', '-')}"
        per_mutex = builds.get(conda_name, {})
        entry = index[name]

        if entry.source and entry.source not in repo_index:
            repo_index[entry.source] = len(repo_urls)
            repo_urls.append(entry.source)

        packages.append(
            [
                name.replace("_", "-"),  # conda spelling, `ros-<distro>-` stripped
                metadata.get(name, ""),
                entry.version,  # as released into the ROS index
                newest_build.get(conda_name, 0) // 1000,  # newest build, seconds
                repo_index.get(entry.source, -1),  # index into "repos"
                1,  # released into the ROS index
                slots(per_mutex),
            ]
        )

    # Packages on the channel that rosdistro has never released: no description,
    # index version or source repository, but installable all the same.
    prefix = f"ros-{distro}-"
    released = {f"ros-{distro}-{name.replace('_', '-')}" for name in index}
    for conda_name in sorted(set(builds) - released):
        if not conda_name.startswith(prefix):
            continue
        packages.append(
            [
                conda_name.removeprefix(prefix),
                "",
                "",
                newest_build.get(conda_name, 0) // 1000,
                -1,
                0,
                slots(builds[conda_name]),
            ]
        )
    packages.sort(key=lambda package: package[0])

    return {
        "distro": distro,
        "channel": channel_name(channel),
        "platforms": PLATFORMS,
        "mutexPackage": mutex_package,
        "mutexes": mutexes,
        "fields": ["name", "desc", "indexVersion", "updated", "repo", "indexed", "builds"],
        "repos": repo_urls,
        "packages": packages,
    }


def write(document: dict[str, Any], path: Path) -> None:
    """Write the document with one package per line.

    Compact JSON on a single line would make every rebuild a one-line diff covering
    the whole file. One package per line costs a byte each and keeps the six-hourly
    CI commits reviewable.

    `newline="\\n"` matters too. Without it Python writes CRLF on Windows and the
    file diffs in full against what CI generates on Linux.
    """
    head = {k: v for k, v in document.items() if k != "packages"}
    body = ",\n".join(json.dumps(p, separators=(",", ":")) for p in document["packages"])
    text = json.dumps(head, separators=(",", ":"))[:-1] + ',"packages":[\n' + body + "\n]}\n"

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def refresh(distro: str, channel: str) -> None:
    """Build one distro, write it, and report what came out."""
    print(f"{distro} ({channel}):", file=sys.stderr)
    document = build(distro, channel)

    path = Path("public") / "data" / f"{distro}.json"
    write(document, path)

    total = len(document["packages"])
    newest = document["mutexes"][0] if document["mutexes"] else None
    on_newest = sum(1 for p in document["packages"] if p[6] and p[6][0])
    ever = sum(1 for p in document["packages"] if any(p[6]))
    print(
        f"  -> {path}: {total} packages, {ever} built at some point, "
        f"{on_newest} on mutex {newest}, {path.stat().st_size / 1e6:.2f} MB",
        file=sys.stderr,
    )


def main() -> None:
    """Build one distro, or every distro the pipeline maintains."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("distro", nargs="?", help="ROS distro to build the table for")
    parser.add_argument("channel", nargs="?", help="conda channel name, or a full base URL")
    parser.add_argument(
        "--all",
        action="store_true",
        help="regenerate every distro with a dataChannel in src/data/distros.json",
    )
    args = parser.parse_args()

    if args.all == bool(args.distro) or (args.distro and not args.channel):
        parser.error("pass either <distro> <channel> or --all")

    if not args.all:
        refresh(args.distro, args.channel)
        return

    # One distro failing must not take the other five down with it: finish the
    # loop, keep whatever succeeded, and only then report the failures.
    failed: list[str] = []
    for entry in json.loads(DISTROS_JSON.read_text())["distros"]:
        if not entry["dataChannel"]:
            continue
        try:
            refresh(entry["name"], entry["dataChannel"])
        except Exception as error:  # noqa: BLE001 - reported and folded into the exit code
            print(f"  error: {entry['name']} failed: {error}", file=sys.stderr)
            failed.append(entry["name"])
    if failed:
        sys.exit(f"failed to update: {', '.join(failed)}")


if __name__ == "__main__":
    main()
