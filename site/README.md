Development / Debugging examples
================================

# Quick start
## Generate required data

```
pip install -r requirements.txt
./scripts/setup.sh
```

## Installing dependencies

```
cd site
npm i
```

## Starting the web server

```
cd site
npm run dev
```

## Generate static web site

```
cd site
npm run build
```

## Run the app for the current platform

```
cd site
npm run app:start
```

# Testing specific videos

There are several URL params that can be used to test specific videos:
* `r` - resets the time
* `t` - set a specific time
* `c` - changes channel
* `a` - set the accept cookie

## Change time

### Reset

http://localhost:5173/?r

### Specific time

#### Example

http://localhost:5173/?t=2001-09-11T19:00:00

#### With timezone

http://localhost:5173/?t=2001-09-11T12:15:30-04:00

## Change channel

http://localhost:5173/?c=CNN

## Debugging addresses


# End of stream

http://localhost:5173/?t=2001-09-17T20:59:00

# Finding timecodes to test

Use `scripts/channels_stats.py` to get channel statistics, those provide points to test.

## Gaps

Use these to test switch over to the following video

```
python scripts/channels_stats.py -t -i site/src/assets/json/urls.json gaps
```

## Ends

Use these to test the test card


```
python scripts/channels_stats.py -t -i site/src/assets/json/urls.json ends
```

# Electron

## TODO

* Better branding: https://stackoverflow.com/questions/41551110/unable-to-override-app-name-on-mac-os-electron-menu
* Add downloads to GitHub

# Maintanace

## Python

```
cd ..
pip install --upgrade --force-reinstall -r requirements.txt
```

## JavaScript

```
npm update --save
```
