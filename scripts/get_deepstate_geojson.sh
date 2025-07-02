#!/usr/bin/env bash
# 1. Get the latest data from DeepState (https://deepstatemap.live/)
# 2. Extract GeoJSON from JSON file
# 3. Remove unrelated points and polygons from the GeoJSON

set -e -o pipefail

OUTPUT_FILE="${1:-deepstatemap.geojson}"
TEMP_JSON_FILE="$(mktemp -u --suffix=.json)"
TEMP_GEOJSON_FILE="$(mktemp -u --suffix=.geojson)"
URL="https://deepstatemap.live/api/history/last"

trap cleanup SIGINT SIGTERM ERR EXIT

cleanup() {
    trap - SIGINT SIGTERM ERR EXIT
    rm -f "$TEMP_JSON_FILE" "$TEMP_GEOJSON_FILE"
}

echo "Dowloading ${URL} to ${TEMP_JSON_FILE} ..." >&2
LANG=C curl \
    --fail \
    --globoff \
    --location \
    --remote-name-all \
    --remote-time \
    --retry 3 \
    --retry-max-time 10 \
    --user-agent "Mozilla/5.0" \
    --output "$TEMP_JSON_FILE" "$URL"

echo "Transforming '${TEMP_JSON_FILE}' into '${TEMP_GEOJSON_FILE}' ..." >&2
jq '.map | del(.features[] | select(.geometry.type == "Point"))
    | .features |= map(
        select(
          (.properties.name | tostring)
          | test("geoJSON\\.territories\\.(abkhazia|ichkeria|tskhinvali-district|kuril|petsamo|salla|karelia|estonia|pechorsky-district|prussia|latvia)")
          | not
        )
        | .properties |= del(.styleUrl, .styleHash, .styleMapHash)
    )' "$TEMP_JSON_FILE" > "$TEMP_GEOJSON_FILE"

if [ -S "$TEMP_GEOJSON_FILE" ]; then
    echo "Error: the output file is empty!" >&2
    exit 1
fi

cp -f "$TEMP_GEOJSON_FILE" "$OUTPUT_FILE"
echo "Copied '${TEMP_GEOJSON_FILE}' to '${OUTPUT_FILE}'." >&2
