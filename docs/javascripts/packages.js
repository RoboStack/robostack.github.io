/* Renders the Available Packages table from docs/data/<distro>.json.
 *
 * The distro pages used to ship the whole table as static Markdown — around
 * 2,300 rows and 13,000 remote emoji images per page. This fetches the same
 * data as JSON instead and renders only the rows currently on screen.
 *
 * Everything on a channel is built against one version of the ROS distro
 * mutex, and builds for different mutex versions cannot be installed together.
 * So availability is always relative to a mutex: the dataset carries, per
 * package and per mutex, which platforms have a build and what version is
 * there, and picking a mutex recomputes the marks, the versions, the coverage
 * figure and every filter count. The newest mutex is the default, because that
 * is what a fresh install resolves to.
 *
 * The markup is a plain <table> inside the theme's own scroll wrapper, with no
 * class on the table itself, so .md-typeset table:not([class]) styles it
 * exactly like a Markdown table. Windowing uses a tall empty row above and
 * below the visible slice rather than absolute positioning, which a real table
 * would not allow.
 *
 * document$ is Material's page observable. navigation.instant swaps pages
 * without a reload, so anything touching the DOM runs per page here.
 */

(function () {
  "use strict";

  var PLATFORMS = {
    "linux-64": { icon: "linux", arch: "x64" },
    "linux-aarch64": { icon: "linux", arch: "arm" },
    "osx-64": { icon: "apple", arch: "x64" },
    "osx-arm64": { icon: "apple", arch: "arm" },
    "win-64": { icon: "windows", arch: "x64" },
    // Only one wasm target, so the icon alone is unambiguous.
    "emscripten-wasm32": { icon: "wasm", arch: "" }
  };

  var FILTERS = [
    { id: "all", label: "All" },
    { id: "full", label: "Complete" },
    { id: "partial", label: "Partial" },
    { id: "missing", label: "Missing" },
    { id: "behind", label: "Behind index" }
  ];

  var OVERSCAN = 6;
  var CONTRIBUTING = "Contributing.html#adding-new-packages-via-pull-requests";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // rosdistro versions carry a release increment ("2.0.2-1"); drop it to
  // compare against the plain version conda publishes.
  function baseVersion(value) {
    return String(value || "").split("-")[0];
  }

  function versionParts(value) {
    return baseVersion(value).split(".").map(function (part) {
      return /^\d+$/.test(part) ? parseInt(part, 10) : -1;
    });
  }

  function compareVersions(a, b) {
    var x = versionParts(a);
    var y = versionParts(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var delta = (x[i] === undefined ? -1 : x[i]) - (y[i] === undefined ? -1 : y[i]);
      if (delta) return delta < 0 ? -1 : 1;
    }
    return 0;
  }

  /* The artwork lives in docs/images/icons/ and is applied as a CSS mask, not an
   * <img>: a mask takes its colour from the surrounding text, so the same file
   * works for a muted column header and for a link that inverts on hover. Size
   * is per use, since headers, row links and the add button all differ. */
  function icon(name, size) {
    return '<span class="rs-icon rs-icon--' + name + '" style="width:' + size +
      "px;height:" + size + 'px" aria-hidden="true"></span>';
  }

  function Table(mount, doc) {
    var all = doc.packages.map(function (pkg) {
      return {
        name: pkg[0],
        desc: pkg[1],
        license: pkg[2],
        indexVersion: pkg[3],
        updated: pkg[4],
        repo: pkg[5] >= 0 ? doc.repos[pkg[5]] : "",
        builds: pkg[6],                 // aligned with doc.mutexes
        haystack: (pkg[0] + " " + pkg[1]).toLowerCase()
      };
    });

    var state = { query: "", filter: "all", sort: "name", mutex: 0, rows: [] };
    var active, counts, columns, thead, tbody, rowHeight;

    /* A platform column with nothing built for the selected mutex is thousands
     * of identical empty cells, so it is dropped and reported instead. This is
     * recomputed per mutex: humble builds nothing for wasm on 0.1, so that
     * column genuinely does not exist there. */
    function activePlatforms() {
      return doc.platforms
        .map(function (id, bit) { return { id: id, bit: bit }; })
        .filter(function (p) {
          return all.some(function (row) {
            var slot = row.builds[state.mutex];
            return slot && (slot[0] & (1 << p.bit));
          });
        });
    }

    /* Derives every per-mutex value onto the rows. Called whenever the mutex
     * changes; O(n) over 2,300 rows, which is far cheaper than re-fetching. */
    function applyMutex() {
      active = activePlatforms();
      columns = active.length + 1;
      var bits = active.map(function (p) { return p.bit; });

      all.forEach(function (row) {
        var slot = row.builds[state.mutex];
        row.mask = slot ? slot[0] : 0;
        row.version = slot ? slot[1] : "";
        row.built = bits.reduce(function (n, bit) { return n + ((row.mask >> bit) & 1); }, 0);
        row.total = bits.length;
        row.behind = !!row.version && !!row.indexVersion &&
          compareVersions(row.version, row.indexVersion) < 0;
        // Which other mutexes do have it, so a gap reads as "built, but not
        // for this mutex" rather than "never built". Newer and older are kept
        // apart because only one of them is actionable: a package waiting on a
        // newer mutex arrives if you move up, one that exists only on an older
        // mutex has been dropped and will not come back.
        // doc.mutexes is newest first, so a lower index means newer.
        row.older = [];
        row.upgrade = null;
        // Never built for any mutex. Distinct from "not built for the selected
        // mutex": that one is answered by changing the mutex, this one only by
        // someone adding the package.
        row.never = !row.builds.some(function (slot) { return slot; });
        for (var i = 0; i < doc.mutexes.length; i++) {
          var other = row.builds[i];
          if (i === state.mutex || !other) continue;
          if (i > state.mutex) {
            if (!row.mask) row.older.push(doc.mutexes[i]);
            continue;
          }
          // A newer mutex: worth reporting when it offers this package at all,
          // or offers a newer version of it than the selected mutex does.
          if (!row.upgrade || compareVersions(other[1], row.upgrade.version) > 0) {
            row.upgrade = { version: other[1], mutex: doc.mutexes[i] };
          }
        }
        if (row.upgrade && row.version &&
            compareVersions(row.upgrade.version, row.version) <= 0) {
          row.upgrade = null;
        }
      });

      counts = {
        all: all.length,
        full: all.filter(function (r) { return r.total && r.built === r.total; }).length,
        partial: all.filter(function (r) { return r.built > 0 && r.built < r.total; }).length,
        missing: all.filter(function (r) { return r.built === 0; }).length,
        behind: all.filter(function (r) { return r.behind; }).length,
        upgrade: all.filter(function (r) { return r.upgrade; }).length,
        older: all.filter(function (r) { return !r.mask && r.older.length; }).length
      };
    }

    /* The upgrade filter only exists while an older mutex is selected — on the
     * newest there is nothing newer to move to. */
    function filters() {
      return counts.upgrade
        ? FILTERS.concat([{ id: "upgrade", label: "Newer on a newer mutex" }])
        : FILTERS;
    }

    function matchesFilter(row, filter) {
      switch (filter) {
        case "full": return row.total && row.built === row.total;
        case "partial": return row.built > 0 && row.built < row.total;
        case "missing": return row.built === 0;
        case "behind": return row.behind;
        case "upgrade": return !!row.upgrade;
        default: return true;
      }
    }

    function apply() {
      var query = state.query.trim().toLowerCase();
      var rows = all.filter(function (row) {
        return matchesFilter(row, state.filter) &&
          (!query || row.haystack.indexOf(query) !== -1);
      });
      var sorters = {
        name: function (a, b) { return a.name.localeCompare(b.name); },
        coverage: function (a, b) { return b.built - a.built || a.name.localeCompare(b.name); },
        gaps: function (a, b) { return a.built - b.built || a.name.localeCompare(b.name); },
        recent: function (a, b) { return b.updated - a.updated || a.name.localeCompare(b.name); }
      };
      state.rows = rows.sort(sorters[state.sort] || sorters.name);
    }

    function chrome() {
      var available = counts.full + counts.partial;
      var percent = all.length ? Math.round((available / all.length) * 100) : 0;
      // Behind-index packages are a subset of the available ones — a package
      // needs a version on the channel before it can be compared — so the bar
      // splits the filled portion rather than adding to it. Unrounded widths,
      // so the two segments cannot drift apart from the total.
      var availablePct = all.length ? (available / all.length) * 100 : 0;
      var behindPct = all.length ? (counts.behind / all.length) * 100 : 0;
      var currentPct = Math.max(0, availablePct - behindPct);
      var hidden = doc.platforms.filter(function (id, bit) {
        return !active.some(function (p) { return p.bit === bit; });
      });

      mount.innerHTML =
        // .grid > .card is the theme's card: border, radius, padding, hover.
        '<div class="grid"><div class="card rs-summary">' +
          '<p class="rs-summary__figure">' + percent + "%" +
            '<span class="rs-summary__label">of the packages on the index ' +
            "available on RoboStack</span></p>" +
          '<div class="rs-bar">' +
            '<i class="rs-bar__current" style="width:' + currentPct.toFixed(2) + '%" title="' +
              (available - counts.behind) + ' packages at the version the ROS index released"></i>' +
            '<i class="rs-bar__behind" style="width:' + behindPct.toFixed(2) + '%" title="' +
              counts.behind + ' packages older than the version the ROS index released"></i>' +
          "</div>" +
          '<p class="rs-summary__legend">' +
            '<span class="rs-key rs-key--full">' + counts.full + " on every platform</span>" +
            '<span class="rs-key rs-key--partial">' + counts.partial + " partial</span>" +
            '<span class="rs-key rs-key--missing">' + counts.missing + " not on channel</span>" +
            '<span class="rs-key rs-key--behind">of those, ' + counts.behind +
              " behind the index</span>" +
          "</p>" +
          mutexPicker() +
        "</div></div>" +

        '<div class="rs-tools">' +
          '<input type="search" autocomplete="off" spellcheck="false" aria-label="Search packages"' +
            ' placeholder="Search ' + all.length + ' index packages…">' +
          // Filters and sort travel together, so the sort control stays beside
          // them and only drops to its own line when they genuinely overflow.
          '<div class="rs-controls">' +
            '<div class="rs-filters" role="group" aria-label="Filter packages">' +
              filters().map(function (f) {
                var on = f.id === state.filter;
                return '<button type="button" class="md-button' +
                  (on ? " md-button--primary" : "") + '" data-filter="' + f.id +
                  '" aria-pressed="' + on + '">' + f.label + " " + counts[f.id] + "</button>";
              }).join("") + "</div>" +
            '<select aria-label="Sort packages">' +
              '<option value="name">Name A–Z</option>' +
              '<option value="coverage">Most platforms</option>' +
              '<option value="gaps">Fewest platforms</option>' +
              '<option value="recent">Recently built</option>' +
            "</select>" +
          "</div>" +
        "</div>" +

        '<p class="rs-count"><span class="rs-count__showing"></span>' +
          (hidden.length ? " " + hidden.join(", ") + " hidden — nothing built for this mutex." : "") +
        "</p>" +

        // No class on <table>: that is what makes the theme style it as a
        // Markdown table. The wrappers are the theme's own scroll handling.
        '<div class="md-typeset__scrollwrap"><div class="md-typeset__table"><table>' +
          "<colgroup><col>" +
          active.map(function () { return '<col style="width:4rem">'; }).join("") +
          "</colgroup><thead><tr><th>Package</th>" +
          active.map(function (p) {
            var meta = PLATFORMS[p.id] || { icon: "linux", arch: "" };
            return '<th title="' + p.id + '"><span class="rs-plat">' +
              icon(meta.icon, 14) + meta.arch + "</span></th>";
          }).join("") +
          "</tr></thead><tbody></tbody>" +
        "</table></div></div>" +

        '<div class="admonition info rs-empty" hidden>' +
          '<p class="admonition-title">No matches</p>' +
          "<p>No packages match that search or filter.</p></div>";

      thead = mount.querySelector("thead");
      tbody = mount.querySelector("tbody");
      // One source of truth for the row height, so the windowing maths cannot
      // drift from the stylesheet if the theme changes its root font size.
      rowHeight = parseInt(
        window.getComputedStyle(mount).getPropertyValue("--rs-row-h"), 10
      ) || 68;
    }

    function mutexPicker() {
      if (!doc.mutexes.length) return "";
      return '<p class="rs-mutex"><label>Built against ' +
        '<select aria-label="ROS distro mutex version" data-mutex>' +
          doc.mutexes.map(function (v, i) {
            return '<option value="' + i + '"' + (i === state.mutex ? " selected" : "") + ">" +
              escapeHtml(doc.mutexPackage) + " " + escapeHtml(v) +
              (i === 0 ? " (current)" : "") + "</option>";
          }).join("") +
        "</select></label>" +
        (counts.upgrade
          ? '<span class="rs-mutex__note rs-mutex__note--up">' + counts.upgrade +
            " newer on a newer mutex</span>"
          : "") +
        (counts.older
          ? '<span class="rs-mutex__note">' + counts.older +
            " built only for an older mutex</span>"
          : "") +
        "</p>";
    }

    function link(href, title, name) {
      return '<a class="rs-link" href="' + href + '" title="' + title +
        '" target="_blank" rel="noreferrer">' + icon(name, 13) + "</a>";
    }

    function rowHtml(row) {
      var conda = "ros-" + doc.distro + "-" + row.name;
      // The ROS index spells package names with underscores; conda uses hyphens.
      var rosName = row.name.replace(/-/g, "_");

      // A newer mutex offering this package, or a newer version of it, is the
      // one gap the reader can act on — so it is called out the same way
      // whether the selected mutex has nothing or merely has something older.
      var upgrade = row.upgrade
        ? '<span class="rs-upgrade" title="' + escapeHtml(row.upgrade.version) +
          " is built for " + escapeHtml(doc.mutexPackage) + " " +
          escapeHtml(row.upgrade.mutex) + ", newer than the " +
          escapeHtml(doc.mutexes[state.mutex]) + ' selected above">&uarr; ' +
          escapeHtml(row.upgrade.version) + " on " +
          escapeHtml(row.upgrade.mutex) + "</span>"
        : "";

      // On this mutex: the version built for it, plus an amber pill carrying
      // the newer version when the index has moved past it. Not on this mutex:
      // the upgrade chip, a grey pill naming an older mutex that does have it,
      // or the index version — in that order of usefulness.
      var version = row.version
        ? '<span class="rs-ver">' + escapeHtml(row.version) + "</span>" + upgrade +
          // Suppressed alongside the upgrade chip: three versions on one line
          // squeezes the package name out, and "a newer mutex has more" is the
          // more actionable of the two ways to be behind.
          (row.behind && !upgrade
            ? '<span class="rs-behind" title="The ROS index has released ' +
              escapeHtml(baseVersion(row.indexVersion)) + '">' +
              escapeHtml(baseVersion(row.indexVersion)) + "</span>"
            : "")
        : upgrade ||
          // Labelled "mutex", because a bare version here sits where the
          // package version normally does and would be read as one.
          (row.older.length
            ? '<span class="rs-elsewhere" title="Built for ' + escapeHtml(doc.mutexPackage) +
              " " + row.older.join(", ") + ", all older than the " +
              escapeHtml(doc.mutexes[state.mutex]) + ' selected above">mutex ' +
              escapeHtml(row.older[0]) +
              (row.older.length > 1 ? " +" + (row.older.length - 1) : "") + "</span>"
            : row.indexVersion
              ? '<span class="rs-ver rs-ver--index" title="Released in the ROS index, not built on ' +
                escapeHtml(doc.channel) + '">' +
                escapeHtml(baseVersion(row.indexVersion)) + "</span>"
              : "");

      return "<tr><td>" +
          '<span class="rs-dot rs-dot--' +
            (row.built === 0 ? "missing" : row.built === row.total ? "full" : "partial") +
          '"></span>' +
          '<span class="rs-name">' +
            '<span class="rs-pkg">' +
              '<span class="rs-prefix">ros-' + escapeHtml(doc.distro) + "-</span>" +
              escapeHtml(row.name) +
            "</span>" +
            version +
            (row.version
              ? link("https://prefix.dev/channels/" + encodeURIComponent(doc.channel) +
                  "/packages/" + encodeURIComponent(conda), conda + " on " + doc.channel, "channel")
              : "") +
            link("https://index.ros.org/p/" + encodeURIComponent(rosName) + "/#" + doc.distro,
              rosName + " on the ROS index", "docs") +
            (row.repo ? link(row.repo, row.repo.replace(/^https?:\/\//, ""), "github") : "") +
            // Pushed to the far right of the package cell, so it uses the slack
            // in that column instead of squeezing the name.
            (row.never && !mount.dataset.eol
              ? '<a class="md-button rs-add" href="' + CONTRIBUTING +
                '" title="How to get ' + escapeHtml(row.name) + " built for " +
                escapeHtml(doc.channel) + '">' + icon("github", 12) +
                '<span class="rs-add__label">Add to channel</span></a>'
              : "") +
          "</span>" +
          "<small>" + escapeHtml(row.desc || "—") + "</small>" +
        "</td>" +
        active.map(function (p) {
          var on = (row.mask >> p.bit) & 1;
          return '<td title="' + p.id + ": " + (on ? "available" : "not on channel") +
            '"><span class="rs-mark rs-mark--' + (on ? "yes" : "no") + '">' +
            (on ? "✓" : "·") + "</span></td>";
        }).join("") +
        "</tr>";
    }

    // A single empty row standing in for `count` rows that are not rendered.
    function padding(count) {
      return count > 0
        ? '<tr class="rs-pad" aria-hidden="true"><td colspan="' + columns +
          '" style="height:' + count * rowHeight + 'px"></td></tr>'
        : "";
    }

    function renderRows() {
      var rows = state.rows;
      // <thead> keeps its place regardless of how tall the padding rows are,
      // so its bottom edge is a stable origin for the visible window.
      var above = Math.max(0, -thead.getBoundingClientRect().bottom);
      var visible = Math.ceil(window.innerHeight / rowHeight) + OVERSCAN * 2;
      // Clamping matters: an unbounded first index would make the leading pad
      // taller than the table itself, growing the page and letting the reader
      // scroll further, which grows it again.
      var first = Math.min(
        Math.max(0, rows.length - visible),
        Math.max(0, Math.floor(above / rowHeight) - OVERSCAN)
      );
      var last = Math.min(rows.length, first + visible);

      tbody.innerHTML =
        padding(first) +
        rows.slice(first, last).map(rowHtml).join("") +
        padding(rows.length - last);
    }

    /* The stylesheet declares the row height, but the theme's own td padding
     * can outweigh it, and zoom or a font change shifts it again. Measuring a
     * real row keeps the padding rows honest whatever the CSS ends up doing. */
    function syncRowHeight() {
      var row = tbody.querySelector("tr:not(.rs-pad)");
      if (!row) return false;
      var measured = Math.round(row.getBoundingClientRect().height);
      if (!measured || measured === rowHeight) return false;
      rowHeight = measured;
      return true;
    }

    function refresh() {
      apply();
      mount.querySelector(".rs-count__showing").textContent =
        "Showing " + state.rows.length.toLocaleString() + " of " +
        all.length.toLocaleString() + " index packages.";
      mount.querySelector(".rs-empty").hidden = state.rows.length > 0;
      // Filtering to a shorter list can strand the reader below the new end of
      // the table; pull back to its top only when that has actually happened.
      var rect = thead.getBoundingClientRect();
      if (rect.bottom + state.rows.length * rowHeight < 0) {
        window.scrollTo(0, window.scrollY + rect.top);
      }
      renderRows();
    }

    function bind() {
      mount.querySelector("input").addEventListener("input", function (e) {
        state.query = e.target.value;
        refresh();
      });
      mount.querySelector(".rs-tools select").addEventListener("change", function (e) {
        state.sort = e.target.value;
        refresh();
      });
      mount.querySelector(".rs-filters").addEventListener("click", function (e) {
        var button = e.target.closest("[data-filter]");
        if (!button) return;
        state.filter = button.dataset.filter;
        mount.querySelectorAll("[data-filter]").forEach(function (b) {
          var on = b.dataset.filter === state.filter;
          b.setAttribute("aria-pressed", String(on));
          b.classList.toggle("md-button--primary", on);
        });
        refresh();
      });
      var picker = mount.querySelector("[data-mutex]");
      if (picker) {
        picker.addEventListener("change", function (e) {
          state.mutex = parseInt(e.target.value, 10) || 0;
          // Columns and every count change with the mutex, so the whole chrome
          // is rebuilt rather than patched.
          applyMutex();
          rebuild();
        });
      }
    }

    function rebuild() {
      chrome();
      bind();
      refresh();
      if (syncRowHeight()) renderRows();
    }

    applyMutex();
    rebuild();

    // navigation.instant swaps pages without a reload, so these outlive the
    // mount they belong to. Each bails once its mount has left the document.
    var alive = function () { return document.body.contains(mount); };
    var onScroll = function () { if (alive()) requestAnimationFrame(renderRows); };
    var onResize = function () { if (alive()) renderRows(); };
    var onKey = function (e) {
      if (!alive()) return;
      var search = mount.querySelector("input");
      if (e.key === "/" && document.activeElement !== search) {
        e.preventDefault();
        search.focus();
      } else if (e.key === "Escape" && document.activeElement === search) {
        search.value = "";
        state.query = "";
        refresh();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
  }

  function init() {
    var mount = document.querySelector(".rs-packages[data-distro]");
    if (!mount || mount.dataset.rsReady === "1") return;
    mount.dataset.rsReady = "1";

    var distro = mount.dataset.distro;
    mount.innerHTML = "<p>Loading packages…</p>";

    fetch("data/" + distro + ".json")
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (payload) { Table(mount, payload); })
      .catch(function (error) {
        mount.innerHTML =
          '<div class="admonition failure">' +
            '<p class="admonition-title">Could not load the package list</p>' +
            "<p>The request failed with " + escapeHtml(error.message) +
            ". Browse the channel directly at " +
            '<a href="https://prefix.dev/channels/robostack-' + escapeHtml(distro) +
            '">prefix.dev</a>.</p></div>';
      });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init); // eslint-disable-line no-undef
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
