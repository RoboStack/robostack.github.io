---
title: RoboStack is now a monorepo
slug: Monorepo
---

Until now every ROS distribution in RoboStack had its own repository: `ros-humble`, `ros-jazzy`, `ros-lyrical`, `ros-rolling` and so on.
A fix for a broken package often had to be made four times, in four repositories, with four CI setups that slowly drifted apart.
Keeping all of that in sync took more maintainer time than building the packages themselves.

So we moved the maintained distributions into one repository: [RoboStack/robostack](https://github.com/RoboStack/robostack).

## What moved

Humble, Jazzy, Lyrical and Rolling are now built from [RoboStack/robostack](https://github.com/RoboStack/robostack).
Each distribution has its own folder in `distros/<distro>/` for what is specific to it, and everything they have in common lives in `shared/`.
That means a patch, a test or a dependency fix for all distributions is made once.

| Distribution | Recipes |
| --- | --- |
| Humble | [`distros/humble`](https://github.com/RoboStack/robostack/tree/main/distros/humble) |
| Jazzy | [`distros/jazzy`](https://github.com/RoboStack/robostack/tree/main/distros/jazzy) |
| Lyrical | [`distros/lyrical`](https://github.com/RoboStack/robostack/tree/main/distros/lyrical) |
| Rolling | [`distros/rolling`](https://github.com/RoboStack/robostack/tree/main/distros/rolling) |

The move was driven by [Tobias Fischer](https://github.com/Tobias-Fischer), with a lot of review from [Silvio Traversaro](https://github.com/traversaro).
The full plan is tracked in [this issue](https://github.com/Tobias-Fischer/robostack-distros/issues/54).

## What this means for you

**Installing packages:** nothing changes for your workspace.
The channels you install from stay the same, and so do the package names you already use.
Packages built from the monorepo are named `ros2-<package>`, for example `ros2-desktop`, but every one of them also has a `ros-<distro>-<package>` package that points to it.
So `pixi add ros-jazzy-desktop` keeps working.

**Reporting an issue:** open it in [RoboStack/robostack](https://github.com/RoboStack/robostack/issues/new/choose) and mention which distribution you are using.
The old repositories stay around, but new issues there point you to the monorepo.

**Missing a package:** open a [package request](https://github.com/RoboStack/robostack/issues/new/choose).
robostack-bot opens the pull request that adds it to the build, and a maintainer reviews it.

**Contributing recipes:** clone the monorepo and run the tasks for the distribution you want to work on:

```bash
git clone https://github.com/RoboStack/robostack.git
cd robostack
pixi run rs jazzy build
```

The [README](https://github.com/RoboStack/robostack#for-maintainers) explains the layout and the other tasks.

## Deprecated distributions

Noetic, Kilted, Galactic and Foxy did not move into the monorepo and are deprecated.
Their packages stay installable from their channels, but they don't get new builds or fixes anymore.

| Distribution | Repository |
| --- | --- |
| Noetic | [RoboStack/ros-noetic](https://github.com/RoboStack/ros-noetic) |
| Kilted | [RoboStack/ros-kilted](https://github.com/RoboStack/ros-kilted) |
| Galactic | [RoboStack/ros-galactic](https://github.com/RoboStack/ros-galactic) |
| Foxy | [RoboStack/ros-foxy](https://github.com/RoboStack/ros-foxy) |

If you are still on one of these, now is a good moment to move to [Humble](/humble.html), [Jazzy](/jazzy.html), [Lyrical](/lyrical.html) or [Rolling](/rolling.html).
With Pixi that is mostly changing the channel and the package prefix in your `pixi.toml`.

Questions about the move? Ask them in the [robotics channel on the prefix.dev Discord](https://discord.gg/kKV8ZxyzY4) or join the monthly [community meeting](/CommunityMeeting.html).
