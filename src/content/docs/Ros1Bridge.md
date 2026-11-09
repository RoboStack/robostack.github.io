---
title: Bridging ROS 1 and ROS 2
slug: Ros1Bridge
description: Connect ROS 1 Noetic and ROS 2 Humble nodes with ros1_bridge, built from source in a pixi project.
---

[`ros1_bridge`](https://github.com/ros2/ros1_bridge) passes topics and services between ROS 1 and ROS 2, for example between a robot running ROS 1 Noetic and a computer running ROS 2 Humble. It isn't packaged, but builds from source in a pixi project. Tested on Linux (aarch64) and macOS (Apple silicon).

:::caution[Keep Noetic and Humble in separate environments]
Both distributions have packages with the same names (`std_msgs`, `rosgraph_msgs`, ...). In one environment, their Python modules and CMake files overwrite each other, which breaks `roscore` and building the bridge.
:::

## Set up

One pixi project with two environments, `noetic` and `humble`. The `humble` environment uses `noetic` as an underlay, like sourcing `/opt/ros/noetic` before `/opt/ros/humble` on Ubuntu.

`pixi.toml`:

```toml
[workspace]
name = "ros1-bridge"
channels = ["https://prefix.dev/robostack-noetic", "https://prefix.dev/robostack-humble", "https://prefix.dev/conda-forge"]
platforms = ["linux-64", "linux-aarch64", { platform = "osx-arm64", macos = "14.0" }]

[feature.noetic.dependencies]
ros-noetic-ros-base = "*"
ros-noetic-rospy-tutorials = "*"

[feature.humble.dependencies]
ros-humble-ros-base = "*"
ros-humble-demo-nodes-cpp = "*"
ros-humble-rmw-implementation-cmake = "*"
compilers = "*"
cmake = "*"
ninja = "*"
pkg-config = "*"
colcon-common-extensions = "*"

[feature.humble.activation]
scripts = ["noetic-underlay.sh"]

[environments]
noetic = { features = ["noetic"], no-default-feature = true }
humble = { features = ["humble"], no-default-feature = true }
```

`noetic-underlay.sh`, next to it:

```sh
NOETIC="$PIXI_PROJECT_ROOT/.pixi/envs/noetic"
export ROS1_INSTALL_PATH="$NOETIC"
export PKG_CONFIG_PATH="${PKG_CONFIG_PATH:+$PKG_CONFIG_PATH:}$NOETIC/lib/pkgconfig"
export ROS_PACKAGE_PATH="$NOETIC/share"
export ROS_MASTER_URI="${ROS_MASTER_URI:-http://localhost:11311}"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}$NOETIC/lib/python3.12/site-packages"
export CMAKE_PREFIX_PATH="${CMAKE_PREFIX_PATH:+$CMAKE_PREFIX_PATH:}$CONDA_PREFIX:$NOETIC"
```

## Build

```sh
pixi install -a
git clone https://github.com/ros2/ros1_bridge.git ws/src/ros1_bridge
cd ws
pixi run -e humble colcon build --cmake-args -G Ninja -DBUILD_TESTING=OFF -DCMAKE_BUILD_TYPE=Release -DPython3_FIND_VIRTUALENV=ONLY \
  -DCMAKE_CXX_STANDARD=23 -DCMAKE_INSTALL_RPATH_USE_LINK_PATH=ON
```

`CMAKE_INSTALL_RPATH_USE_LINK_PATH` lets the bridge find the ROS 1 libraries without `LD_LIBRARY_PATH`, and C++23 is needed for clang on macOS.

The bridge supports the message types present in both environments; `ros-base` gives about 130 (`std_msgs`, `geometry_msgs`, `sensor_msgs`, `nav_msgs`, ...). For more, add the message packages to both features (e.g. `ros-noetic-tf2-msgs` and `ros-humble-tf2-msgs`) and build again.

## Run

Each command in its own terminal, in `ws`:

```sh
pixi run -e noetic roscore
pixi run -e humble bash -c "source install/setup.bash && ros2 run ros1_bridge dynamic_bridge --bridge-all-topics"
pixi run -e noetic rosrun rospy_tutorials talker
pixi run -e humble ros2 run demo_nodes_cpp listener
```

The listener prints the messages of the ROS 1 talker. To use an existing ROS 1 master, e.g. on a robot, set `ROS_MASTER_URI` instead of running `roscore`.

On macOS, set `ROS_HOSTNAME=localhost` for the ROS 1 nodes when everything runs on one machine, and `ROS_LOCALHOST_ONLY=1` if ROS 2 nodes on the same machine don't see each other.
