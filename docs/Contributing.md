# Contributing

Many thanks for taking the time to read this and for contributing to RoboStack!

This project is in early stages and we are looking for contributors to help it grow. 
The developers are on [gitter](https://gitter.im/RoboStack/Lobby) where we discuss steps forward.

We welcome all kinds of contribution -- code or non-code -- and value them
highly. We pledge to treat everyones contribution fairly and with respect and
we are here to help awesome pull requests over the finish line.

Please note we have a code of conduct, and follow it in all your interactions with the project.

We follow the [NumFOCUS code of conduct](https://numfocus.org/code-of-conduct).


# Adding new packages via pull requests
You can open a pull request that will get build automatically in our CI.

An example can be found [here](https://github.com/RoboStack/ros-noetic/pull/44). Simply add the required packages to the `vinca_*.yaml` files, where the * indicates the desired platform (linux_64, osx, win or linux_aarch64). Ideally, try to add packages to all of these platforms. The name of the package is accepted both with underscores and dashes as word separators, but it is suggested to type the name of the package exactly as https://index.ros.org knows it.

Sometimes, it may be required to patch the packages. An example of how to do so can be found in [this PR](https://github.com/RoboStack/ros-noetic/pull/32).

## Creating a new patch file

1. Follow the [section for testing the changes locally](#Testing-changes-locally) until before running `vinca` 
2. Modify the yaml file, but just enabling the package you want to create the patch for
3. Proceed until the end of the section, until running `boa`. You can verify that the package compiles in the current state to ensure that any eventually arising problem is only due to your changes, but it is not required.
4. Start a shell and go inside the repository to be edited. It should be located in `$MAMBA_ROOT_PREFIX/envs/robostackenv/conda-bld/<package name>/work/<package name>/src/work` 
5. Apply the changes that you would like to store into the patch
6. Create a patch file with `git diff > changes.patch`
7. Check that the patch contains the intended changes
8. Move the file into the `patches` directory of this repository, renaming it according to the naming convention. If the changes are portable across all supported operating system, the file should be called `<package name>.patch`; otherwise, `<package name>.<win/linux/osx>.patch`
9. Rerun `boa` to ensure that the patching succeeds and the package builds without errors
10. Commit the new file, push to your fork and create a PR

## Extending an existing patch file

The procedure to create a new patch file still applies, with a caveat.

The git repository of the package cloned by `boa` will be in a dirty state. The changes of the working tree should amount to the patches already existing for the package.
Running `git diff` will result in a patch which intermingles the new changes to the old ones. This would allow to just swap the new resulting patch file for the old one, but this may make code review difficult if the order of the hunks changes.

To make code review easier, please consider manually porting the new hunks into the existing patch file. This can be made easier by running `git reset --hard` before applying the new changes to the source code.

# Testing changes locally

```bash
# First, create a new conda environment and add the conda-forge and robostack channels:

micromamba create -n robostackenv python=3.11

micromamba activate robostackenv
micromamba config append channels conda-forge
micromamba config append channels robostack-staging

# Install some dependencies
micromamba install pip conda-build anaconda-client mamba conda catkin_pkg ruamel_yaml rosdistro empy networkx requests boa

# Install vinca
pip install git+https://github.com/RoboStack/vinca.git --no-deps

# Clone the relevant repo
git clone https://github.com/RoboStack/ros-humble.git  # or: git clone https://github.com/RoboStack/ros-noetic.git

# Move in the newly cloned repo
cd ros-humble  # or: cd ros-noetic

# Make a copy of the relevant vinca file
cp vinca_linux_64.yaml vinca.yaml  # replace with your platform as necessary

# Now modify vinca.yaml as you please, e.g. add new packages to be built
code vinca.yaml

# Run vinca to generate the recipe; the recipes will be located in the `recipes` folder
vinca --multiple

# Build the recipe using boa:
boa build recipes -m ./.ci_support/conda_forge_pinnings.yaml -m ./conda_build_config.yaml

# You can also generate an azure pipeline locally, e.g.
vinca-azure -d recipes -t mytriggerbranch -p linux-64
# which will create a `linux.yml` file that contains the azure pipeline definition
```

# How does it work?
- The `vinca.yaml` file specifies which packages should be built. 
  - Add the desired package under `packages_select_by_deps`. This will automatically pull in all dependencies of that package, too.
  - The vinca.yaml files contain lots of commented-out package names. That is okay. Not all packages need to be rebuilt with every pull request. Do not be afraid if you see your package commented out after some time - it just means it is not being built now. For sure it will be built with next full rebuild. Full rebuilds happen occasionally (few times a year).
    - If you want to request your package to be updated in between full rebuilds, just send a PR uncommenting the package.
  - Note that all packages that are already build in one of the channels listed under `skip_existing` will be skipped. You can also add your local channel to that list by e.g. adding `/home/ubuntu/miniconda3/conda-bld/linux-64/repodata.json`. 
  - If you want to manually skip packages, you can list them under `packages_skip_by_deps`.
  - If you set `skip_all_deps` to `True`, you will only build packages listed under `packages_select_by_deps` but none of their dependencies.
  - The `packages_remove_from_deps` list allows you to never build packages, even if they are listed as dependencies of other packages. We use it for e.g. the stage simulator which is not available in conda-forge, but is listed as one of the dependencies of the ros-simulator metapackage.
  - If you want to manually rebuild a package that already exists, you need to comment out the channels listed under `skip_existing`. You probably want to set `skip_all_deps: true`, otherwise all dependencies will be rebuilt in this case.
- If the package does not build successfully out of the box, you might need to patch it. To do so, create a new file `ros-$ROSDISTRO-$PACKAGENAME.patch` in the `patch` directory (replace `$PACKAGENAME` with the name of the package, and replace any underscores with hyphens; and replace `$ROSDISTRO` with "noetic" or "galactic"). You can also use platform specifiers to only apply the patch on a specific platform, e.g. `ros-$ROSDISTRO-$PACKAGENAME.win.patch`.
- The `robostack.yaml` and `packages-ignore.yaml` files are the equivalent of the [rosdep.yaml](http://wiki.ros.org/rosdep/rosdep.yaml) and translate ROS dependencies into conda package names (or in the case of the dependencies listed in `packages-ignore.yaml` the dependencies are ignored by specifying an empty list).
