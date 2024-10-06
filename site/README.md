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

Example URL for channel ATZ:
http://localhost:5173/?t=2001-09-17T19:07:56.110000-04:00

# Finding timecodes to test

Use `scripts/channels_stats.py` to get channel statistics, those provide points to test.

## Gaps

Use these to test switch over to the following video

```
python scripts/channels_stats.py -t -i site/src/assets/json/urls.json gaps
```

## Ends

Use these to test the end test card

```
python scripts/channels_stats.py -t -i site/src/assets/json/urls.json ends
```

Get the end for AZT:

```
 python scripts/channels_stats.py -t -c AZT -i site/src/assets/json/urls.json ends
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

# Testing

The followings should work
* Teletext
  * Navigation without video skipping
  * Counter while waiting for page
  * Entering page number via keybaord
  * Clock

* Videos

* Buttons
  * Mute
  * Power off to static
    power off disables teletext
  * Channel up / down
  * Fullscreen

* Other
  * Full screen on double click
  * Info on video source

## Things to test

* Time diff when returning after end time
* Search for `throw new Error`, remove conditions that trigger those

# Other

## Python `strptime` example

```
import datetime

time = "2001-09-17 23:07:56.110000+00:00"

dt = datetime.datetime.strptime(time, "%Y-%m-%d %H:%M:%S.%f%z")
print(dt.isoformat())
```
