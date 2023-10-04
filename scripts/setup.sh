#!/bin/sh

python ./scripts/gen-urls.py > ./site/assets/json/urls.json
python ./scripts/gen-pages.py > ./site/assets/json/pages.json
