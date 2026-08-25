<!--
  Renders the Available Packages table from /data/<distro>.json.

  The table is a couple of thousand rows per distro, so the data ships as
  one JSON document and only the rows currently on screen are rendered.

  Everything on a channel is built against one version of the ROS distro
  mutex, and builds for different mutex versions cannot be installed together.
  So availability is always relative to a mutex: the dataset carries, per
  package and per mutex, which platforms have a build and what version is
  there, and picking a mutex recomputes the marks, the versions, the coverage
  figure and every filter count. The newest mutex is the default, because that
  is what a fresh install resolves to.

  Windowing uses a tall empty row above and below the visible slice rather
  than absolute positioning, which a real table would not allow.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import type { Doc, MutexRow, Row } from "./data";
  import {
    baseVersion,
    deriveMutexRows,
    matchesFilter,
    mutexPrefixes,
    relevanceTier,
    SORTERS,
    unpackRows,
  } from "./data";

  interface PlatformMeta {
    icon: string;
    arch: string;
  }

  const PLATFORMS: Record<string, PlatformMeta> = {
    "linux-64": { icon: "linux", arch: "x64" },
    "linux-aarch64": { icon: "linux", arch: "arm" },
    "osx-64": { icon: "apple", arch: "x64" },
    "osx-arm64": { icon: "apple", arch: "arm" },
    "win-64": { icon: "windows", arch: "x64" },
    // Only one wasm target, so the icon alone is unambiguous.
    "emscripten-wasm32": { icon: "wasm", arch: "" },
  };

  /* The upgrade filter only matters while an older mutex is selected; on the
   * newest there is nothing newer to move to. Chips with a zero count are not
   * rendered, which retires it automatically. */
  const FILTERS = [
    { id: "all", label: "All" },
    { id: "full", label: "Complete" },
    { id: "partial", label: "Partial" },
    { id: "missing", label: "Missing" },
    { id: "behind", label: "Behind index" },
    { id: "upgrade", label: "Newer on a newer mutex" },
  ];

  const OVERSCAN = 6;
  const CONTRIBUTING =
    "/Contributing.html#adding-new-packages-via-pull-requests";

  interface ActivePlatform {
    id: string;
    bit: number;
  }

  let {
    distro,
    eol = false,
    browse,
  }: { distro: string; eol?: boolean; browse: string } = $props();

  let doc = $state<Doc | null>(null);
  let error = $state("");

  let query = $state("");
  let filter = $state("all");
  let sort = $state("name");
  let mutex = $state(0);
  /* Narrow screens collapse the platform columns into a per-row pill; this
   * is the row whose platform detail is currently expanded under it. */
  let expanded = $state("");

  // Windowing state, driven by the scroll handler.
  let first = $state(0);
  let visibleCount = $state(40);
  let rowHeight = $state(68);

  let rootEl = $state<HTMLElement>();
  let theadEl = $state<HTMLTableSectionElement>();
  let tbodyEl = $state<HTMLTableSectionElement>();
  let searchEl = $state<HTMLInputElement>();

  const channel = $derived(doc?.channel ?? "");
  const mutexPackage = $derived(doc?.mutexPackage ?? "");
  const mutexes = $derived(doc?.mutexes ?? []);
  const currentMutex = $derived(mutexes[mutex] ?? "");
  /* Rolling renamed its packages from ros-rolling-* to ros2-* partway
   * through, so the prefix every name on the page carries comes from the
   * selected mutex rather than from the distro. */
  const prefix = $derived((doc ? (mutexPrefixes(doc)[mutex] ?? "") : "") + "-");

  const all: Row[] = $derived(doc ? unpackRows(doc) : []);

  /* Everything that depends on the selected mutex, derived in one pass:
   * O(n) over 2,300 rows, which is far cheaper than re-fetching. */
  const mutexData = $derived.by(() => {
    /* A platform column with nothing built for the selected mutex is
     * thousands of identical empty cells, so it is dropped and reported
     * instead. Recomputed per mutex: humble builds nothing for wasm on 0.1,
     * so that column genuinely does not exist there. */
    const active: ActivePlatform[] = (doc?.platforms ?? [])
      .map((id, bit) => ({ id, bit }))
      .filter((p) =>
        all.some((row) => {
          const slot = row.builds[mutex];
          return slot ? (slot[0] & (1 << p.bit)) !== 0 : false;
        }),
      );
    const bits = active.map((p) => p.bit);
    const rows = deriveMutexRows(all, mutex, mutexes, bits);

    const counts: Record<string, number> = {
      all: rows.length,
      full: rows.filter((r) => r.total && r.built === r.total).length,
      partial: rows.filter((r) => r.built > 0 && r.built < r.total).length,
      missing: rows.filter((r) => r.built === 0).length,
      behind: rows.filter((r) => r.behind).length,
      upgrade: rows.filter((r) => r.upgrade).length,
      older: rows.filter((r) => !r.mask && r.older.length).length,
    };

    // The summary figure is "how much of the ROS index is on RoboStack", so
    // channel-only packages count in the table but not in this ratio.
    const indexed = rows.filter((r) => r.indexed);
    return {
      rows,
      active,
      counts,
      indexTotal: indexed.length,
      indexAvailable: indexed.filter((r) => r.built > 0).length,
    };
  });

  const active = $derived(mutexData.active);
  const counts = $derived(mutexData.counts);
  const columns = $derived(active.length + 1);
  const hiddenPlatforms = $derived(
    (doc?.platforms ?? []).filter(
      (_id, bit) => !active.some((p) => p.bit === bit),
    ),
  );

  const chips = $derived(
    FILTERS.filter((f) => f.id === "all" || (counts[f.id] ?? 0) > 0),
  );

  // Changing the mutex can retire the selected filter (its chip disappears
  // when its count drops to zero); fall back to All instead of silently
  // showing an empty table with no active chip anywhere.
  $effect(() => {
    if (filter !== "all" && (counts[filter] ?? 0) === 0) filter = "all";
  });

  const rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const filtered = mutexData.rows.filter(
      (row) => matchesFilter(row, filter) && (!q || row.haystack.includes(q)),
    );
    const sorter = SORTERS[sort] ?? SORTERS.name;
    if (!q) return filtered.sort(sorter);
    return filtered.sort(
      (a, b) =>
        relevanceTier(a.name, q) - relevanceTier(b.name, q) || sorter(a, b),
    );
  });

  const last = $derived(Math.min(rows.length, first + visibleCount));
  const slice = $derived(rows.slice(first, last));
  const padBottom = $derived(rows.length - last);

  const indexTotal = $derived(mutexData.indexTotal);
  const indexAvailable = $derived(mutexData.indexAvailable);
  const percent = $derived(
    indexTotal ? Math.round((indexAvailable / indexTotal) * 100) : 0,
  );
  // Behind-index packages are a subset of the available ones (a package needs
  // a version on the channel before it can be compared), so the bar splits
  // the filled portion rather than adding to it. Unrounded widths, so the two
  // segments cannot drift apart from the total.
  const availablePct = $derived(
    indexTotal ? (indexAvailable / indexTotal) * 100 : 0,
  );
  const behindPct = $derived(
    indexTotal ? ((counts.behind ?? 0) / indexTotal) * 100 : 0,
  );
  const currentPct = $derived(Math.max(0, availablePct - behindPct));

  function updateWindow(): void {
    if (!theadEl) return;
    // <thead> keeps its place regardless of how tall the padding rows are,
    // so its bottom edge is a stable origin for the visible window.
    const above = Math.max(0, -theadEl.getBoundingClientRect().bottom);
    const visible = Math.ceil(window.innerHeight / rowHeight) + OVERSCAN * 2;
    // Clamping matters: an unbounded first index would make the leading pad
    // taller than the table itself, growing the page and letting the reader
    // scroll further, which grows it again.
    first = Math.min(
      Math.max(0, rows.length - visible),
      Math.max(0, Math.floor(above / rowHeight) - OVERSCAN),
    );
    visibleCount = visible;
  }

  // Re-window whenever the visible set changes. Filtering to a shorter list
  // can strand the reader below the new end of the table; pull back to its
  // top only when that has actually happened.
  $effect(() => {
    void rows;
    if (!theadEl) return;
    const rect = theadEl.getBoundingClientRect();
    if (rect.bottom + rows.length * rowHeight < 0) {
      window.scrollTo(0, window.scrollY + rect.top);
    }
    updateWindow();
  });

  /* The stylesheet declares the row height, but td padding can outweigh it,
   * and zoom or a font change shifts it again. Measuring a real row keeps the
   * padding rows honest whatever the CSS ends up doing. An expanded row is
   * deliberately taller than the rest, so it must not be the sample. */
  $effect(() => {
    void slice;
    const row = tbodyEl?.querySelector("tr:not(.rs-pad):not(.rs-open)");
    if (!row) return;
    const measured = Math.round(row.getBoundingClientRect().height);
    if (measured && measured !== rowHeight) rowHeight = measured;
  });

  onMount(() => {
    fetch("/data/" + distro + ".json")
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json() as Promise<Doc>;
      })
      .then((payload) => {
        doc = payload;
      })
      .catch((cause: Error) => {
        error = cause.message;
      });

    // One source of truth for the row height, so the windowing maths cannot
    // drift from the stylesheet.
    if (rootEl) {
      rowHeight =
        parseInt(
          window.getComputedStyle(rootEl).getPropertyValue("--rs-row-h"),
          10,
        ) || 68;
    }

    const onScroll = () => requestAnimationFrame(updateWindow);
    const onKey = (e: KeyboardEvent) => {
      if (!searchEl) return;
      if (e.key === "/" && document.activeElement !== searchEl) {
        // Leave the key alone while any other editable element has focus.
        const target = e.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable]")) {
          return;
        }
        e.preventDefault();
        searchEl.focus();
      } else if (e.key === "Escape" && document.activeElement === searchEl) {
        query = "";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
    };
  });
</script>

{#snippet iconSpan(name: string, size: number)}
  <!--
    The artwork lives in /images/icons/ and is applied as a CSS mask, not an
    <img>: a mask takes its colour from the surrounding text, so the same file
    works for a muted column header and for a link that inverts on hover. Size
    is per use, since headers, row links and the add button all differ.
  -->
  <span
    class="rs-icon rs-icon--{name}"
    style="width:{size}px;height:{size}px"
    aria-hidden="true"
  ></span>
{/snippet}

{#snippet extLink(href: string, title: string, name: string)}
  <a class="rs-link" {href} {title} target="_blank" rel="noreferrer">
    {@render iconSpan(name, 13)}
    <span class="sr-only">{title}</span>
  </a>
{/snippet}

{#snippet upgradeChip(row: MutexRow)}
  {#if row.upgrade}
    <!--
      A newer mutex offering this package, or a newer version of it, is the
      one gap the reader can act on, so it is called out the same way whether
      the selected mutex has nothing or merely has something older.
    -->
    <span
      class="rs-upgrade"
      title="{row.upgrade.version} is built for {mutexPackage} {row.upgrade
        .mutex}, newer than the {currentMutex} selected above"
      >&uarr; {row.upgrade.version} on {row.upgrade.mutex}</span
    >
  {/if}
{/snippet}

<div class="rs-packages not-content" bind:this={rootEl}>
  {#if error}
    <div class="rs-notice rs-notice--error">
      <p class="rs-notice__title">Could not load the package list</p>
      <p>
        The request failed with {error}. Browse the channel directly at
        <a href={browse}>{browse.replace("https://", "")}</a>.
      </p>
    </div>
  {:else if !doc}
    <p>Loading packages…</p>
  {:else}
    <div class="rs-summary">
      <p class="rs-summary__figure">
        {percent}%<span class="rs-summary__label"
          >of the packages on the index available on RoboStack</span
        >
      </p>
      <div class="rs-bar">
        <i
          class="rs-bar__current"
          style="width:{currentPct.toFixed(2)}%"
          title="{indexAvailable -
            (counts.behind ??
              0)} packages at the version the ROS index released"
        ></i>
        <i
          class="rs-bar__behind"
          style="width:{behindPct.toFixed(2)}%"
          title="{counts.behind} packages older than the version the ROS index released"
        ></i>
      </div>
      {#if mutexes.length}
        <p class="rs-mutex">
          <label>
            Built against
            <!-- The label wraps the select, but the aria-label overrides it, so
                 it opens with the same words the label shows: speech control
                 matches on what the user can read. -->
            <select
              aria-label="Built against ROS distro mutex version"
              bind:value={mutex}
            >
              {#each mutexes as version, i (version)}
                <option value={i}>
                  {mutexPackage}
                  {version}{i === 0 ? " (current)" : ""}
                </option>
              {/each}
            </select>
          </label>
          {#if counts.upgrade}
            <span class="rs-mutex__note rs-mutex__note--up"
              >{counts.upgrade} newer on a newer mutex</span
            >
          {/if}
          {#if counts.older}
            <span class="rs-mutex__note"
              >{counts.older} built only for an older mutex</span
            >
          {/if}
          <span class="rs-mutex__hint">
            Every package on the channel is built against one version of the
            <code>{mutexPackage}</code> package; builds for different versions cannot
            share an environment. A fresh install resolves to the newest.
          </span>
        </p>
      {/if}
    </div>

    <div class="rs-tools">
      <span class="rs-search">
        <span
          class="rs-icon rs-icon--magnifier rs-search__icon"
          aria-hidden="true"
        ></span>
        <input
          type="search"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search packages"
          placeholder="Search {all.length} packages…"
          bind:value={query}
          bind:this={searchEl}
        />
        <!-- Advertises the shortcut the keydown handler already provides. -->
        <kbd class="rs-slash" aria-hidden="true">/</kbd>
      </span>
      <!--
        Filters and sort travel together, so the sort control stays beside
        them and only drops to its own line when they genuinely overflow.
      -->
      <div class="rs-controls">
        <div class="rs-filters" role="group" aria-label="Filter packages">
          {#each chips as f (f.id)}
            <button
              type="button"
              class="rs-filter"
              class:rs-filter--on={filter === f.id}
              aria-pressed={filter === f.id}
              onclick={() => (filter = f.id)}
            >
              {f.label}
              <!-- The count doubles as the legend: it carries the same colour
                   the availability dots use, so the chips are the one place
                   these numbers appear. -->
              <span class="rs-chipcount rs-chipcount--{f.id}"
                >{counts[f.id]}</span
              >
            </button>
          {/each}
        </div>
        <select aria-label="Sort packages" bind:value={sort}>
          <option value="name">Name A-Z</option>
          <option value="coverage">Most platforms</option>
          <option value="gaps">Fewest platforms</option>
          <option value="recent">Recently built</option>
        </select>
      </div>
    </div>

    <p class="rs-count" aria-live="polite">
      <!-- Redundant while nothing is filtered out; the All chip already
           carries the total. -->
      {#if rows.length !== all.length}
        <span class="rs-count__showing"
          >Showing {rows.length.toLocaleString()} of {all.length.toLocaleString()}
          packages.</span
        >
      {/if}
      {#if hiddenPlatforms.length}
        {hiddenPlatforms.join(", ")} hidden: nothing built for this mutex.
      {/if}
    </p>

    <div class="rs-tablewrap">
      <table aria-rowcount={rows.length + 1}>
        <colgroup>
          <col />
          {#each active as p (p.id)}
            <col class="rs-col-plat" />
          {/each}
        </colgroup>
        <thead bind:this={theadEl}>
          <tr>
            <th scope="col">Package</th>
            {#each active as p (p.id)}
              {@const meta = PLATFORMS[p.id] ?? { icon: "linux", arch: "" }}
              <th scope="col" title={p.id}>
                <span class="rs-plat">
                  {@render iconSpan(meta.icon, 14)}{meta.arch}
                </span>
                <span class="sr-only">{p.id}</span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody bind:this={tbodyEl}>
          <!-- A single empty row stands in for everything scrolled out of view. -->
          {#if first > 0}
            <tr class="rs-pad" aria-hidden="true">
              <td colspan={columns} style="height:{first * rowHeight}px"></td>
            </tr>
          {/if}
          {#each slice as row, i (row.name)}
            {@const conda = prefix + row.name}
            <!-- The ROS index spells package names with underscores; conda
                 uses hyphens. -->
            {@const rosName = row.name.replace(/-/g, "_")}
            <tr
              aria-rowindex={first + i + 2}
              class:rs-open={expanded === row.name}
            >
              <td>
                <span
                  class="rs-dot"
                  class:rs-dot--missing={row.built === 0}
                  class:rs-dot--full={row.built > 0 && row.built === row.total}
                  class:rs-dot--partial={row.built > 0 && row.built < row.total}
                ></span>
                <span class="rs-name">
                  <span class="rs-pkg">
                    <span class="rs-prefix">{prefix}</span>{row.name}
                  </span>
                  <!--
                    On this mutex: the version built for it, plus an orange
                    pill carrying the newer version when the index has moved
                    past it. Not on this mutex: the upgrade chip, a grey pill
                    naming an older mutex that does have it, or the index
                    version, in that order of usefulness.
                  -->
                  {#if row.version}
                    <span class="rs-ver">{row.version}</span>
                    {@render upgradeChip(row)}
                    <!--
                      Suppressed alongside the upgrade chip: three versions on
                      one line squeezes the package name out, and "a newer
                      mutex has more" is the more actionable of the two ways
                      to be behind.
                    -->
                    {#if row.behind && !row.upgrade}
                      <span
                        class="rs-behind"
                        title="The ROS index has released {baseVersion(
                          row.indexVersion,
                        )}">{baseVersion(row.indexVersion)}</span
                      >
                    {/if}
                  {:else if row.upgrade}
                    {@render upgradeChip(row)}
                  {:else if row.older.length}
                    <!--
                      Labelled "mutex", because a bare version here sits where
                      the package version normally does and would be read as
                      one.
                    -->
                    <span
                      class="rs-elsewhere"
                      title="Built for {mutexPackage} {row.older.join(
                        ', ',
                      )}, all older than the {currentMutex} selected above"
                      >mutex {row.older[0]}{row.older.length > 1
                        ? " +" + (row.older.length - 1)
                        : ""}</span
                    >
                  {:else if row.indexVersion}
                    <span
                      class="rs-ver rs-ver--index"
                      title="Released in the ROS index, not built on {channel}"
                      >{baseVersion(row.indexVersion)}</span
                    >
                  {/if}
                  {#if row.version}
                    {@render extLink(
                      "https://prefix.dev/channels/" +
                        encodeURIComponent(channel) +
                        "/packages/" +
                        encodeURIComponent(conda),
                      conda + " on " + channel,
                      "channel",
                    )}
                  {/if}
                  <!-- Channel-only packages have no ROS index page to link. -->
                  {#if row.indexed}
                    {@render extLink(
                      "https://index.ros.org/p/" +
                        encodeURIComponent(rosName) +
                        "/#" +
                        distro,
                      rosName + " on the ROS index",
                      "docs",
                    )}
                  {/if}
                  {#if row.repo}
                    {@render extLink(
                      row.repo,
                      row.repo.replace(/^https?:\/\//, ""),
                      "github",
                    )}
                  {/if}
                  <!--
                    Pushed to the far right of the package cell, so it uses
                    the slack in that column instead of squeezing the name.
                  -->
                  {#if row.never && !eol}
                    <a
                      class="rs-add"
                      href={CONTRIBUTING}
                      title="How to get {row.name} built for {channel}"
                    >
                      {@render iconSpan("github", 12)}
                      <span class="rs-add__label">Add to channel</span>
                    </a>
                  {/if}
                </span>
                <!--
                  Narrow screens have no platform columns; the pill sums them
                  up and expands into a per-platform list below the
                  description. It spans both text rows in its own grid
                  column, so a finger-sized target does not stretch the row.
                -->
                <button
                  type="button"
                  class="rs-pill"
                  aria-expanded={expanded === row.name}
                  aria-label="Platform availability for {row.name}"
                  onclick={() =>
                    (expanded = expanded === row.name ? "" : row.name)}
                >
                  {row.built}/{row.total}
                </button>
                <small>{row.desc || "-"}</small>
                {#if expanded === row.name}
                  <span class="rs-detail">
                    {#each active as p (p.id)}
                      {@const meta = PLATFORMS[p.id] ?? {
                        icon: "linux",
                        arch: "",
                      }}
                      {@const on = ((row.mask >> p.bit) & 1) === 1}
                      <span
                        class="rs-det"
                        class:rs-det--yes={on}
                        class:rs-det--no={!on}
                        title="{p.id}: {on ? 'available' : 'not on channel'}"
                      >
                        <!--
                          Narrow screens drop the platform columns, so this
                          list is the only place the per-platform state
                          appears: it carries the same visually hidden text
                          those cells do rather than leaving the glyph and
                          the title attribute to speak for it.
                        -->
                        {@render iconSpan(meta.icon, 12)}{meta.arch}
                        {on ? "✓" : "·"}<span class="sr-only"
                          >{p.id}: {on ? "available" : "not on channel"}</span
                        >
                      </span>
                    {/each}
                  </span>
                {/if}
              </td>
              {#each active as p (p.id)}
                {@const on = ((row.mask >> p.bit) & 1) === 1}
                <td title="{p.id}: {on ? 'available' : 'not on channel'}">
                  <span
                    class="rs-mark"
                    class:rs-mark--yes={on}
                    class:rs-mark--no={!on}
                  >
                    {on ? "✓" : "·"}<span class="sr-only"
                      >{p.id}: {on ? "available" : "not on channel"}</span
                    >
                  </span>
                </td>
              {/each}
            </tr>
          {/each}
          {#if padBottom > 0}
            <tr class="rs-pad" aria-hidden="true">
              <td colspan={columns} style="height:{padBottom * rowHeight}px"
              ></td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    {#if rows.length === 0}
      <div class="rs-notice rs-empty">
        <p class="rs-notice__title">No matches</p>
        <p>No packages match that search or filter.</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .rs-packages {
    /* Windowing needs a known row height. Read back by the script so the
       stylesheet stays the single source of truth. Content is about 46px,
       so the rest is breathing room above and below. */
    --rs-row-h: 68px;

    --rs-yes-bg: #e7f4d6;
    --rs-yes-fg: #3f7a12;
    --rs-no-bg: var(--sl-color-gray-6);
    --rs-no-fg: var(--sl-color-gray-3);
    /* Orange, not amber: a warning must not share a hue with the gold brand. */
    --rs-warn-bg: hsl(28, 85%, 92%);
    --rs-warn-fg: hsl(25, 85%, 34%);
    /* The upgrade chip is a tint of the one accent-blue ramp. */
    --rs-up-bg: var(--sl-color-accent-low);
    --rs-up-fg: var(--sl-color-accent-high);

    font-size: var(--sl-text-sm);
  }

  :global(:root[data-theme="dark"]) .rs-packages {
    --rs-yes-bg: #22380f;
    --rs-yes-fg: #9ad668;
    --rs-warn-bg: hsl(25, 55%, 15%);
    --rs-warn-fg: hsl(28, 75%, 64%);
  }

  /* Visually hidden, still read by assistive technology. */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* ---- summary card ------------------------------------------------------ */
  .rs-summary {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  .rs-summary__figure {
    margin: 0;
    font-size: 2rem;
    font-weight: 300;
    line-height: 1.1;
    color: var(--sl-color-white);
    font-variant-numeric: tabular-nums;
  }
  .rs-summary__label {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: var(--sl-color-gray-3);
  }
  /* Two segments inside one track: what is on the channel, and how much of
     that has fallen behind the version the ROS index released. The behind
     portion is part of the fill, not extra on top of it. */
  .rs-bar {
    display: flex;
    height: 6px;
    margin: 0.6rem 0;
    border-radius: 999px;
    background: var(--sl-color-gray-6);
    overflow: hidden;
  }
  .rs-bar > i {
    display: block;
    height: 100%;
  }
  .rs-bar__current {
    background: var(--sl-color-accent);
  }
  .rs-bar__behind {
    background: var(--rs-warn-fg);
  }
  /* Mutex picker: availability is only meaningful against one of these, so
     it sits inside the summary card rather than among the table controls. */
  .rs-mutex {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin: 0.9rem 0 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--sl-color-gray-5);
    font-size: 0.8rem;
    color: var(--sl-color-gray-3);
  }
  .rs-mutex label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .rs-mutex__note {
    color: var(--rs-warn-fg);
  }
  .rs-mutex__note--up {
    color: var(--rs-up-fg);
  }
  /* "ros2-distro-mutex" is channel jargon; one muted sentence keeps the
     picker from being a mystery dropdown. */
  .rs-mutex__hint {
    flex-basis: 100%;
    color: var(--sl-color-gray-3);
  }
  .rs-mutex__hint code {
    font-size: 0.95em;
  }

  /* ---- toolbar ----------------------------------------------------------- */
  .rs-tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .rs-tools input,
  .rs-tools select,
  .rs-mutex select {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.25rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-white);
    font: inherit;
    font-size: 0.8rem;
    padding: 0.5em 0.8em;
  }
  .rs-mutex select {
    padding: 0.25em 0.5em;
    cursor: pointer;
  }
  /* min-width:0 matters: an input's automatic minimum size is its intrinsic
     width, which clamps the flex base size upward and pushes the filters and
     sort to a second row even when there is room for everything. */
  .rs-search {
    position: relative;
    display: flex;
    flex: 1 1 12rem;
    min-width: 0;
  }
  .rs-search input {
    flex: 1;
    min-width: 0;
  }
  /* The search box carries the whole table: it is the one control people
     reach for first, so it gets the card treatment the shared toolbar rule
     above leaves flat, and the room the icon and the "/" hint need on either
     side. */
  .rs-tools .rs-search input {
    padding: 0.6em 2.4em;
    border: 1.5px solid var(--border-2);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    box-shadow: var(--shadow-card);
    font-size: 0.95rem;
  }
  .rs-tools .rs-search input::placeholder {
    color: var(--fg-2);
  }
  .rs-search__icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0.95rem;
    height: 0.95rem;
    color: var(--fg-2);
    pointer-events: none;
  }
  /* Both edges answer focus: the glyph picks up the accent the border takes. */
  .rs-search:focus-within .rs-search__icon {
    color: var(--sl-color-accent);
  }
  /* Advertises the "/" shortcut. Gone while typing, and gone entirely on
     touch devices, where there is no key to press. */
  .rs-slash {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.15em 0.5em;
    border: 1px solid var(--border-2);
    border-radius: var(--radius-xs);
    font-family: inherit;
    font-size: 0.8rem;
    color: var(--fg-2);
    pointer-events: none;
  }
  .rs-search:focus-within .rs-slash,
  .rs-search input:not(:placeholder-shown) ~ .rs-slash {
    display: none;
  }
  @media (hover: none) and (pointer: coarse) {
    .rs-slash {
      display: none;
    }
  }
  /* Filters and sort wrap as one unit, so the sort control keeps its place
     next to them: when the row runs out of space the pair moves below the
     search box together, rather than the sort dropping off on its own. Within
     the pair the filter buttons wrap first, since they can reflow and the
     select cannot. */
  .rs-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  /* The accent border tracks focus for the pointer, but on its own it was
     the entire keyboard focus signal, and a 1px edge is under the thickness
     a focus indicator needs to carry that alone. The ring does that job. */
  .rs-tools input:focus,
  .rs-tools select:focus,
  .rs-mutex select:focus {
    border-color: var(--sl-color-accent);
  }
  .rs-tools input:focus-visible,
  .rs-tools select:focus-visible,
  .rs-mutex select:focus-visible {
    outline: 2px solid var(--sl-color-accent);
    outline-offset: 1px;
  }

  .rs-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .rs-filter {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.25rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-gray-2);
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35em 0.9em;
    white-space: nowrap;
    cursor: pointer;
  }
  .rs-filter:hover {
    border-color: var(--sl-color-gray-3);
  }
  .rs-filter--on {
    background: var(--sl-color-accent);
    border-color: var(--sl-color-accent);
    color: var(--sl-color-black);
  }
  /* The chip counts double as the colour legend: the same hues the
     availability dots use. On the active chip the accent background takes
     over and the count follows the label. */
  .rs-chipcount {
    font-variant-numeric: tabular-nums;
  }
  .rs-chipcount--full {
    color: var(--rs-yes-fg);
  }
  .rs-chipcount--partial {
    color: var(--rs-warn-fg);
  }
  .rs-chipcount--missing {
    color: var(--sl-color-gray-3);
  }
  .rs-chipcount--behind {
    color: var(--rs-warn-fg);
  }
  .rs-chipcount--upgrade {
    color: var(--rs-up-fg);
  }
  .rs-filter--on .rs-chipcount {
    color: inherit;
  }

  .rs-count {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    color: var(--sl-color-gray-3);
  }

  /* ---- table ------------------------------------------------------------- */
  .rs-tablewrap {
    overflow-x: auto;
    /* Anchor for the .sr-only spans inside the table: absolutely positioned
       boxes without a positioned ancestor sit at their static position in
       the wide table and stretch the page sideways on narrow screens. */
    position: relative;
  }
  /* A data grid, so a real fixed-layout table: the <colgroup> is
     authoritative and Package keeps whatever is left over. (Starlight's
     markdown styles set display:block on tables; that would ignore the
     colgroup and let the nowrap package cell drive the preferred width past
     3000px.) */
  .rs-packages table {
    display: table;
    table-layout: fixed;
    width: 100%;
    min-width: 42.5rem; /* below this the wrapper scrolls instead */
    margin: 0;
    font-size: inherit;
    border-collapse: collapse;
  }
  /* The fixed layout takes column widths from the <col> elements, so this is
     where the platform columns get their 5rem - and where the narrow-screen
     block can take it back, which hiding the cells alone would not. */
  .rs-packages col.rs-col-plat {
    width: 5rem;
  }
  .rs-packages th {
    padding: 0.6em 0.9em;
    white-space: nowrap;
    text-align: left;
    color: var(--sl-color-white);
    border-bottom: 1px solid var(--sl-color-gray-5);
  }
  /* Centred over the availability marks, which are centred in their cells. */
  .rs-packages th:not(:first-child) {
    text-align: center;
  }
  .rs-packages tbody tr {
    height: var(--rs-row-h);
  }
  /* The separator lives on the cells, not the row: the first cell is a grid
     (not a table-cell), and a row border breaks at its edge. */
  .rs-packages tbody td {
    border-bottom: 1px solid var(--sl-color-gray-6);
  }

  /* Sticky column headers: with 2,000+ rows the labels otherwise scroll away
     and there is no telling osx-64 from osx-arm64. Sticky needs no scroll
     container between the table and the viewport. The fixed-layout table
     only overflows below its min-width floor, so above that the wrapper can
     go back to visible. */
  @media screen and (min-width: 62.5em) {
    .rs-tablewrap {
      overflow-x: visible;
    }
    .rs-packages thead th {
      position: sticky;
      top: var(--sl-nav-height);
      z-index: 2;
      background-color: var(--sl-color-bg);
    }
  }
  .rs-packages td {
    padding: 0 0.9em;
    vertical-align: middle;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rs-packages tbody td small {
    grid-column: 2;
    grid-row: 2;
    display: block;
    color: var(--sl-color-gray-3);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The stand-in rows for everything scrolled out of view. */
  .rs-packages tr.rs-pad,
  .rs-packages tr.rs-pad:hover {
    background: none;
    border: 0;
  }
  .rs-packages tr.rs-pad td {
    padding: 0;
    border: 0;
  }

  /* ---- the package cell -------------------------------------------------- */
  /* Two-column grid: the dot in column one, the name line and description
     stacked in column two. The dot column keeps every dot on a single axis,
     and the description inherits the name's left edge instead of being
     indented by a hand-tuned amount. */
  .rs-packages tbody td:first-child {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 0.5rem;
    /* A grid td is wrapped in an anonymous table cell, so it does not stretch
       to the row on its own: without an explicit height the box is only as
       tall as its content, align-content has nothing to centre within, and
       the text sits flush with the top while the platform marks centre
       themselves. */
    height: var(--rs-row-h);
    align-content: center;
  }
  .rs-dot {
    grid-column: 1;
    grid-row: 1;
    align-self: baseline; /* sits on the name's baseline, like a bullet */
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }
  .rs-name {
    grid-column: 2;
    grid-row: 1;
    /* Also baseline, so the row has two participants and the dot lines up
       with the name's text baseline rather than with the top of the row.
       Inside the line, items stay centred so the link icons do not sit on
       the baseline. */
    align-self: baseline;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .rs-dot--full {
    background: var(--rs-yes-fg);
  }
  .rs-dot--partial {
    background: var(--rs-warn-fg);
  }
  .rs-dot--missing {
    background: var(--sl-color-gray-4);
  }
  /* Shrinks with an ellipsis when the name is long, but does not stretch:
     the version and links sit immediately after it. Not bolded: the contrast
     against the muted prefix and description already separates it. */
  .rs-pkg {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* gray-3, not gray-4: the prefix must stay readable (WCAG AA), muted
     against the name only by not being the text colour. */
  .rs-prefix {
    color: var(--sl-color-gray-3);
  }
  /* The prefix is identical on every row of the page; on narrow screens it
     would consume the name column and leave the distinguishing part of the
     name ellipsized. */
  @media screen and (max-width: 48rem) {
    .rs-prefix {
      display: none;
    }
  }
  .rs-ver {
    flex: 0 0 auto;
    color: var(--sl-color-gray-3);
    font-variant-numeric: tabular-nums;
  }
  /* The index version for a package that is not built here: italic rather
     than a lighter grey, so it stays readable while still not reading as a
     version you can install from the channel. */
  .rs-ver--index {
    font-style: italic;
  }
  /* Reads as a chip: fully-rounded radius, tinted rather than plain coloured
     text, so a stale package is visible when scanning the column rather than
     only on close reading. */
  .rs-behind,
  .rs-elsewhere,
  .rs-upgrade {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    border-radius: 3rem;
    padding: 0.15em 0.6em;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.6;
    white-space: nowrap;
  }
  .rs-behind {
    background: var(--rs-warn-bg);
    color: var(--rs-warn-fg);
  }
  /* Only on an older mutex: nothing to act on, so it stays quiet. */
  .rs-elsewhere {
    background: var(--sl-color-gray-6);
    color: var(--sl-color-gray-3);
  }
  /* A newer mutex has this package, or a newer build of it. The one gap the
     reader can close, so it carries the accent rather than a warning colour:
     this is an opportunity, not a problem. */
  .rs-upgrade {
    background: var(--rs-up-bg);
    color: var(--rs-up-fg);
  }

  /* "Add to channel" for packages nobody has built yet. margin-left:auto
     parks it at the right edge of the package column, so it consumes that
     column's slack rather than shortening the name. */
  .rs-add {
    flex: 0 0 auto;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    padding: 0.15em 0.7em;
    font-size: 0.75rem;
    white-space: nowrap;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.25rem;
    color: var(--sl-color-gray-2);
    text-decoration: none;
  }
  .rs-add:hover {
    border-color: var(--sl-color-accent);
    color: var(--sl-color-accent);
  }
  /* Below this the package column is too narrow to carry both, and the button
     does not shrink, so the name would lose. Drop to the icon instead; the
     title still names the package and the channel. */
  @media screen and (max-width: 1400px) {
    .rs-add {
      padding: 0.15em 0.45em;
    }
    .rs-add__label {
      display: none;
    }
  }

  /* Outbound links: prefix.dev channel, ROS index, upstream source. Always
     visible: hiding them until hover would put them out of reach on touch. */
  .rs-link {
    flex: 0 0 auto;
    display: inline-flex;
    padding: 0.2rem;
    border-radius: 0.125rem;
    color: var(--sl-color-gray-3);
    transition:
      color 125ms,
      background-color 125ms;
  }
  .rs-link:hover,
  .rs-link:focus {
    color: var(--sl-color-black);
    background: var(--sl-color-accent);
  }
  /* Coarse pointers need more than a 21px square to hit. */
  @media (hover: none) and (pointer: coarse) {
    .rs-link {
      padding: 0.5rem 0.45rem;
    }
  }
  /* Icons are masks rather than images, so they inherit the text colour: the
     same file serves a muted column header and a link that inverts on hover. */
  .rs-icon {
    display: inline-block;
    flex: 0 0 auto;
    vertical-align: middle;
    background-color: currentColor;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  }
  .rs-icon--linux {
    mask-image: url("/images/icons/linux.svg");
  }
  .rs-icon--apple {
    mask-image: url("/images/icons/apple.svg");
  }
  .rs-icon--windows {
    mask-image: url("/images/icons/windows.svg");
  }
  .rs-icon--wasm {
    mask-image: url("/images/icons/wasm.svg");
  }
  .rs-icon--channel {
    mask-image: url("/images/icons/channel.svg");
  }
  .rs-icon--docs {
    mask-image: url("/images/icons/docs.svg");
  }
  .rs-icon--github {
    mask-image: url("/images/icons/github.svg");
  }
  .rs-icon--magnifier {
    mask-image: url("/images/icons/magnifier.svg");
  }

  /* Availability marks. Every column except Package holds one, so the cells
     are centred without needing a class of their own. */
  .rs-packages tbody td:not(:first-child) {
    text-align: center;
  }
  .rs-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 0.3rem;
    font-weight: 700;
    line-height: 1;
  }
  .rs-mark--yes {
    background: var(--rs-yes-bg);
    color: var(--rs-yes-fg);
  }
  .rs-mark--no {
    background: var(--rs-no-bg);
    color: var(--rs-no-fg);
  }

  /* Platform headers: OS icon plus the architecture, since two platforms
     share each icon and linux-64 would otherwise be indistinguishable from
     aarch64. */
  .rs-plat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--sl-color-gray-3);
  }

  /* ---- narrow screens ---------------------------------------------------- */
  /* Six ~5rem availability columns cannot fit next to the package cell, so
     below 48rem they collapse into one coverage pill per row that expands
     into a per-platform list. Desktop never shows the pill. */
  .rs-pill,
  .rs-detail {
    display: none;
  }
  @media screen and (max-width: 48rem) {
    .rs-packages thead th:not(:first-child),
    .rs-packages tbody td:not(:first-child) {
      display: none;
    }
    /* Only one column left; scrolling sideways would reveal nothing. The
       hidden columns must also give up their <col> width, or the fixed
       layout keeps reserving 5rem apiece for them. */
    .rs-packages table {
      min-width: 0;
    }
    .rs-packages col.rs-col-plat {
      width: 0;
    }
    /* Competes with the pill for the right edge; the Contributing page
       remains reachable through the missing-package notice on desktop. */
    .rs-add {
      display: none;
    }
    /* Third grid column for the pill, and room to grow for the expanded
       platform list. The row height floor stays where it was. */
    .rs-packages tbody td:first-child {
      grid-template-columns: auto minmax(0, 1fr) auto;
      height: auto;
      min-height: var(--rs-row-h);
    }
    .rs-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      grid-column: 3;
      grid-row: 1 / span 2;
      align-self: center;
      min-height: 2.75rem; /* a finger-sized target */
      min-width: 3.2rem;
      padding: 0 0.7em;
      border: 1px solid var(--sl-color-gray-5);
      border-radius: 2rem;
      background: var(--sl-color-bg);
      color: var(--sl-color-gray-2);
      font: inherit;
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
    }
    .rs-pill[aria-expanded="true"] {
      border-color: var(--sl-color-accent);
      color: var(--sl-color-accent);
    }
    .rs-detail {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.9rem;
      grid-column: 2 / 4;
      grid-row: 3;
      padding: 0.3rem 0 0.6rem;
      font-size: 0.8rem;
    }
    .rs-det {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .rs-det--yes {
      color: var(--rs-yes-fg);
    }
    .rs-det--no {
      color: var(--sl-color-gray-3);
    }
  }

  /* ---- notices ----------------------------------------------------------- */
  .rs-notice {
    border: 1px solid var(--sl-color-gray-5);
    border-left: 4px solid var(--sl-color-accent);
    border-radius: 0.25rem;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
  }
  .rs-notice__title {
    margin: 0 0 0.25rem;
    font-weight: 700;
    color: var(--sl-color-white);
  }
  .rs-notice p {
    margin: 0;
  }
  .rs-notice--error {
    border-left-color: var(--sl-color-red);
  }
</style>
