#!/usr/bin/env bash

set -eu -o pipefail

if [ -z "${GITHUB_TOKEN}" ]; then
	echo "Error: GITHUB_TOKEN environment variable not set!" >&2
	exit 1
fi

if [ ! -f .venv/bin/activate ]; then
	echo "Error: .venv/bin/activate not found! Check working directory." >&2
	exit 1
fi

source .venv/bin/activate

CURRENT_DATE="$(date --iso-8601)"
CURRENT_TIME="$(date +%H%M%S)"
CONFIG_DIR="/app/config"
DATA_DIR="/data"
TODAY_DIR="$DATA_DIR/output/$CURRENT_DATE"
OUTPUT_DIR="$DATA_DIR/output/$CURRENT_DATE/$CURRENT_TIME"
CHANNEL_NAME="WarArchive_ua"
GEOJSON_FILE="$TODAY_DIR/${CHANNEL_NAME}.geojson"
REPO_FILE="SmartFinn/wararchive-website/data/wararchive_ua.geojson"

is_messages_dump_exists() {
	for subdir in "$TODAY_DIR"/*; do
		[ -s "$subdir/$CHANNEL_NAME/${CHANNEL_NAME}_messages.json" ] || continue
		return 0
	done

	return 1
}

get_last_message_id() {
	local last_json_file=""

	# Get last existing json file
	for subdir in "$TODAY_DIR"/*; do
		[ -s "$subdir/$CHANNEL_NAME/${CHANNEL_NAME}_messages.json" ] || continue
		last_json_file="$subdir/$CHANNEL_NAME/${CHANNEL_NAME}_messages.json"
	done

    python -c "import json; print(json.load(open('$last_json_file', 'r'))['messages'][0]['id'])"
}

# Create output directory if it doesn't exist
mkdir -p "$TODAY_DIR"

# Extra arguments for telegram-tracker
extra_args=()

if is_messages_dump_exists; then
	last_message_id="$(get_last_message_id)"

	if [ -n "$last_message_id" ]; then
		extra_args+=( --min-id "$last_message_id" )
	fi
fi

echo "==> Grabbing messages from Telegram..."
python3 main.py --telegram-channel "$CHANNEL_NAME" --output "$OUTPUT_DIR" --config "$CONFIG_DIR/config.ini" "${extra_args[@]}" || {
    echo "Something went wrong during the execution of telegram-tracker. Cleaning up..." >&2
    rm -rfv "$OUTPUT_DIR"
    exit 1
}

echo "==> Generating GeoJSON file..."
if is_messages_dump_exists; then
	python3 generate_geojson.py --reverse -o "$GEOJSON_FILE" "$TODAY_DIR"/*/"$CHANNEL_NAME/${CHANNEL_NAME}_messages.json"
else
	echo "Error: fail to find ${CHANNEL_NAME}_messages.json file." >&2
	exit 1
fi

echo "==> Uploading GeoJSON file to GitHub..."
if [ -s "$GEOJSON_FILE" ]; then
	python3 ghcp.py "$GEOJSON_FILE" "$REPO_FILE"
else
	echo "Error: '$GEOJSON_FILE' is not exists or empty." >&2
	exit 1
fi
