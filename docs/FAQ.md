
### What to do in case of "Multiple packages found with the same name"
 When running `catkin` or `catkin_make` I get errors that "Multiple packages found with the same name", e.g.
```
/Users/me/miniconda3/envs/robostackenv/share/catkin/cmake/em/order_packages.cmake.em:23: error: <class 'RuntimeError'>: Multiple packages found with the same name "catkin":
- pkgs/ros-noetic-catkin-0.8.10-py38hb43b470_10/share/catkin
- share/catkin
```
You probably installed conda or mamba into your `robostackenv`. However, conda and mamba should only be installed in your `base` environment. Try setting up a new environment without `conda` and `mamba` installed into that environment.

### What to do if packages could not be found?
When trying to build packages, you get CMake errors that packages could not be found, such as
```
CMake Error at /Users/me/miniconda3/envs/robostackenv/share/catkin/cmake/catkinConfig.cmake:83 (find_package):
  Could not find a package configuration file provided by "std_msgs" with any
  of the following names:

    std_msgsConfig.cmake
    std_msgs-config.cmake
```
First, make sure that the package is installed; in the example case it would be `mamba install ros-noetic-std-msgs`. You can use `rosdep` to install dependencies. Second, make sure that your `CMAKE_PREFIX_PATH` points to your `robostackenv`, in the example case you could achieve this by `export CMAKE_PREFIX_PATH=/Users/me/miniconda3/envs/robostackenv/`. This might happen if `CMAKE_PREFIX_PATH` is not empty when you activate your `robostackenv`.

### Why does autocomplete not work in zsh environments?
You will need to install https://github.com/conda-incubator/conda-zsh-completion

### How to fix RLException error on MacOS (M Chip & Intel CPUs) ?
If you run into "RLException: Unable to contact my own server" error on MacOS here are the instructions that you need to follow in order to resolve that issue:

- Set up ROS_MASTER URI at 127.0.0.1 on port 11311 : `export ROS_MASTER_URI=http://127.0.0.1:11311`
- Set up ROS_HOSTNAME : `export ROS_HOSTNAME=127.0.0.1`
- Open the hosts file with a text editor like nano: `sudo nano /etc/hosts`
- Add the following lines if they are not already present: `127.0.0.1   macbookpro` and `127.0.0.1   localhost`
- Then save the file and restart your terminal.


### Can I use RoboStack in a non-conda virtual environment?
RoboStack is based on conda-forge and will not work without conda. However, check out [rospypi](https://github.com/rospypi/simple) which can run in a pure Python virtualenv. rospypi supports tf2 and other binary packages.

### What to do if I have Python-related problems during the build of custom messages?

It is possible that if you are having problems in finding the Python installed in your environment, and for some reason the Python of your system is found instead. To workaround these kind of problems, a trick is to explicitly specify which Python to use to CMake, via: 
~~~
--cmake-args "-DPython_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_EXECUTABLE=$CONDA_PREFIX/bin/python -DPYTHON_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_FIND_STRATEGY=LOCATION -DPython_FIND_STRATEGY=LOCATION"
~~~
if you are using colcon or:
~~~
-DPython_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_EXECUTABLE=$CONDA_PREFIX/bin/python -DPYTHON_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_FIND_STRATEGY=LOCATION -DPython_FIND_STRATEGY=LOCATION
~~~
if you are invoking CMake directly. If you are on Windows' Command Prompt, substitute `$CONDA_PREFIX/bin/python` with `%CONDA_PREFIX%\python.exe`.

If you still encounter issues, you will also need to set `cmake_minimum_required` to at least version 3.15: `cmake_minimum_required(VERSION 3.15)` in your `CMakeLists.txt`. In order to remain compatible with older cmake versions, you can exploit the `policy_max` feature as such: `cmake_minimum_required(VERSION 3.5...3.15)`. Note that this is required because of [CMP0094](https://cmake.org/cmake/help/latest/policy/CMP0094.html) (see also https://github.com/RoboStack/ros-humble/issues/162).

### What to do if my conda environment C++ compiler is unable to find GL/gl.h?

For OpenGL and related packages, conda-forge relies on the system version for loading libraries at run-time. But when compiling C/C++ code that includes those headers, it expects the cdt packages to be installed.

On an x86-64 Linux platform you can install these with:
~~~
mamba install -c conda-forge mesa-libgl-devel-cos7-x86_64 mesa-dri-drivers-cos7-x86_64 libselinux-cos7-x86_64 libxxf86vm-cos7-x86_64
~~~
