#!/bin/sh

mkdir -p site/build

convert site/public/images/screenshot.jpg -fuzz 5% -fill none -draw "alpha 30,30 floodfill" -trim +repage site/public/images/favicon.png

#-transparent white
convert site/public/images/favicon.png -resize 512x512  site/public/images/favicon-512.png
convert site/public/images/favicon-512.png -resize 256x256 -background transparent -gravity center -extent 256x256 site/public/images/favicon-256.png
convert site/public/images/favicon-256.png -resize 128x128 -background transparent -gravity center -extent 128x128 site/public/images/favicon-128.png
convert site/public/images/favicon-256.png -resize 64x64 -background transparent -gravity center -extent 64x64 site/public/images/favicon-64.png
convert site/public/images/favicon-256.png -resize 32x32 -background transparent -gravity center -extent 32x32 site/public/images/favicon-32.png
convert site/public/images/favicon-256.png -resize 16x16 -background transparent -gravity center -extent 16x16 site/public/images/favicon-16.png
convert site/public/images/favicon-16.png site/public/images/favicon-32.png site/public/images/favicon-64.png site/public/images/favicon-128.png -colors 256 site/public/images/favicon.ico
convert site/public/images/favicon-16.png site/public/images/favicon-32.png site/public/images/favicon-64.png site/public/images/favicon-128.png site/public/images/favicon-256.png -colors 256 site/build/icon.ico

# These doesn't allow as much controll as needed
#convert site/public/images/favicon.png -define icon:auto-resize=64,48,32,16 site/public/images/favicon.ico
#convert site/public/images/favicon.png -define icon:auto-resize=256,128,64,48,32,16 site/build/icon.ico


if ! command -v icnsify 2>&1 >/dev/null ; then
    echo "icnsify not installed, use 'go install github.com/jackmordaunt/icns/cmd/icnsify@latest' to install"
else
  icnsify -i site/public/images/favicon.png -o site/build/icon.icns
fi
