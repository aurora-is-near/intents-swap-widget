#!/bin/bash

set -e

# Paths
ROOT_PKG="package.json"
WIDGET_PKG="packages/intents-swap-widget/package.json"
TMP_PKG="package.tmp.json"

echo "Preparing release..."

# Extract values from existing root
ROOT_DEV_DEPS=$(jq '.devDependencies // {}' "$ROOT_PKG")
ROOT_RESOLUTIONS=$(jq '.resolutions // {}' "$ROOT_PKG")

# Copy widget package.json to temp root
cp "$WIDGET_PKG" "$TMP_PKG"

# Merge the fields into the new root package.json
jq \
  --argjson devDeps "$ROOT_DEV_DEPS" \
  --argjson resolutions "$ROOT_RESOLUTIONS" \
  '
  .devDependencies = (.devDependencies + $devDeps)
  | .resolutions = (.resolutions + $resolutions)
  ' \
  "$TMP_PKG" > "$ROOT_PKG"

rm "$TMP_PKG"

echo "✅ package.json updated with merged devDependencies & resolutions"
