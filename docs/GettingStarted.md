# Getting Started
RoboStack is a bundling of ROS for Linux, Mac and Windows using the CondaForge package manager.

## Installation
To get started with conda (or mamba) as package managers, you need to have a base conda installation. Please do _not_ use the Anaconda installer, but rather start with [`miniforge` / `mambaforge`](https://github.com/conda-forge/miniforge) or [`miniconda`](https://docs.conda.io/en/latest/miniconda.html), which are much more "minimal" installers. These installers will create a "base" environment that contains the package managers conda (and mamba if you go with `mambaforge`). After this installation is done, you can move on to the next steps.

> Note: Make sure to _not_ install the ROS packages in your base environment as this leads to issues down the track. On the other hand, conda and mamba must not be installed in the ros_galactic, they should only be installed in base. Also do not source the system ROS environment, as the `PYTHONPATH` set in the setup script conflicts with the conda environment.

```bash
# if you don't have mamba yet, install it first:
conda install mamba

# now create a new environment
mamba create -n ros_env python=3.8
conda activate ros_env
# this adds the conda-forge channel to the new created environment configuration 
conda config --env --add channels conda-forge
# and the robostack channel
conda config --env --add channels robostack-experimental
# it's very much advised to use strict channel priority
conda config --env --set channel_priority strict

# Install the version of ROS you are interested in:
mamba install ros-galactic-desktop

# optionally, install some compiler packages if you want to e.g. build packages in a colcon_ws:
mamba install compilers cmake pkg-config make ninja colcon-common-extensions

# on Windows, install Visual Studio 2017 or 2019 with C++ support 
# see https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-160

# on Windows, install the Visual Studio command prompt via Conda:
mamba install vs2019_win-64

# note that in this case, you should also install the necessary dependencies with conda/mamba, if possible

# reload environment to activate required scripts before running anything
# on Windows, please restart the Anaconda Prompt / Command Prompt!
conda deactivate
conda activate ros_env

# if you want to use rosdep, also do:
mamba install rosdep
rosdep init  # note: do not use sudo!
rosdep update
```



