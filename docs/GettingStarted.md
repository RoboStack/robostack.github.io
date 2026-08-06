# Getting Started

You can install RoboStack packages using either [Pixi](https://pixi.sh/), [Micromamba](micromamba.md), or [conda](conda.md).
We recommend using **Pixi** for any new installations.

## Install Pixi

To install `pixi` you can run the following command in your terminal:

=== "Linux & macOS"

    ```bash
    curl -fsSL https://pixi.sh/install.sh | bash

    # And restart the terminal
    ```

=== "Windows"
    ```bash
    winget install prefix-dev.pixi

    # And restart the terminal
    ```

    !!! tip "Prerequisites"
        - Windows users need Visual Studio 2022 with C++ support
        - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170)

!!! warning "Do not source to existing `apt` installed ROS environments"
    When there is an installation available of ROS on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

## Setup a workspace

Initialize a new project and navigate to the project directory.

```shell
pixi init ros_ws --channel https://prefix.dev/robostack-lyrical
cd ros_ws
```

??? tip "What did just happen?"

    The `pixi init` command created a new directory called `ros_ws` and initialized a new workspace in it. It also created a `pixi.toml` file which contains the configuration for your workspace.

    The `pixi.toml` looks something like this:

    ```toml
    [workspace]
    name = "ros_ws"
    platforms = ["linux-64"] # Your platform
    channels = ["https://prefix.dev/robostack-lyrical"] # The channel to use for the workspace
    ```

Now you can add the packages you need to your workspace:

```shell
pixi add ros-lyrical-desktop
```

??? tip "What did just happen?"

    This adds the `ros-lyrical-desktop` package to the `pixi.toml` and installs it directly.
    It also created a `pixi.lock` lockfile which contains the exact versions of the packages that were installed.
    Pixi adds dependencies with pinned version specifiers like `>=1.2.3,<2.0.0` which means that the lower bound is set to the version it installed but the upper bound is based on the next major version.
    This is to ensure that you get the latest compatible version of the package the next time you run `pixi update`.

Then test the installation by running:

```bash
pixi run ros2
# OR
pixi run rviz2
```

And try the talker and listener example:

```bash title="First terminal"
pixi run ros2 run demo_nodes_cpp talker
```

```bash title="Second terminal"
pixi run ros2 run demo_nodes_cpp listener
```

??? tip "What did just happen?"

    `pixi run` activates the environment and runs the command you specified.
    You can also use `pixi shell` to open a new shell with the environment activated.

## Developing local ROS packages

To develop ROS packages we'll need to add some development tools to the environment.
You can do this by running:

```bash
pixi add ros-dev-tools
```

Then to try this on a basic ROS package, you can create a new ROS package in the workspace and build it:

```bash
pixi run ros2 pkg create --build-type ament_cmake --node-name my_node my_package
pixi run ros2 pkg create --build-type ament_python --node-name my_python_node my_python_package
```

```bash
pixi run colcon build
```

Add the `install/setup.bash` script to the activation scripts in your `pixi.toml` so that the ROS environment is automatically activated when you enter the workspace environment:

=== "Linux & macOS"

    ```toml title="pixi.toml"
    [target.unix.activation]
    scripts = ["install/setup.bash"]
    ```
=== "Windows"

    ```toml title="pixi.toml"
    [target.win.activation]
    scripts = ["install/setup.bat"]
    ```

After creating and building the new packages you can run the nodes in the packages:

```bash
pixi run ros2 run my_package my_package_node
pixi run ros2 run my_python_package my_python_package_node
```

## Multi ROS distro workspaces

This workspace supports multiple ROS distros in the same workspace on multiple platforms.

You can replace the previous `pixi.toml` or use `pixi init` to create a new workspace and then add the following content to the `pixi.toml` file:

```toml title="pixi.toml"
[workspace]
name = "ros_ws"
description = "Development environment for RoboStack ROS packages"
channels = ["https://prefix.dev/conda-forge"]
platforms = ["linux-64", "win-64", "osx-64", "osx-arm64", "linux-aarch64"]

# This will automatically activate the ros workspace on activation
[target.win.activation]
scripts = ["install/setup.bat"]

[target.unix.activation]
# For activation scripts, we use bash for Unix-like systems
scripts = ["install/setup.bash"]

# To build you can use - `pixi run -e <ros distro> build <Any other temporary args>`
[feature.build.target.win-64.tasks]
build = "colcon build --merge-install --cmake-args -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DPython_FIND_VIRTUALENV=ONLY -DPython3_FIND_VIRTUALENV=ONLY"

[feature.build.target.unix.tasks]
build = "colcon build --symlink-install --cmake-args -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DPython_FIND_VIRTUALENV=ONLY -DPython3_FIND_VIRTUALENV=ONLY"

# Dependencies used by all environments
[dependencies]
python = "*"
# Build tools
compilers = "*"
cmake = "*"
pkg-config = "*"
make = "*"
ninja = "*"
# ROS specific tools
rosdep = "*"
colcon-common-extensions = "*"

[target.linux.dependencies]
libgl-devel = "*"

# Define all the different ROS environments
# Each environment corresponds to a different ROS distribution
# and can be activated using the `pixi run/shell -e <environment>` command.
[environments]
noetic = { features = ["noetic", "build"] }
humble = { features = ["humble", "build"] }
jazzy = { features = ["jazzy", "build"] }
kilted = { features = ["kilted", "build"] }
lyrical = { features = ["lyrical", "build"] }
rolling = { features = ["rolling", "build"] }

### ROS Noetic ####
[feature.noetic]
channels = ["https://prefix.dev/robostack-noetic"]

[feature.noetic.dependencies]
ros-noetic-desktop = "*"
catkin_tools = "*"

### ROS Humble ####
[feature.humble]
channels = ["https://prefix.dev/robostack-humble"]

[feature.humble.dependencies]
ros-humble-desktop = "*"

### ROS Jazzy ####
[feature.jazzy]
channels = ["https://prefix.dev/robostack-jazzy"]

[feature.jazzy.dependencies]
ros-jazzy-desktop = "*"

### ROS Kilted ####
[feature.kilted]
channels = ["https://prefix.dev/robostack-kilted"]

[feature.kilted.dependencies]
ros-kilted-desktop = "*"

### ROS Lyrical ####
[feature.lyrical]
channels = ["https://prefix.dev/robostack-lyrical"]

[feature.lyrical.dependencies]
ros-lyrical-desktop = "*"

### ROS Rolling ####
[feature.rolling]
channels = ["https://prefix.dev/robostack-rolling"]

[feature.rolling.dependencies]
ros-rolling-desktop = "*"
```

```bash
# Save and exit pixi.toml
pixi install
# You can now start an environment with your desired robostack distribution using one of the below commands (either executed from within the project directory or by appending `--manifest-path` and pointing to your project directory):

# ROS noetic
pixi shell -e noetic

# ROS humble
pixi shell -e humble

# ROS jazzy
pixi shell -e jazzy

# ROS kilted
pixi shell -e kilted

# ROS lyrical
pixi shell -e lyrical

# ROS rolling
pixi shell -e rolling
```
