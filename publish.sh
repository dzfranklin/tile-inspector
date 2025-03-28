#!/usr/bin/env bash
set -euo pipefail

npm run build

find ./dist -type f -print0 |
  tac -s '' |
  while IFS= read -r -d '' src; do
    dst=${src//\.\/dist\//"https://storage.bunnycdn.com/tile-inspector-site/"}
    echo "Uploading $src -> $dst"
    curl -H "AccessKey: $BUNNY_STORAGE_KEY" --fail -o /dev/null "$dst" \
      --upload-file "$src"
  done

echo "Purging CDN"
curl --get -H "AccessKey: $BUNNY_KEY" --fail-with-body "https://api.bunny.net/purge" \
  -d "url=https://tile-inspector.b-cdn.net/*"

echo "All done"
