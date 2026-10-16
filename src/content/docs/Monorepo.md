---
title: The RoboStack monorepo
slug: Monorepo
---

All maintained ROS distributions in RoboStack are built from one repository: [RoboStack/robostack](https://github.com/RoboStack/robostack).

That wasn't always the case.
Before 2026, every distribution had its own repository: `ros-humble`, `ros-jazzy`, `ros-lyrical`, `ros-rolling` and so on.
A fix for a broken package often had to be made four times, in four repositories, with four CI setups that slowly drifted apart.
Keeping all of that in sync took more maintainer time than building the packages themselves.
So in 2026 the maintained distributions moved into one repository.

## How the monorepo is organized

Each distribution has its own folder in `distros/<distro>/` for what is specific to it, and everything the distributions have in common lives in `shared/`.
A patch, a test or a dependency fix that applies to all distributions is made once.
New ROS distributions are added as a new folder in the same repository.

The distributions that moved in were:

| Distribution | Recipes |
| --- | --- |
| Humble | [`distros/humble`](https://github.com/RoboStack/robostack/tree/main/distros/humble) |
| Jazzy | [`distros/jazzy`](https://github.com/RoboStack/robostack/tree/main/distros/jazzy) |
| Lyrical | [`distros/lyrical`](https://github.com/RoboStack/robostack/tree/main/distros/lyrical) |
| Rolling | [`distros/rolling`](https://github.com/RoboStack/robostack/tree/main/distros/rolling) |

The move was driven by [Tobias Fischer](https://github.com/Tobias-Fischer), with a lot of review from [Silvio Traversaro](https://github.com/traversaro).
The plan is documented in [this issue](https://github.com/Tobias-Fischer/robostack-distros/issues/54).

## Package names

Packages built from the monorepo are named `ros2-<package>`, for example `ros2-desktop`.
The distribution comes from the channel you install from.
Every one of them also has a `ros-<distro>-<package>` package that points to it, so older instructions like `pixi add ros-jazzy-desktop` keep working.

## Reporting an issue or requesting a package

Open an issue in [RoboStack/robostack](https://github.com/RoboStack/robostack/issues/new/choose) and mention which distribution you are using.

Missing a package?
Open a [package request](https://github.com/RoboStack/robostack/issues/new/choose) there.
robostack-bot opens the pull request that adds it to the build, and a maintainer reviews it.

## Building packages locally

Clone the monorepo and run the tasks for the distribution you want to work on:

```bash
git clone https://github.com/RoboStack/robostack.git
cd robostack
pixi run rs jazzy build
```

The [README](https://github.com/RoboStack/robostack#for-maintainers) explains the layout and the other tasks.

## Deprecated distributions

Noetic, Kilted, Galactic and Foxy were not moved into the monorepo and are deprecated.
Their packages stay installable from their channels, but they don't get new builds or fixes.
Their repositories are kept for reference:

| Distribution | Repository |
| --- | --- |
| Noetic | [RoboStack/ros-noetic](https://github.com/RoboStack/ros-noetic) |
| Kilted | [RoboStack/ros-kilted](https://github.com/RoboStack/ros-kilted) |
| Galactic | [RoboStack/ros-galactic](https://github.com/RoboStack/ros-galactic) |
| Foxy | [RoboStack/ros-foxy](https://github.com/RoboStack/ros-foxy) |

If you are on one of these, move to a distribution that is built from the monorepo.
With Pixi that is mostly changing the channel and the package prefix in your `pixi.toml`.

Questions? Ask them in the [robotics channel on the prefix.dev Discord](https://discord.gg/kKV8ZxyzY4) or join the monthly [community meeting](/CommunityMeeting.html).
