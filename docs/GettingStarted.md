# Getting Started
RoboStack is a bundling of ROS for Linux, Mac and Windows using the [conda package manager](https://docs.conda.io/en/latest/), based on top of [conda-forge](https://conda-forge.org/).

## Installation
To get started the easiest and fastest way is to use the `micromamba` package manager.
Install the `micromamba` package manager using the [micromamba-releases](https://github.com/mamba-org/micromamba-releases). 
=== "Bash"

    ```bash
    curl https://micromamba.pfx.dev/install.sh | bash
    ```
=== "Zsh"

    ```zsh
    curl https://micromamba.pfx.dev/install.sh | zsh
    ```

=== "Windows"

    On Windows, the executable micromamba.exe is installed into `$Env:LocalAppData\micromamba\micromamba.exe`.
    ```cmd
    Invoke-Expression ((Invoke-WebRequest -Uri https://micromamba.pfx.dev/install.ps1).Content)
    ```


!!! warning "Do not install ROS packages in the `base` environment"

    Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the `ros_env`, they should only be installed in base. Also, do not source the system ROS environment, as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

Assuming you installed `micromamba` follow these commands, but it also works for `mamba` and `conda`.

=== "Unix"

    ```bash title="ROS1 Noetic"
    # Create a ros-noetic desktop environment
    micromamba create -n ros1_env -c conda-forge -c robostack-staging ros-noetic-desktop

    # Activate the environment
    micromamba activate ros1_env

    # Install additional tools like compilers for local development
    micromamba install compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools
    ```

    ```bash title="ROS2 Humble"
    # Create a ros-noetic desktop environment
    micromamba create -n ros2_env -c conda-forge -c robostack-staging ros-humble-desktop

    # Activate the environment
    micromamba activate ros2_env

    # Install additional tools like compilers for local development
    micromamba install compilers cmake pkg-config make ninja colcon-common-extensions catkin_tools
    ```

=== "Windows"

    ```bash title="ROS1 Noetic"
    # Create a ros-noetic desktop environment
    micromamba create -n ros1_env -c conda-forge -c robostack-staging ros-noetic-desktop

    # Activate the environment
    micromamba activate ros1_env

    # Install additional tools like compilers for local development
    micromamba install compilers cmake pkg-config make ninja colcon-common-extensions

    # on Windows, install Visual Studio 2017 or 2019 with C++ support 
    # see https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160

    # on Windows, install the Visual Studio command prompt:
    micromamba install vs2019_win-64

    # please restart the Anaconda Prompt / Command Prompt!
    micromamba activate ros1_env
    ```

    ```bash title="ROS2 Humble"
    # Create a ros-noetic desktop environment
    micromamba create -n ros2_env -c conda-forge -c robostack-staging ros-humble-desktop

    # Activate the environment
    micromamba activate ros2_env

    # Install additional tools like compilers for local development
    micromamba install compilers cmake pkg-config make ninja colcon-common-extensions 

    # on Windows, install Visual Studio 2017 or 2019 with C++ support 
    # see https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160

    # on Windows, install the Visual Studio command prompt:
    micromamba install vs2019_win-64
    
    # please restart the Anaconda Prompt / Command Prompt!
    micromamba activate ros2_env
    ```


## Testing installation
After installation you are able to run `rviz` and other ros tools.

In the conda environment activation is the ROS activation included. There is no need to add a `source` command in the `~/.bashrc`

=== "ROS1"
    
    ```bash title="First terminal"
    micromamba activate ros1_env
    roscore
    ```

    ```bash title="Second terminal"
    micromamba activate ros1_env
    rviz
    ```

=== "ROS2"
    
    ```bash
    micromamba activate ros2_env
    rviz2
    ```

## Deactivating
The deactivation of the ros workspace goes in together with the conda environment.
```bash
micromamba deactivate
```
