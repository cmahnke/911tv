#!/bin/sh

python ./scripts/gen_urls.py > ./site/src/assets/json/urls.json
python ./scripts/gen_pages.py > ./site/src/assets/json/pages.json
