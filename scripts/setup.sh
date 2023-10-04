#!/bin/sh

python ./scripts/gen-urls.py > ./site/src/assets/json/urls.json
python ./scripts/gen-pages.py > ./site/src/assets/json/pages.json
