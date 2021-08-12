import os
import yaml
import json
import requests
import argparse


parser = argparse.ArgumentParser()
parser.add_argument("distro", help="distro to check package completeness for", default="noetic")
parser.add_argument("channel", help="channel to be used", default="robostack")
args = parser.parse_args()

distro = args.distro
channel = args.channel

f = open(os.path.join("docs", distro + ".md"), 'w')

rosdistro_pkgs = "https://raw.githubusercontent.com/ros/rosdistro/master/{distro}/distribution.yaml".format(distro=distro)
conda_pkgs_url = "https://conda.anaconda.org/{channel}/{arch}/repodata.json"

rosdistro_pkgs = yaml.safe_load(requests.get(rosdistro_pkgs).text)

available_pkgs = {}
for reponame, repo in rosdistro_pkgs['repositories'].items():
    if not repo.get('release'):
        available_pkgs[reponame] = None
    elif repo.get('release', {}).get('packages'):
        pkgs = repo['release']['packages']
        for pname in pkgs:
            available_pkgs[pname] = repo['release'].get('version', None)
    else:
        available_pkgs[reponame] = repo['release'].get('version', None)

def to_ros(pkg):
    return f"ros-{distro}-{pkg.replace('_', '-')}"

def get_conda_pkgs(arch="linux-64"):
    conda_pkgs = requests.get(conda_pkgs_url.format(arch=arch, channel=channel)).json()
    conda_pkgs_versions = {}
    for pkgname, pkg in conda_pkgs['packages'].items():
        if pkg["name"] in conda_pkgs_versions:
            conda_pkgs_versions[pkg["name"]].add(pkg["version"])
        else:
            conda_pkgs_versions[pkg["name"]] = {pkg["version"]}
    return conda_pkgs_versions

f.write("| Package | ")
availability = {}

def add_arch(arch="linux-64"):
    conda_pkgs_versions = get_conda_pkgs(arch)

    def add_available(arch, pkg, versions=None):
        if pkg in availability:
            availability[pkg][arch] = versions
        else:
            availability[pkg] = {arch: versions}

    for pkg in available_pkgs:
        if available_pkgs[pkg] is None:
            continue
        rpkg = to_ros(pkg)
        if rpkg in conda_pkgs_versions:
            add_available(arch, rpkg, conda_pkgs_versions[rpkg])
        else:
            add_available(arch, rpkg, None)

archs = ('linux-64', 'win-64', 'osx-64', 'linux-aarch64', 'osx-arm64')

for a in archs:
    f.write(f" {a} |")
    add_arch(a)

f.write(" Version |\n")

f.write("|--")
for a in archs:
    f.write("|--")
f.write("|--|\n")

rows = []

num_pkgs_per_arch = {}
for arch in archs:
    num_pkgs_per_arch[arch] = 0

for name, pkg in availability.items():
    row = [name]

    versions = set()
    for arch in archs:
        if pkg.get(arch):
            row.append(":heavy_check_mark: { data-sort='1' }")
            versions |= pkg[arch]
            num_pkgs_per_arch[arch] = num_pkgs_per_arch[arch] + 1
        else:
            row.append(":x: { data-sort='0' }")

    if versions:
        row.append(', '.join(sorted(versions)))
    else:
        row.append('')

    rows.append(row)

rows = sorted(rows, key=lambda x: x[0])

for row in rows:
    for cell in row:
        f.write(f"| {cell} ")
    f.write(" |\n")

f.write("| Number of available packages | ")
for arch in archs:
    f.write(f" {num_pkgs_per_arch[arch]} / {len(availability)} |")

f.close()

# import IPython; IPython.embed()
