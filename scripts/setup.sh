#!/bin/sh

set -e

./scripts/image-assets.sh

python ./scripts/gen_urls.py > ./site/src/assets/json/urls.json
python ./scripts/gen_pages.py -p 4 > ./site/src/assets/json/pages.json

#node scripts/compress-json.mjs site/src/assets/json/urls.json site/src/assets/json/urls-compressed.json
