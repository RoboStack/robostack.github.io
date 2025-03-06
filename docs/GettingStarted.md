# Getting Started

RoboStack is a bundling of ROS for Linux, macOS and Windows using the [Conda package manager](https://docs.conda.io/en/latest/), based on top of [conda-forge](https://conda-forge.org/).
We have also extended support to the [Pixi](https://pixi.sh/latest/) package manager, which builds upon the foundations of, and maintains compatability with the Conda ecosystem. [Here](https://pixi.sh/dev/switching_from/conda/) is a comparison of how Pixi works when compared to Conda/Mamba.

You can install Robostack using either Mamba or Pixi. We recommend using Pixi for any new installations.
=== "Mamba"
    ## Install Mamba
    To get started, you'll need a base conda installation. We recommend using the [`miniforge`](https://github.com/conda-forge/miniforge) installer.

    To get started with conda (or mamba) as package managers, you need to have a base conda installation. Please do _not_ use the Anaconda installer, but rather start with [`miniforge`](https://github.com/conda-forge/miniforge) that is much more "minimal" installer. This installer will create a "base" environment that contains the package managers conda and mamba. After this installation is done, you can move on to the next steps.

    When you already have a conda installation you can install mamba with:
    ```bash
    conda install mamba -c conda-forge
    ```

    !!! warning "Do not install ROS packages in the `base` environment"

        Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the `ros_env`, they should only be installed in base. 
        
    !!! warning "Do not source the system ROS environment"
        When there is an installation available of ros on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

    !!! warning "PowerShell is not supported"

        On Windows, Powershell is not supported, only the Command Prompt terminal is supported.
    
    ## Installing ros
    === "Mamba"

        ```bash title="Prepare an environment to use the correct channels"
        mamba create -n ros_env python=3.11
        mamba activate ros_env

        # this adds the conda-forge channel to the new created environment configuration 
        conda config --env --add channels conda-forge
        # remove the defaults channel just in case, this might return an error if it is not in the list which is ok
        conda config --env --remove channels defaults
        ```
        !!! note
            There are different channels depending on the version of ROS that you wish to install, to add these channels and install your desired version, you can run the following:
        === "ROS1 Noetic"
            ```
            conda config --env --add channels robostack-noetic
            mamba install ros-noetic-desktop
            ```
        === "ROS2 Humble"
            ```
            conda config --env --add channels robostack-humble
            mamba install ros-humble-desktop
            ```
        === "ROS2 Jazzy"
            ```
            conda config --env --add channels robostack-jazzy
            mamba install ros-jazzy-desktop
            ```

    
        ```bash title="Deactivate and reactivate the environment to initialize the configured ROS environment"
        mamba deactivate
        mamba activate ros_env
        ```

    === "Micromamba"

        When you only have micromamba available use the following commands: 

        === "ROS1 Noetic"
            ```
            # Create a ros-noetic desktop environment
            micromamba create -n ros_env -c conda-forge -c robostack-noetic ros-noetic-desktop

            # Activate the environment
            micromamba activate ros_env
            ```
        === "ROS2 Humble"
            ```
            # Create a ros-humble desktop environment
            micromamba create -n ros_env -c conda-forge -c robostack-humble ros-humble-desktop

            # Activate the environment
            micromamba activate ros_env
            ```
        === "ROS2 Jazzy"
            ```
            # Create a ros-jazzy desktop environment
            micromamba create -n ros_env -c conda-forge -c robostack-jazzy ros-jazzy-desktop

            # Activate the environment
            micromamba activate ros_env
            ```


    ## Installing tools for local development
    === "Mamba"

        ```bash title="Default tools to help with local development of ROS packages"
        mamba install compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools rosdep
        ```

    === "Micromamba"

        ```bash title="Default tools to help with local development of ROS packages"
        micromamba install -c conda-forge compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools rosdep
        ```

    !!! tip "Developing on Windows"
        - Windows users also need Visual Studio (2019 or 2022) with C++ support
        - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160)
        
        If you use Visual Studio 2022, you must also install the command line tool (pre-included included for VS2019):
        ```
        mamba install vs2022_win-64
        ```

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

        !!! warning "PowerShell is not supported"
            On Windows, Powershell is not supported, only the Command Prompt terminal is supported.

        !!! tip "Prerequisites"
            - Windows users need Visual Studio (2019 or 2022) with C++ support
            - You can download them here: [https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160](https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160)
            - If you wish to use VS2022, you also need to uncomment the indicated line in the below pixi.toml file.


    !!! note
        After installation, you may need to restart your terminal for the `pixi` command to be available.
    
    !!! warning "Do not source the system ROS environment"
        When there is an installation available of ROS on the system, in non-conda environments, there will be interference with the environments as the `PYTHONPATH` set in the setup script conflicts with the conda environment.


    ## Install RoboStack using Pixi

    Initialize a new project and navigate to the project directory.
    ```shell
    pixi init robostack
    cd robostack
    ```

    Open the newly created pixi.toml in your favourite text editor and paste the below configuration into the file (overwriting the configuration created by `pixi init`):
    ``` bash title="pixi.toml"
    [project]
    name = "robostack"
    version = "0.1.0"
    description = "Development environment for RoboStack ROS packages"
    authors = ["Your Name <your.email@example.com>"]
    channels = ["https://fast.prefix.dev/conda-forge"]
    platforms = ["linux-64", "win-64", "osx-64", "osx-arm64", "linux-aarch64"]

    [target.win-64.dependencies]
    # vs2022_win-64 = "*"  # Uncomment if using Visual Studio 2022

    [dependencies]
    python = "*"
    compilers = "*"
    cmake = "*"
    pkg-config = "*"
    make = "*"
    ninja = "*"
    libgl-devel = "*"

    [environments]
    noetic = { features = ["noetic"] }
    humble = { features = ["humble"] }
    jazzy = { features = ["jazzy"] }

    # noetic
    [feature.noetic]
    channels = ["https://prefix.dev/robostack-noetic"]

    [feature.noetic.dependencies]
    ros-noetic-desktop = "*"
    catkin_tools = "*"
    rosdep = "*"

    # humble
    [feature.humble]
    channels = ["https://prefix.dev/robostack-humble"]

    [feature.humble.dependencies]
    ros-humble-desktop = "*"
    colcon-common-extensions = "*"
    rosdep = "*"

    # jazzy
    [feature.jazzy]
    channels = ["https://prefix.dev/robostack-jazzy"]

    [feature.jazzy.dependencies]
    ros-jazzy-desktop = "*"
    colcon-common-extensions = "*"
    rosdep = "*"
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
    ```

## Testing installation
After installation, you should test if you are able to run `rviz`/`rviz2` and other ROS tools.

!!! note "Reminder"
    The ROS environment activation is included automatically. There is no need to add a `source` command in the `~/.bashrc`

=== "Mamba"
    === "Mamba"

        **ROS1**
        ```bash title="First terminal"
        mamba activate ros_env
        roscore
        ```

        ```bash title="Second terminal"
        mamba activate ros_env
        rviz
        ```

        **ROS2**
        !!! note

            ROS2 has the benefit of not needing a `roscore`, so only a single terminal is needed to run a tool.

        ```bash title="Terminal"
        mamba activate ros_env
        rviz2
        ```

    === "Micromamba"
        
        **ROS1**
        ```bash title="First terminal"
        micromamba activate ros_env
        roscore
        ```

        ```bash title="Second terminal"
        micromamba activate ros_env
        rviz
        ```

        **ROS2**
        !!! note

            ROS2 has the benefit of not needing a `roscore`, so only a single terminal is needed to run a tool.

        ```bash title="Terminal"
        micromamba activate ros_env
        rviz2
        ```

    If you run into any issues or for any frequently asked questions, you can check the [FAQ page](https://robostack.github.io/FAQ.html)

    ## Updating
    Updating all packages in your environment is as easy as:

    === "Mamba"
        
        ```bash
        mamba update --all
        ```

    === "Micromamba"
        
        ```bash
        micromamba update --all
        ```

    ## Deactivating
    The (de)activation of the ros workspace goes in together with the conda environment. So running the corresponding (de)activation command will also (un)source the ros environment. 

    === "Mamba"
        
        ```bash
        mamba deactivate
        ```

    === "Micromamba"
        
        ```bash
        micromamba deactivate
        ```
=== "Pixi"
    
    !!! note
        Remember that Pixi environments can only be activated from within your project directory.

    **ROS1**
    ```bash title="First terminal"
    cd robostack
    pixi shell -e noetic
    roscore
    ```

    ```bash title="Second terminal"
    cd robostack
    pixi shell -e noetic
    rviz
    ```

    **ROS2**
    ```bash title="Terminal"
    cd robostack
    pixi shell -e humble  # OR jazzy
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
