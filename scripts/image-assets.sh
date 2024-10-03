#!/bin/sh

mkdir -p site/build

convert site/public/images/screenshot.jpg -fuzz 5% -fill none -draw "alpha 30,30 floodfill" -trim +repage site/public/images/favicon.png

convert site/public/images/favicon.png -resize 512x512 -transparent white site/public/images/favicon-512.png
convert site/public/images/favicon-512.png -resize 256x256 site/public/images/favicon-256.png
convert site/public/images/favicon-256.png -resize 16x16 site/public/images/favicon-16.png
convert site/public/images/favicon-256.png -resize 32x32 site/public/images/favicon-32.png
convert site/public/images/favicon-256.png -resize 64x64 site/public/images/favicon-64.png
convert site/public/images/favicon-256.png -resize 128x128 site/public/images/favicon-128.png
convert site/public/images/favicon.png -define icon:auto-resize=64,48,32,16 site/public/images/favicon.ico
#convert site/public/images/favicon-512.png site/build/icon.icns
convert site/public/images/favicon.png -define icon:auto-resize=256,128,64,48,32,16 site/build/icon.ico

if ! command -v icnsify 2>&1 >/dev/null ; then
    echo "icnsify not installed, use 'go install github.com/jackmordaunt/icns/cmd/icnsify@latest' to install"
else
  icnsify -i site/public/images/favicon.png -o site/build/icon.icns
fi
