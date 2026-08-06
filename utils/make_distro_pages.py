"""Regenerate the per-distro pages in `docs/`.

Each page is a stub: the tab strip, a heading with the distro artwork, the support
dates, the install commands, and an empty mount that `docs/javascripts/packages.js`
fills from `docs/data/<distro>.json`.

The tab strip is written here rather than rendered by `packages.js` because only one
distro is listed in the `zensical.toml` nav. These are the only links pointing at the
other seven pages, so building them in JS would hide them from anything that does not
run it, crawlers included.

Everything below the strip belongs to the selected distro: the support status, the
channel to add, and the table all change when you switch tabs, so none of them sit
above the switcher.

Usage: python utils/make_distro_pages.py
"""

from __future__ import annotations

import calendar
import os
from typing import NamedTuple

# Channel bases, as passed to `pixi workspace channel add`.
PREFIX = "https://prefix.dev"
ANACONDA = "https://conda.anaconda.org"

# Where a human browses that channel. Not the same host for anaconda:
# `conda.anaconda.org` serves repodata and 404s on a bare channel path.
BROWSE: dict[str, str] = {
    PREFIX: "https://prefix.dev/channels/{channel}",
    ANACONDA: "https://anaconda.org/{channel}",
}


class Distro(NamedTuple):
    """One RoboStack channel and the ROS release behind it."""

    name: str
    ros: int
    """ROS generation, 1 or 2. Shown in the heading and breaks release-date ties."""
    channel: str
    base: str
    """Where the channel lives. A key into `BROWSE`."""
    status: str
    """`rosdistro`'s own vocabulary from `index-v4.yaml`: rolling, active or eol."""
    released: str
    """YYYY-MM."""
    eol: str | None
    """YYYY-MM, or None when the support window is not published yet."""


# Dates come from REP-2000 for ROS 2 and REP-3 for ROS 1, not from the actual tag
# dates, so the pages agree with what ROS itself documents.
#
# Galactic is the odd one out for `base`: `robostack-experimental` 404s on prefix.dev,
# so it points at anaconda.org.
DISTROS: list[Distro] = [
    Distro("noetic", 1, "robostack-noetic", PREFIX, "eol", "2020-05", "2025-05"),
    Distro("foxy", 2, "robostack", PREFIX, "eol", "2020-05", "2023-05"),
    Distro("galactic", 2, "robostack-experimental", ANACONDA, "eol", "2021-05", "2022-11"),
    Distro("humble", 2, "robostack-humble", PREFIX, "active", "2022-05", "2027-05"),
    Distro("jazzy", 2, "robostack-jazzy", PREFIX, "active", "2024-05", "2029-05"),
    Distro("kilted", 2, "robostack-kilted", PREFIX, "active", "2025-05", "2026-11"),
    # Lyrical is not in REP-2000 yet. May 2031 follows the established cadence:
    # even-year releases are LTS with five years of support (Humble 2022-2027, Jazzy
    # 2024-2029), odd-year ones get eighteen months (Kilted 2025-2026). Replace it
    # with the published date once the REP lists it.
    Distro("lyrical", 2, "robostack-lyrical", PREFIX, "active", "2026-05", "2031-05"),
    Distro("rolling", 2, "robostack-rolling", PREFIX, "rolling", "2020-06", None),
]

# The artwork sits inside the heading rather than in a wrapper around it. Zensical
# reads the page title from the first Markdown heading, and a heading moved inside
# raw HTML stops being one, and the title then falls back to the file name. An empty
# alt keeps the extracted title clean.
#
# The install commands are a plain fenced block so they pick up the theme's
# highlighting and its copy button (`content.code.copy`) for free.
TEMPLATE = """<nav class="rs-distros" aria-label="Distributions">
{tabs}
</nav>

# ![](images/distros/{name}.png){{ .rs-art }} ROS{ros} {title}

<p class="rs-support">{support}</p>
{status}
Every package in the [ROS index](https://index.ros.org/#{name}) for {name}, and whether
it is available on the [`{channel}`]({browse}) channel yet.

```sh
pixi workspace channel add {base}/{channel}
pixi add ros-{name}-<package>
```

<div class="rs-packages" data-distro="{name}"{eol_attr}>
  <noscript>
    This table is rendered in the browser. Without JavaScript, browse the channel
    directly at <a href="{browse}">{label}</a>.
  </noscript>
</div>
"""

# Phrased about upstream, not about our rebuilds. Noetic is end of life upstream but
# its table is still regenerated on the usual schedule, so "no longer rebuilt" would
# be wrong for it.
EOL_BLOCK = """
!!! warning "End of life"

    {title} reached end of life in {eol}. Upstream no longer releases updates
    for it, so this table shows what was built while it was supported.
"""


def month_year(value: str) -> str:
    """Turn `2026-05` into `May 2026`."""
    year, month = value.split("-")
    return f"{calendar.month_name[int(month)]} {year}"


def support_line(distro: Distro) -> str:
    """The release and support summary shown under the title."""
    if distro.status == "rolling":
        return "Rolling release, rebuilt continuously against the newest index. No support window."
    released = f"Released {month_year(distro.released)}"
    if distro.status == "eol":
        return f"{released} &middot; end of life {month_year(distro.eol or '')}"
    if distro.eol:
        return f"{released} &middot; supported until {month_year(distro.eol)}"
    return f"{released} &middot; support window not yet published"


def tab_order(distros: list[Distro]) -> list[Distro]:
    """Rolling first, then every other release newest to oldest.

    Sorted rather than hand-ordered so a distro added to `DISTROS` cannot quietly land
    in the wrong place. Noetic and Foxy share a release month in the REPs, so the ROS
    generation breaks the tie and keeps the ROS 1 entry last.
    """
    rolling = [d for d in distros if d.status == "rolling"]
    dated = sorted(
        (d for d in distros if d.status != "rolling"),
        key=lambda d: (d.released, d.ros),
        reverse=True,
    )
    return rolling + dated


def tab_strip(distros: list[Distro], current: str) -> str:
    """The switcher markup, with `current` marked active."""
    return "\n".join(
        '<a class="rs-distro{cls}" href="{name}.html"{aria}>{name}</a>'.format(
            cls=" rs-distro--active" if d.name == current else "",
            name=d.name,
            aria=' aria-current="page"' if d.name == current else "",
        )
        for d in distros
    )


def render(distro: Distro, ordered: list[Distro]) -> str:
    """The full Markdown for one distro page."""
    browse = BROWSE[distro.base].format(channel=distro.channel)
    title = distro.name.capitalize()

    # Keyed on status, not on `eol` being set. The supported distros carry a future
    # end-of-life date and must not be warned about.
    eol_block = (
        EOL_BLOCK.format(title=title, eol=month_year(distro.eol or ""))
        if distro.status == "eol"
        else ""
    )

    return TEMPLATE.format(
        ros=distro.ros,
        title=title,
        name=distro.name,
        channel=distro.channel,
        base=distro.base,
        support=support_line(distro),
        status=eol_block,
        # Suppresses the per-row "Add to channel" button. Inviting contributions to a
        # distro upstream has stopped supporting would waste someone's afternoon.
        eol_attr=' data-eol="1"' if distro.status == "eol" else "",
        browse=browse,
        label=browse.replace("https://", ""),
        tabs=tab_strip(ordered, distro.name),
    )


def main() -> None:
    """Rewrite every distro page."""
    ordered = tab_order(DISTROS)
    print("tab order:", " ".join(d.name for d in ordered))

    for distro in DISTROS:
        path = os.path.join("docs", f"{distro.name}.md")
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(render(distro, ordered))
        print(f"  {path}")


if __name__ == "__main__":
    main()
