
### When running `catkin` or `catkin_make` 
 When running `catkin` or `catkin_make` I get errors that "Multiple packages found with the same name", e.g.
```
/Users/me/miniconda3/envs/robostackenv/share/catkin/cmake/em/order_packages.cmake.em:23: error: <class 'RuntimeError'>: Multiple packages found with the same name "catkin":
- pkgs/ros-noetic-catkin-0.8.10-py38hb43b470_10/share/catkin
- share/catkin
```
You probably installed conda or mamba into your `robostackenv`. However, conda and mamba should only be installed in your `base` environment. Try setting up a new environment without `conda` and `mamba` installed into that environment.

### When trying to build packages, 
When trying to build packages, you get CMake errors that packages could not be found, such as
```
CMake Error at /Users/me/miniconda3/envs/robostackenv/share/catkin/cmake/catkinConfig.cmake:83 (find_package):
  Could not find a package configuration file provided by "std_msgs" with any
  of the following names:

    std_msgsConfig.cmake
    std_msgs-config.cmake
```
First, make sure that the package is installed; in the example case it would be `mamba install ros-noetic-std-msgs`. You can use `rosdep` to install dependencies. Second, make sure that your `CMAKE_PREFIX_PATH` points to your `robostackenv`, in the example case you could achieve this by `export CMAKE_PREFIX_PATH=/Users/me/miniconda3/envs/robostackenv/`. This might happen if `CMAKE_PREFIX_PATH` is not empty when you activate your `robostackenv`.

### Can I use RoboStack in a non-conda virtual environment?
RoboStack is based on conda-forge and will not work without conda. However, check out [rospypi](https://github.com/rospypi/simple) which can run in a pure Python virtualenv. rospypi supports tf2 and other binary packages.

### What to do if I have Python-related problems during the build of custom messages?

It is possible that if you are having problems in finding the Python installed in your environment, and for some reason the Python of your system is found instead. To workaround these kind of problems, a trick is to explicitly specify which Python to use to CMake, via: 
~~~
--cmake-args "-DPython_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_EXECUTABLE=$CONDA_PREFIX/bin/python -DPYTHON_EXECUTABLE=$CONDA_PREFIX/bin/python"
~~~
if you are using colcon or:
~~~
-DPython_EXECUTABLE=$CONDA_PREFIX/bin/python -DPython3_EXECUTABLE=$CONDA_PREFIX/bin/python -DPYTHON_EXECUTABLE=$CONDA_PREFIX/bin/python
~~~
if you are invoking CMake directly. If you are on Windows' Command Prompt, substitute `$CONDA_PREFIX/bin/python` with `%CONDA_PREFIX%\python.exe`.
