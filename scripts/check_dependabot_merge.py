"""Allow patch updates and stable minor updates for every dependency in a PR."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

RELEASE = re.compile(r"v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")


def eligible_dependency(dependency: object) -> bool:
    if not isinstance(dependency, dict):
        return False

    previous = dependency.get("prevVersion")
    current = dependency.get("newVersion")
    if not isinstance(previous, str) or not isinstance(current, str):
        return False

    previous_release = RELEASE.fullmatch(previous)
    if previous_release is None or RELEASE.fullmatch(current) is None:
        return False

    update_type = dependency.get("updateType")
    return update_type == "version-update:semver-patch" or (
        update_type == "version-update:semver-minor" and previous_release[1] != "0"
    )


def eligible_update(metadata: str) -> bool:
    try:
        dependencies = json.loads(metadata)
    except json.JSONDecodeError:
        return False

    return (
        isinstance(dependencies, list)
        and bool(dependencies)
        and all(eligible_dependency(dependency) for dependency in dependencies)
    )


def main() -> None:
    eligible = eligible_update(os.environ.get("DEPENDENCIES", ""))
    result = f"eligible={str(eligible).lower()}"
    print(result)
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        output.write(f"{result}\n")


if __name__ == "__main__":
    main()
