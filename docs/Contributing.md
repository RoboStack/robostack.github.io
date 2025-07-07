# Contributing

Many thanks for taking the time to read this and for contributing to RoboStack!

This project is in early stages and we are looking for contributors to help it grow.

The developers are on the [`robotics` channel on `prefix.dev`'s discord](https://discord.gg/kKV8ZxyzY4) where we discuss steps forward.

We welcome all kinds of contribution -- code or non-code -- and value them
highly. We pledge to treat everyones contribution fairly and with respect and
we are here to help awesome pull requests over the finish line.

Please note we have a code of conduct, and follow it in all your interactions with the project.

We follow the [NumFOCUS code of conduct](https://numfocus.org/code-of-conduct).


# Adding new packages via pull requests
You can open a pull request that will get build automatically in our CI.

An example can be found [here](https://github.com/RoboStack/ros-humble/pull/257). 

Depending on the distribution, you need to add the package either to a unified `vinca.yaml` file, or to multiple `vinca_*.yaml` files, where the `*` indicates the desired platform (`linux_64`, `linux_aarch64` (for ARM processors), `osx_64` (old Intel Macs), `osx_arm64` (Apple Silicon), or `win`). For the distributions with a unified `vinca.yaml` file, a package can be included or excluded by a given platform using `rattler-build`-style selectors, see https://rattler.build/dev/selectors/ .

Ideally, try to add packages to all of these platforms. The name of the package is accepted both with underscores and dashes as word separators, but it is suggested to type the name of the package exactly as https://index.ros.org knows it.

## Creating a new patch file
Sometimes, it may be required to patch the packages. An example of how to do so can be found in [this PR](https://github.com/RoboStack/ros-noetic/pull/32). Generating the patch can be done as follows:

1. Modify the `vinca_*.yaml` file, but just adding the package you want to create the patch for
2. Run `pixi run build`. This will either succeded it the package can be built without any patch, or fail if a patch is required to actually build the package.
4. Start a shell and go inside the repository to be edited. It should be located in `<robostack folder>/output/src_cache/<repo_name>`, where `<robostack folder>` is the folder where you run `pixi run build` and `<repo_name>` is the name of the repository associated to the package in the `url:` attribute of the repo in the `rosdistro_snapshot.yaml`
5. Apply the changes that you would like to store into the patch
6. Create a patch file with `git diff > changes.patch`
7. Check that the patch contains the intended changes
8. Move the file into the `patches` directory of this repository, renaming it according to the naming convention. If the changes are portable across all supported operating system, the file should be called `<package name>.patch`; otherwise, `<package name>.<win/linux/osx>.patch`
9. In some cases the `recipe.yaml` generated needs also a patch (eg. add a conda dependency), in those scenarios a `add_host` key needs to be added to `patch/dependencies.yaml` [example](https://github.com/RoboStack/ros-noetic/blob/bd1d2f44fcbfb02a31c464e51a761fb0fdc32ec0/patch/dependencies.yaml#L15-L17)
10. Rerun `pixi run build` to ensure that the patching succeeds and the package builds without errors
11. Commit the new file, push to your fork and create a PR

## Extending an existing patch file

The procedure to create a new patch file still applies, with a caveat.

The git repository of the package cloned by `rattler-build` will be in a dirty state. The changes of the working tree should amount to the patches already existing for the package.
Running `git diff` will result in a patch which intermingles the new changes to the old ones. This would allow to just swap the new resulting patch file for the old one, but this may make code review difficult if the order of the hunks changes.

To make code review easier, please consider manually porting the new hunks into the existing patch file. This can be made easier by running `git reset --hard` before applying the new changes to the source code.

# Testing changes locally

Clone the relevant repo:

```bash
git clone https://github.com/RoboStack/ros-humble.git  # or: git clone https://github.com/RoboStack/ros-noetic.git or git clone https://github.com/RoboStack/ros-jazzy.git or git clone https://github.com/RoboStack/ros-kilted.git
```bash

Then move in the newly cloned repo, and if necessary do any change to the `vinca_*.yaml` file for your platform:

```bash
cd ros-humble  # or: cd ros-noetic or cd ros-jazzy or cd ros-kilted
```bash

then you can build the packages that need to be built after the `vinca_***.yaml` changes with:

```bash
pixi run build
```

# How does it work?

- The `vinca_*.yaml` files specify which packages should be built. 
  - Add the desired package under `packages_select_by_deps`. This will automatically pull in all dependencies of that package, too.
  - Note that all packages that are already build in one of the channels listed under `skip_existing` will be skipped. 
  - The `packages_remove_from_deps` list allows you to never build packages, even if they are listed as dependencies of other packages, by removing them from the dependencies of other packages. We use it for e.g. the stage simulator which is not available in conda-forge, but is listed as one of the dependencies of the ros-simulator metapackage.
- If you want to rebuild a package (for example because it had a problem for which you added a patch), set it build number explicitly in the `pkg_additional_info.yaml` file. Note that this will not update the package, unless the `rosdistro_snapshot.yaml` file is also updated (and that typically happens only for full rebuild)
- The `robostack.yaml` and `packages-ignore.yaml` files are the equivalent of the [rosdep.yaml](http://wiki.ros.org/rosdep/rosdep.yaml) and translate ROS dependencies into conda package names (or in the case of the dependencies listed in `packages-ignore.yaml` the dependencies are ignored by specifying an empty list).

# Doing a full rebuild

A "full rebuild" is a rebuild of all packages for a given distro, that is typically done to update the version of ROS packages contained in a RoboStack channel, and to build against new versions of dependencies provided by conda-forge.

When doing a full rebuild, please follow these guidelines:

- Refresh the `rosdistro_snapshot.yaml` by running `vinca snapshot` (this is the only step that actually queries rosdistro, directly from the repo and independently from sync).
- Refresh the `conda_build_config.yaml` file to reflect the current status of conda-forge plus migrations that are basically finished even if not updated in conda-forge-pinnings (see https://conda-forge.org/status/ for a list of ongoing migrations and their status; if in doubt, please ask the RoboStack maintainers).
- Bump the `build_number` in `vinca_*.yaml` files to a version higher than any existing build number (considering the overriden build numbers in `pkg_additional_info.yaml`).
- Bump the minor number of the mutex_package in `vinca_*.yaml`, and manually search for any hardcoded number for `ros-distro-mutex` or `ros2-distro-mutex` in `additional_recipes`
- Remove any `build_number` override in `pkg_additional_info.yaml`.
