# Getting Started

RoboStack is a bundling of ROS for Linux, macOS and Windows using the [Conda package manager](https://docs.conda.io/en/latest/), based on top of [conda-forge](https://conda-forge.org/).
We have also extended support to the [Pixi](https://pixi.sh/latest/) package manager, which builds upon the foundations of, and maintains compatability with the Conda ecosystem. [Here](https://pixi.sh/dev/switching_from/conda/) is a comparison of how Pixi works when compared to Conda/Mamba.

You can install Robostack using either Micromamba or Pixi. We recommend using Pixi for any new installations.
Note that the instructions for Conda and Micromamba are virtually identical apart from the installation.

=== "Micromamba"
    ## Install Micromamba
    ```bash
    "${SHELL}" <(curl -L micro.mamba.pm/install.sh)
    ```

    For details, see the official [Micromamba Installation](https://mamba.readthedocs.io/en/latest/installation/micromamba-installation.html#automatic-install) instructions.

    By default, the installer will set up `conda-forge`, the prefix location at `~/micromamba`, and initialise shell variables in your `~/.bashrc`. To undo the changes to your `~/.bashrc`, run:
    ```bash
    micromamba shell deinit
    ```

    Once installed, you can update micromamba with:
    ```bash
    micromamba self-update
    ```

    !!! important "Do not install ROS packages in the `base` environment"
        Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the `ros_env`, they should only be installed in base.

    !!! important "Do not source the system ROS environment"
        When there is an installation available of ROS on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

    ## Installing ROS
    !!! note
        There are different channels depending on the version of ROS that you wish to install, to add these channels and install your desired version, you can run the following:
    === "ROS 1 Noetic"
        ```bash
        # Create a ros-noetic desktop environment
        micromamba create -n ros_env -c conda-forge -c robostack-noetic ros-noetic-desktop
        ```
    === "ROS 2 Humble"
        ```bash
        # Create a ros-humble desktop environment
        micromamba create -n ros_env -c conda-forge -c robostack-humble ros-humble-desktop
        ```
    === "ROS 2 Jazzy"
        ```bash
        # Create a ros-jazzy desktop environment
        micromamba create -n ros_env -c conda-forge -c robostack-jazzy ros-jazzy-desktop
        ```

    === "ROS 2 Kilted"
        ```bash
        # Create a ros-kilted desktop environment
        micromamba create -n ros_env -c conda-forge -c robostack-kilted ros-kilted-desktop
        ```

    ```bash
    # Activate the environment
    micromamba activate ros_env
    ```

    ## Installing tools for local development
    ```bash title="Default tools to help with local development of ROS packages"
    micromamba activate ros_env
    micromamba install -c conda-forge compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools rosdep
    ```

    !!! tip "Developing on Windows"
        - Windows users also need Visual Studio 2022 with C++ support
        - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170)


=== "Conda"
    ## Install conda
    To get started, you'll need a base conda installation. We recommend using the [Miniforge](https://github.com/conda-forge/miniforge) installer.

    On Debian- and RPM-based distributions, you can also use the [Debian and RPM repository for miniconda](https://docs.conda.io/projects/conda/en/stable/user-guide/install/rpm-debian.html). To source the base environment:
    ```bash
    source /opt/conda/etc/profile.d/conda.sh
    ```

    !!! warning "Avoid using the `defaults` channel"
        The packages from the `defaults` channel (https://www.anaconda.com), set up by Anaconda and Miniconda, are subject to the [Anaconda Terms of Service](https://www.anaconda.com/legal/terms/terms-of-service). See [Conda Package Repository and Channels](https://conda.org/blog/2024-08-14-conda-ecosystem-explained/#conda-package-repository-and-channels) for details.

        To avoid accidental violation of the Anaconda ToS, remove the `defaults` channel:
        ```bash
        conda config --env --remove channels defaults
        ```

    !!! important "Do not install ROS packages in the `base` environment"
        Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the `ros_env`, they should only be installed in base.

    !!! important "Do not source the system ROS environment"
        When there is an installation available of ROS on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

    ## Installing ROS
    !!! note
        There are different channels depending on the version of ROS that you wish to install, to add these channels and install your desired version, you can run the following:
    === "ROS 1 Noetic"
        ```bash
        # Create a ros-noetic desktop environment
        conda create -n ros_env -c conda-forge -c robostack-noetic ros-noetic-desktop
        ```
    === "ROS 2 Humble"
        ```bash
        # Create a ros-humble desktop environment
        conda create -n ros_env -c conda-forge -c robostack-humble ros-humble-desktop
        ```
    === "ROS 2 Jazzy"
        ```bash
        # Create a ros-jazzy desktop environment
        conda create -n ros_env -c conda-forge -c robostack-jazzy ros-jazzy-desktop
        ```

    === "ROS 2 Kilted"
        ```bash
        # Create a ros-kilted desktop environment
        conda create -n ros_env -c conda-forge -c robostack-kilted ros-kilted-desktop
        ```

    ```bash
    # Activate the environment
    conda activate ros_env
    ```

    ## Installing tools for local development
    ```bash title="Default tools to help with local development of ROS packages"
    conda activate ros_env
    conda install -c conda-forge compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools rosdep
    ```

    !!! tip "Developing on Windows"
        - Windows users also need Visual Studio 2022 with C++ support
        - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170)


=== "Pixi"
    ## Install Pixi
    To install `pixi` you can run the following command in your terminal:

    === "Linux & macOS"
        ```bash
        curl -fsSL https://pixi.sh/install.sh | bash
        ```

        The above invocation will automatically download the latest version of `pixi`, extract it, and move the `pixi` binary to `~/.pixi/bin`.
        If this directory does not already exist, the script will create it.

        The script will also update your `~/.bashrc` to include `~/.pixi/bin` in your PATH, allowing you to invoke the `pixi` command from anywhere.

    === "Windows"
        ```bash
        winget install prefix-dev.pixi
        ```

        The above invocation will automatically download the latest version of `pixi`, extract it, and move the `pixi` binary to `LocalAppData/pixi/bin`.
        If this directory does not already exist, the script will create it.

        The command will also automatically add `LocalAppData/pixi/bin` to your path allowing you to invoke `pixi` from anywhere.

        !!! tip "Prerequisites"
            - Windows users need Visual Studio 2022 with C++ support
            - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170)


    !!! note
        After installation, you may need to restart your terminal for the `pixi` command to be available.

    !!! important "Do not source the system ROS environment"
        When there is an installation available of ROS on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.


    ## Install RoboStack using Pixi

    Initialize a new project and navigate to the project directory.
    ```shell
    pixi init robostack
    cd robostack
    ```

    Open the newly created pixi.toml in your favourite text editor and paste the below configuration into the file (overwriting the configuration created by `pixi init`):
    ```toml title="pixi.toml"
    [project]
    name = "robostack"
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
    ```

## Testing installation
After installation, you should test if you are able to run `rviz`/`rviz2` and other ROS tools.

!!! note "Reminder"
    The ROS environment activation is included automatically. There is no need to add a `source` command in the `~/.bashrc`

=== "Micromamba"
    **ROS 1**
    ```bash title="First terminal"
    micromamba activate ros_env
    roscore
    ```

    ```bash title="Second terminal"
    micromamba activate ros_env
    rviz
    ```

    **ROS 2**
    !!! note
        ROS 2 has the benefit of not needing a `roscore`, so only a single terminal is needed to run a tool.

    ```bash title="Terminal"
    micromamba activate ros_env
    rviz2
    ```

    If you run into any issues or for any frequently asked questions, you can check the [FAQ page](https://robostack.github.io/FAQ.html)

    ## Updating
    Updating all packages in your environment is as easy as:

    ```bash
    micromamba update --all
    ```

    ## Deactivating
    The (de)activation of the ros workspace goes in together with the conda environment. So running the corresponding (de)activation command will also (un)source the ros environment.

    ```bash
    micromamba deactivate
    ```

=== "Conda"
    **ROS 1**
    ```bash title="First terminal"
    conda activate ros_env
    roscore
    ```

    ```bash title="Second terminal"
    conda activate ros_env
    rviz
    ```

    **ROS 2**
    !!! note
        ROS 2 has the benefit of not needing a `roscore`, so only a single terminal is needed to run a tool.

    ```bash title="Terminal"
    conda activate ros_env
    rviz2
    ```

    If you run into any issues or for any frequently asked questions, you can check the [FAQ page](https://robostack.github.io/FAQ.html)

    ## Updating
    Updating all packages in your environment is as easy as:

    ```bash
    conda update --all
    ```

    ## Deactivating
    The (de)activation of the ros workspace goes in together with the conda environment. So running the corresponding (de)activation command will also (un)source the ros environment.

    ```bash
    conda deactivate
    ```

=== "Pixi"

    !!! note
        Remember if trying to activate the pixi from outside the project directory, provide the path to the pixi.toml with `--manifest-path`.

    **ROS 1**
    ```bash title="First terminal"
    cd robostack
    pixi run -e noetic roscore
    ```
    alternatively,
    ```bash title="First terminal"
    cd robostack
    pixi shell -e noetic
    roscore
    ```

    ```bash title="Second terminal"
    cd robostack
    pixi run -e noetic rviz
    ```
    alternatively,
    ```bash title="Second terminal"
    cd robostack
    pixi shell -e noetic
    rviz
    ```

    **ROS 2**
    ```bash title="Terminal"
    cd robostack
    pixi run -e humble rviz2 # OR jazzy, kilted
    ```
    alternatively,
    ```bash title="Terminal"
    cd robostack
    pixi shell -e humble  # OR jazzy, kilted
    rviz2
    ```

    If you run into any issues or for any frequently asked questions, you can check the [FAQ page](https://robostack.github.io/FAQ.html)

    ## Updating
    Updating all packages in your environment is as easy as:

    ```bash
    cd robostack
    pixi update
    ```

    ## Deactivating
    You can just exit the current shell to deactivate the current environment.
    ```bash
    exit  # or press Ctrl+D
    ```

## Why ROS and Conda?
We tightly couple ROS with Conda, a cross-platform, language-agnostic package manager. We provide ROS binaries for Linux, macOS (Intel and Apple Silicon), Windows and ARM (Linux). Installing other recent packages via conda-forge side-by-side works easily, e.g. you can install TensorFlow/PyTorch in the same environment as ROS Noetic without any issues. As no system libraries are used, you can also easily install ROS Noetic on any recent Linux Distribution - including older versions of Ubuntu. As the packages are pre-built, it saves you from compiling from source, which is especially helpful on macOS and Windows. No root access is required, all packages live in your home directory. We have recently written up a paper and blog post with more information.

## Attribution
If you use RoboStack in your academic work, please reference the following paper:
```bibtex
@article{FischerRAM2021,
    title={A RoboStack Tutorial: Using the Robot Operating System Alongside the Conda and Jupyter Data Science Ecosystems},
    author={Tobias Fischer and Wolf Vollprecht and Silvio Traversaro and Sean Yen and Carlos Herrero and Michael Milford},
    journal={IEEE Robotics and Automation Magazine},
    year={2021},
    doi={10.1109/MRA.2021.3128367},
}
```
