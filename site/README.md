Debugging examples
==================

# Testing specific videos

There are several URL params that can be used to test specific videos:
* `r` - resets the time
* `t` - set a specific time
* `c` - changes channel

## Change time

### Reset

http://localhost:5173/?r

### Specific time

http://localhost:5173/?t=2001-09-11T12:00:00

## Change channel

http://localhost:5173/?c=CNN

# Electron

## TODO

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
