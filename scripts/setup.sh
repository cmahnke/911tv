#!/bin/sh

set -e

./scripts/image-assets.sh

if [ ! -f ./site/src/assets/json/urls.json ]; then
  python ./scripts/gen_urls.py > ./site/src/assets/json/urls.json
fi

python ./scripts/gen_pages.py -p 5 > ./site/src/assets/json/pages.json

#node scripts/compress-json.mjs site/src/assets/json/urls.json site/src/assets/json/urls-compressed.json
