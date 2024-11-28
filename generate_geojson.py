#!/usr/bin/env python3

import json
import re
import sys
from argparse import ArgumentParser
from datetime import datetime
from pathlib import Path
from re import Pattern
from typing import Generator


COORDINATES_PATTERN: str = r"[ :\n](-?\d{1,3}\.\d+,[  ]{0,2}-?\d{1,3}\.\d+)[ \n]"
DATE_PATTERN: str = r"\d{1,2}[.-]\d{1,2}[.-]\d{2,4}"
DATE_FIELD: str = r"Дата:[ ]*([^\n]*)"
UNIT_FIELD: str = r"Підрозділ:[ ]*([^\n]*)"
DESCRIPTION_FIELD: str = r"Опис:[ \n]*([^\n]*)"
TELEGRAM_CHANNEL: str = "https://t.me/WarArchive_ua"


def normalize_coordinates(coords: str) -> list[float]:
    """Extract coordinates from a string and return them in reverse order"""
    cleaned_string: str = coords.replace(" ", "")  # remove extra spaces
    latitude, longitude = cleaned_string.split(",")
    return [float(longitude), float(latitude)]


def get_description(message: str) -> str:
    """Remove all stuctured data from the message and return description"""
    patterns: list[tuple[str, str]] = [
        (r"🌐?[ ]*Місце:.*\n", ""),  # Remove place field
        (r"🗓?[ ]*Дата:.*\n", ""),  # Remove date field
        (r"[^ ]*[ ]*Підрозділ:.*\n", ""),  # Remove unit field
        (r"📌?[ ]*Геолокація:.*\n", ""),  # Remove geolocation field
        (r"📂?[ ]*Опис:[ ]*", ""),  # Remove description title
        (r"\n.*Джерело.*\n", "\n"),  # Remove source of the content
        (r"\d+:\d+ - [0-9,. ]+.*\n", ""),  # Remove ti:me - geolocation description
        (r"\n\n.*\|.*$", "\n"),  # Remove footer
    ]
    compiled_patterns: list[tuple[Pattern[str], str]] = [
        (re.compile(pattern), repl) for pattern, repl in patterns
    ]

    for pattern, repl in compiled_patterns:
        message = pattern.sub(repl, message)

    return message.strip()


def read_json_files(files: list[Path]) -> Generator[dict, None, None]:
    for input_file in files:
        try:
            with input_file.open("r", encoding="utf-8") as f:
                data: dict = json.load(f)
                yield data
        except FileNotFoundError:
            print(f"Error: File '{input_file}' is not found", file=sys.stderr)
        except json.decoder.JSONDecodeError:
            print(f"Error: '{input_file}' is not a valid JSON file", file=sys.stderr)


def main() -> None:
    parser = ArgumentParser(
        description="Find coordinates in Telegram messages and generate GeoJSON from Telegram messages",
    )
    parser.add_argument(
        "-o",
        "--output",
        dest="output_file",
        type=Path,
        required=True,
        help="Output GeoJSON file",
    )
    parser.add_argument(
        "-r",
        "--reverse",
        dest="reverse",
        action="store_true",
        help="Process JSON files in reverse order",
    )
    parser.add_argument(
        "input_files",
        metavar="input_files",
        type=Path,
        nargs="+",
        help="Input JSON files",
    )
    args = parser.parse_args()

    features: list[dict] = []
    input_files: list[Path] = (
        args.input_files[::-1] if args.reverse else args.input_files
    )

    for data in read_json_files(input_files):
        for i in data["messages"]:
            if "message" not in i:
                continue

            # extract all coordinates from the post
            coordinates: list = re.findall(COORDINATES_PATTERN, i["message"])

            # extract all stuctured data from the post
            date: list = re.findall(DATE_FIELD, i["message"])
            unit: list = re.findall(UNIT_FIELD, i["message"])
            # desc: list = re.findall(DESCRIPTION_FIELD, i["message"])

            # extract metadata for the post
            post_date: datetime = datetime.strptime(
                i["date"], "%Y-%m-%d %H:%M:%S+00:00"
            )

            for point in coordinates:
                features.append(
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": normalize_coordinates(point),
                        },
                        "properties": {
                            "post_id": i["id"],
                            "post_date": post_date.strftime("%Y-%m-%d %H:%M"),
                            "date": date[0] if date else None,
                            "unit": unit[0] if unit else None,
                        },
                    }
                )

    # Create the FeatureCollection
    geojson_feature_collection = {"type": "FeatureCollection", "features": features}

    # Write GeoJSON file
    with args.output_file.open("w", encoding="utf-8") as f:
        json.dump(geojson_feature_collection, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
