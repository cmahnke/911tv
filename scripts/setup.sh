#!/bin/sh

python ./scripts/gen_urls.py > ./site/src/assets/json/urls.json
python ./scripts/gen_pages.py > ./site/src/assets/json/pages.json

node scripts/compress-json.mjs site/src/assets/json/urls.json site/src/assets/json/urls-compressed.json 

convert site/public/images/screenshot.jpg -fuzz 5% -fill none -draw "alpha 30,30 floodfill" -trim +repage site/public/images/favicon.png

convert site/public/images/favicon.png -resize 256x256 -transparent white site/public/images/favicon-256.png
convert site/public/images/favicon-256.png -resize 16x16 site/public/images/favicon-16.png
convert site/public/images/favicon-256.png -resize 32x32 site/public/images/favicon-32.png
convert site/public/images/favicon-256.png -resize 64x64 site/public/images/favicon-64.png
convert site/public/images/favicon-256.png -resize 128x128 site/public/images/favicon-128.png
convert site/public/images/favicon.png -define icon:auto-resize=64,48,32,16 site/public/images/favicon.ico
