import argparse
import datetime
import subprocess

import niquests
from urllib3.util.retry import Retry

# Configuration
BASE_URL = "https://conda.anaconda.org"
SOURCE_CHANNEL = "robostack-staging"
PLATFORMS = [
    "linux-64",
    "linux-aarch64",
    "win-64",
    "osx-64",
    "osx-arm64",
    "noarch",
    "emscripten-wasm32",
]

session = niquests.Session(
    retries=Retry(total=5, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
)


def fetch_repodata(channel: str, platform: str) -> dict:
    """
    Fetch the repodata.json file from a given channel and platform.

    A 404 means the channel has no such platform yet and reads as empty. Anything
    else raises: treating a transient error as an empty channel would make the run
    copy nothing and still report success.
    """
    url = f"{BASE_URL}/{channel}/{platform}/repodata.json"
    response = session.get(url)

    if response.status_code == 404:
        return {}
    response.raise_for_status()
    return response.json() or {}


def upload_package(
    package_name_simple: str,
    package_name: str,
    version: str,
    build: str,
    platform: str,
    destination_channel: str,
) -> None:
    """
    Upload a package to the specified Anaconda channel.
    """
    try:
        # Construct the full package identifier with platform
        package_identifier = (
            f"{SOURCE_CHANNEL}/{package_name_simple}/{version}/{platform}/{package_name}"
        )

        print(
            f"Uploading package: {package_name}, version: {version}, "
            f"build: {build}, platform: {platform}"
        )
        command_vec = ["anaconda", "copy", package_identifier, "--to-owner", destination_channel]
        subprocess.run(command_vec, check=True)
        print(
            f"Successfully uploaded: {package_name}, version: {version}, "
            f"build: {build}, platform: {platform}"
        )
    except subprocess.CalledProcessError as e:
        print(
            f"Failed to upload {package_name}, version {version}, "
            f"build {build}, platform {platform}: {e}"
        )


# Get the timestamp in milliseconds from epoch, with an additional workaround
# for packages that for some reason have a timestamp in seconds instead of milliseconds
def get_timestamp_with_workaround_for_timestamp_in_seconds_instead_of_milliseconds(
    pkg_data: dict,
) -> int:
    timestamp = pkg_data["timestamp"]
    # Workaround for https://github.com/RoboStack/ros-humble/issues/258 .
    # If it seems that the packages was built before 2001, probably the timestamp is actually
    # in seconds instead of milliseconds
    if timestamp < 1000000000000:
        timestamp *= 1000
    return timestamp


def main() -> None:
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Upload packages from robostack-staging to robostack-<distroname>."
    )
    parser.add_argument("distro", type=str, help="The distro upload (e.g., 'humble')")
    parser.add_argument(
        "cutoff",
        type=str,
        help=(
            "Only package built after this cutoff date are uploaded. "
            "The cutoff date is a a string with format YYYY-MM-DD."
        ),
    )
    args = parser.parse_args()
    distro = args.distro

    destination_channel = f"robostack-{distro}"

    # Convert cutoff date to cutoff timestamps
    cutoff_timestamp = int(datetime.datetime.strptime(args.cutoff, "%Y-%m-%d").timestamp() * 1000.0)

    # Fetch repodata.json for each platform from source and destination channels
    source_repodata = {}
    destination_repodata = {}
    for platform in PLATFORMS:
        source_repodata[platform] = fetch_repodata(SOURCE_CHANNEL, platform)
        destination_repodata[platform] = fetch_repodata(destination_channel, platform)

    # Process packages for each platform
    for platform in PLATFORMS:
        print(f"Processing platform: {platform}")

        # Extract packages from source and destination
        source_packages = {}
        source_packages.update(source_repodata[platform].get("packages", {}))
        source_packages.update(source_repodata[platform].get("packages.conda", {}))
        destination_packages = {}
        destination_packages.update(destination_repodata[platform].get("packages", {}))
        destination_packages.update(destination_repodata[platform].get("packages.conda", {}))
        destination_keys = {
            (pkg_name, pkg_data["version"], pkg_data["build"])
            for pkg_name, pkg_data in destination_packages.items()
        }

        # Filter packages that belong to the given distro
        # and are newer then the specified cutoff date
        prefix = "ros-" + distro
        filtered_packages = {
            pkg_name: pkg_data
            for pkg_name, pkg_data in source_packages.items()
            # This should cover both packages that start with 'ros-<distro>'
            # '(ros|ros2)-<distro>-mutex' packages whose build string contains <distro>
            if (
                pkg_name.startswith(prefix)
                or (pkg_data["name"].endswith("distro-mutex") and distro in pkg_data["build"])
            )
            and (
                get_timestamp_with_workaround_for_timestamp_in_seconds_instead_of_milliseconds(
                    pkg_data
                )
                >= cutoff_timestamp
            )
        }

        print(
            f"Found {len(filtered_packages)} packages in {SOURCE_CHANNEL}/{platform} "
            f"that belong to distro {distro}"
        )

        # Upload packages that are not already in the destination channel
        for pkg_name, pkg_data in filtered_packages.items():
            package_name = pkg_name
            version = pkg_data["version"]
            build = pkg_data["build"]
            package_name_simple = pkg_data["name"]

            if (package_name, version, build) not in destination_keys:
                upload_package(
                    package_name_simple,
                    package_name,
                    version,
                    build,
                    platform,
                    destination_channel,
                )
            else:
                print(
                    f"Package {package_name}, version {version}, build {build}, "
                    f"platform {platform} already exists in {destination_channel}. "
                    "Skipping upload."
                )


if __name__ == "__main__":
    main()
