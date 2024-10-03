Debugging examples
==================

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

http://localhost:5173/?t=2001-09-11T12:00:00

## Change channel

http://localhost:5173/?c=CNN

## Debugging addresses


# End of stream

http://localhost:5173/?t=2001-09-17T20:59:00

# Electron

## TODO

* Better branding: https://stackoverflow.com/questions/41551110/unable-to-override-app-name-on-mac-os-electron-menu
* Disable cookie notice on Electron
  * Enabled Cookies on bundle electron app
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
