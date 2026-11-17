"""Regression tests for package availability across mutex builds."""

from compare_pkg_completeness import collect_mutexes, mutex_matcher


def test_matches_version_and_build_across_platforms() -> None:
    name, records = collect_mutexes(
        {
            "linux-64": [
                {"name": "ros-distro-mutex", "version": "0.6.0", "build": "noetic_0"},
                {"name": "ros-distro-mutex", "version": "0.7.0", "build": "noetic_2"},
            ],
            "osx-arm64": [
                {"name": "ros-distro-mutex", "version": "0.6.0", "build": "noetic_1"},
            ],
        }
    )
    match = mutex_matcher(records)
    assert name == "ros-distro-mutex"
    assert match(f"{name} 0.6.* noetic_0") == {"0.6.0"}
    assert match(f"{name} 0.6.* noetic_1") == {"0.6.0"}
    assert match(f"{name} >=0.6.0,<0.8.0a0") == {"0.6.0", "0.7.0"}
    assert match(f"{name} 0.6.* noetic_2") == set()
