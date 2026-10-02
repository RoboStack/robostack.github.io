import runpy
from pathlib import Path

import pytest

promotion = runpy.run_path(str(Path(__file__).with_name("copy-to-distro-specific-channel.py")))
belongs_to_distro = promotion["belongs_to_distro"]


@pytest.mark.parametrize(
    ("dependencies", "expected"),
    [
        (["ros2-distro-mutex 0.10.* humble_*"], True),
        (
            [
                "ros2-distro-mutex >=0.10.0,<0.11.0a0",
                "ros2-distro-mutex 0.10.* humble_*",
            ],
            True,
        ),
        (["ros2-distro-mutex 0.10.* jazzy_*"], False),
        (["ros2-distro-mutex >=0.10.0,<0.11.0a0"], False),
        (["ros2-distro-mutex 0.10.* *"], False),
        (["ros2-distro-mutex 0.10.* humble-other_*"], False),
        (["ros2-rcl 16.*"], False),
        ([], False),
    ],
)
def test_renamed_package_requires_distro_build_pin(dependencies: list[str], expected: bool) -> None:
    artifact = {"name": "ros2-rclcpp", "depends": dependencies}
    assert belongs_to_distro(artifact, "humble") is expected


def test_legacy_packages_and_shims_remain_distro_specific() -> None:
    shim = {"name": "ros-humble-rclcpp", "depends": ["ros2-rclcpp ==16.0.19"]}
    assert belongs_to_distro(shim, "humble")
    assert not belongs_to_distro(shim, "jazzy")
    assert belongs_to_distro({"name": "ros-noetic-roscpp"}, "noetic")
    assert not belongs_to_distro({"name": "ros-humble-other-rclcpp"}, "hum")


@pytest.mark.parametrize(
    ("name", "build", "distro", "expected"),
    [
        ("ros2-distro-mutex", "humble_20", "humble", True),
        ("ros2-distro-mutex", "humble", "humble", True),
        ("ros2-distro-mutex", "jazzy_20", "humble", False),
        ("ros2-distro-mutex", "not-humble_20", "humble", False),
        ("ros-distro-mutex", "noetic_1", "noetic", True),
    ],
)
def test_mutex_build_identifies_its_distro(
    name: str, build: str, distro: str, expected: bool
) -> None:
    assert belongs_to_distro({"name": name, "build": build}, distro) is expected
