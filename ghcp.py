#!/usr/bin/env python
#
# Copyright (c) 2024 Sergei Eremenko (https://github.com/SmartFinn)
#
# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
# REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
# AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
# INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
# LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
# OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
# PERFORMANCE OF THIS SOFTWARE.
#
# /// script
# dependencies = [
#   "requests<3",
# ]
# ///

import argparse
import base64
import json
import os
import re
import sys
from datetime import datetime

import requests


def upload_file_to_github(
    token: str, local_path: str, remote_path: str, repo: str, branch: str | None = None
) -> None:
    api_url: str = f"https://api.github.com/repos/{repo}/contents/{remote_path}"

    try:
        with open(local_path, "rb") as file:
            content: bytes = file.read()
    except FileNotFoundError:
        raise Exception(f"Local file '{local_path}' not found")

    # Encode file content in base64
    content_encoded: str = base64.b64encode(content).decode("utf-8")

    headers: dict[str, str] = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Check if file already exists to get its SHA
    try:
        response: requests.Response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        data = response.json()
        sha: str | None = data.get("sha")
    except requests.exceptions.RequestException:
        sha = None

    now: datetime = datetime.now()

    request_data: dict[str, str] = {
        "message": f"Update {remote_path} - {now:%Y-%m-%d %H:%M}",
        "content": content_encoded,
    }

    if branch:
        request_data["branch"] = branch

    if sha:
        request_data["sha"] = sha

    try:
        response = requests.put(api_url, headers=headers, data=json.dumps(request_data))
        response.raise_for_status()
        print(
            f"Successfully uploaded '{local_path}' to '{repo}{'' if not branch
            else f':{branch}'}/{remote_path}'",
            file=sys.stderr,
        )
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to upload file: {str(e)}")


def parse_github_path(path_string: str) -> dict[str, str]:
    """
    Parse GitHub-style repository path strings into components using regex.

    Args:
        path_string (str): Input string in format:
            - owner/repo/remote_path
            - owner/repo:branch/remote_path

    Returns:
        dict: Dictionary containing:
            - repo: repository full name (owner/repo)
            - branch: branch name (None if not specified)
            - remote_path: path to file within repository

    Raises:
        ValueError: If the path string format is invalid
    """

    # Pattern explanation:
    # ^                     Start of string
    # ([^/:]+/[^/:]+)       Capture group 1: repo (owner/repo)
    # (?::([^/]+))?         Optional non-capturing group with capture group 2: branch
    # /(.+)                 Capture group 3: file path
    # $                     End of string
    pattern: str = r"^([^/:]+/[^/:]+)(?::([^/]+))?/(.+)$"

    match: re.Match[str] | None = re.match(pattern, path_string.strip())
    if not match:
        raise ValueError(f"Invalid path format: {path_string}")

    repo, branch, repo_path = match.groups()

    return {
        "repo": repo,
        "branch": branch,  # Will be None if branch was not specified
        "remote_path": repo_path,
    }


def create_parser() -> argparse.ArgumentParser:
    """
    Create and configure the argument parser for the GitHub copy tool.

    Returns:
        argparse.ArgumentParser: Configured argument parser
    """
    # Create parser with description
    parser = argparse.ArgumentParser(
        prog="ghcp",
        description="Copy files from GitHub repositories",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s src/file.txt owner/repo:branch/path/to/file.txt
    %(prog)s src/file.txt owner/repo/path/to/file.txt
        """,
    )

    parser.add_argument(
        "local_path", help="Local destination path where the file will be saved"
    )

    parser.add_argument(
        "remote_path", help="GitHub path in format: owner/repo[:branch]/path/to/file"
    )

    return parser


if __name__ == "__main__":
    github_token: str | None = os.getenv("GITHUB_TOKEN")

    parser: argparse.ArgumentParser = create_parser()
    args: argparse.Namespace = parser.parse_args()

    try:
        if not github_token:
            raise Exception("GITHUB_TOKEN environment variable not set")

        if not os.path.exists(args.local_path):
            raise Exception(f"Local file '{args.local_path}' not found")

        parsed_github_path: dict[str, str] = parse_github_path(args.remote_path)

        upload_file_to_github(
            token=github_token,
            local_path=args.local_path,
            remote_path=parsed_github_path["remote_path"],
            repo=parsed_github_path["repo"],
            branch=parsed_github_path["branch"],
        )
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        raise SystemExit(1)
