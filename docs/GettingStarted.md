# Getting Started
RoboStack is a bundling of ROS for Linux, Mac and Windows using the [conda package manager](https://docs.conda.io/en/latest/), based on top of [conda-forge](https://conda-forge.org/).

## Installation mamba
To get started with conda (or mamba) as package managers, you need to have a base conda installation. Please do _not_ use the Anaconda installer, but rather start with [`miniforge` / `mambaforge`](https://github.com/conda-forge/miniforge), which are much more "minimal" installers (we recommend `mambaforge`). These installers will create a "base" environment that contains the package managers conda (and mamba if you go with `mambaforge`). After this installation is done, you can move on to the next steps.

When you already have a conda installation you can install mamba with:
```bash
conda install mamba -c conda-forge
```

!!! warning "Do not install ROS packages in the `base` environment"

    Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the `ros_env`, they should only be installed in base. 
    
!!! warning "Do not source the system ROS environment"
    When there is an installation available of ros on the system, in non-conda environments, there will be interference with the environments. As the `PYTHONPATH` set in the setup script conflicts with the conda environment.

!!! warning "PowerShell is not supported"

    At the moment on Windows only the Command Prompt terminal is supported, while Powershell is not supported.
 
## Installation ros
=== "Mamba"

    ```bash title="Prepare an environment to use the correct channels"
    mamba create -n ros_env
    mamba activate ros_env

    # this adds the conda-forge channel to the new created environment configuration 
    conda config --env --add channels conda-forge
    # and the robostack channel
    conda config --env --add channels robostack-staging
    # remove the defaults channel just in case, this might return an error if it is not in the list which is ok
    conda config --env --remove channels defaults
    ```


    ```bash title="Install ROS1 or ROS2"
    # Install ros-noetic into the environment (ROS1)
    mamba install ros-noetic-desktop

    # Install ros-humble into the environment (ROS2)
    mamba install ros-humble-desktop
    ```

    ```bash title="Reactivate the environment to initialize the ros env"
    mamba deactivate
    mamba activate ros_env
    ```

=== "Micromamba"

    When you only have micromamba available use the following commands: 

    ```bash title="ROS1 Noetic"
    # Create a ros-noetic desktop environment
    micromamba create -n ros_env -c conda-forge -c robostack-staging ros-noetic-desktop

    # Activate the environment
    micromamba activate ros_env
    ```

    ```bash title="ROS2 Humble"
    # Create a ros-humble desktop environment
    micromamba create -n ros_env -c conda-forge -c robostack-staging ros-humble-desktop

    # Activate the environment
    micromamba activate ros_env
    ```

## Installation tools for local development
=== "Mamba"

    ```bash title="Default tools to help with local development of ROS packages"
    mamba install compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools
    ```

    ```bash title="Additional dependencies for developing on windows"
    # Install Visual Studio 2017, 2019 or 2022 with C++ support 
    # see https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160

    # Install the Visual Studio command prompt - if you use Visual Studio 2019:
    mamba install vs2019_win-64
    
    # Install the Visual Studio command prompt - if you use Visual Studio 2022:
    mamba install vs2022_win-64
    ```

=== "Micromamba"

    ```bash title="Default tools to help with local development of ROS packages"
    micromamba install -c conda-forge compilers cmake pkg-config make ninja colcon-common-extensions
    ```

    ```bash title="Additional dependencies for developing on windows"
    # Install Visual Studio 2017 or 2019 with C++ support 
    # see https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160

    # Install the Visual Studio command prompt - if you use Visual Studio 2019:
    micromamba install vs2019_win-64
    
    # Install the Visual Studio command prompt - if you use Visual Studio 2022:
    micromamba install vs2022_win-64
    ```


## Testing installation
After installation you are able to run `rviz` and other ros tools.

In the conda environment activation is the ROS activation included. There is no need to add a `source` command in the `~/.bashrc`

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

## Why ROS and Conda?
We tightly couple ROS with Conda, a cross-platform, language-agnostic package manager. We provide ROS binaries for Linux, macOS (Intel and Apple Silicon), Windows and ARM (Linux). Installing other recent packages via conda-forge side-by-side works easily, e.g. you can install TensorFlow/PyTorch in the same environment as ROS Noetic without any issues. As no system libraries are used, you can also easily install ROS Noetic on any recent Linux Distribution - including older versions of Ubuntu. As the packages are pre-built, it saves you from compiling from source, which is especially helpful on macOS and Windows. No root access is required, all packages live in your home directory. We have recently written up a paper and blog post with more information.

## Attribution
If you use RoboStack in your academic work, please refer to the following paper:
```bibtex
@article{FischerRAM2021,
    title={A RoboStack Tutorial: Using the Robot Operating System Alongside the Conda and Jupyter Data Science Ecosystems},
    author={Tobias Fischer and Wolf Vollprecht and Silvio Traversaro and Sean Yen and Carlos Herrero and Michael Milford},
    journal={IEEE Robotics and Automation Magazine},
    year={2021},
    doi={10.1109/MRA.2021.3128367},
}
```
