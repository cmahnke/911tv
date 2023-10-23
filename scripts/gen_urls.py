#!/usr/bin/env python

import datetime
import json
import re
import sys
import os
from zoneinfo import ZoneInfo
from collections import OrderedDict
import multiprocessing
from functools import reduce
import requests
from termcolor import cprint
from bs4 import BeautifulSoup
from pymediainfo import MediaInfo

# See https://archive.org/details/911
TEMPLATE = 'https://archive.org/details/911?time={time}&chan={chan}'
chans = ['AZT', 'BBC', 'BET', 'CCTV3', 'CNN', 'GLVSN', 'IRAQ', 'MCM', 'NEWSW', 'NHK', 'NTV', 'TCN', 'WETA', 'WJLA', 'WORLDNET', 'WRC', 'WSBK', 'WTTG', 'WUSA']
timespan = ((11, 12), (18, 0))
METADATA = {'year':  2001, 'month': 9, 'timezone': 'America/New_York'}
EXTENDED = False
DURATION = True
POOL_SIZE = max(multiprocessing.cpu_count() * 2, 10)
DETAILS_PREFIX = 'https://archive.org/details/911/day/'
tz = ZoneInfo('America/New_York')

if sys.platform == "darwin":
    sys.path.append('/opt/homebrew/lib/')
    for dirname in sys.path:
        lib = os.path.join(dirname, 'libmediainfo.dylib')
        if os.path.isfile(lib):
            if MediaInfo.can_parse(lib):
                mediainfo_opts = {'library_file': lib}
                break
    if len(mediainfo_opts) == 0:
        cprint("Didn't find mediainfo library!", "red", file=sys.stderr)
else:
    mediainfo_opts = {}

# See https://stackoverflow.com/a/7205107
def merge(a: dict, b: dict, path=[]):
    for key in b:
        if key in a:
            if isinstance(a[key], dict) and isinstance(b[key], dict):
                merge(a[key], b[key], path + [str(key)])
            elif a[key] != b[key]:
                raise Exception('Conflict at ' + '.'.join(path + [str(key)]))
        else:
            a[key] = b[key]
    return a

def gen_timecode(days, minutes=10):
    # Details format: 20010911
    # Timecode format: 200109111200
    timestamps = {}
    timestamp = datetime.datetime(METADATA['year'], METADATA['month'], days[0][0], days[0][1], tzinfo=datetime.timezone.utc)
    METADATA['start'] = timestamp.isoformat()
    end = datetime.datetime(METADATA['year'], METADATA['month'], days[1][0], days[1][1], 59, 59, tzinfo=datetime.timezone.utc)
    METADATA['end'] = end.isoformat()
    step = datetime.timedelta(minutes=minutes)

    while timestamp < end:
        timestamps[timestamp.strftime('%Y%m%d%H%M')] = timestamp
        timestamp += step
    return timestamps

def get_redirect_url(url):
    try:
        req = requests.get(url, allow_redirects=False, timeout=60)
        if req.status_code in (302, 301):
            return req.headers['Location']
        cprint(f"\nResolving Redirect: {url} returned {req.status_code}", "red", file=sys.stderr)
    except requests.exceptions.ReadTimeout:
        cprint(f"\nTimeout for {url}", "red", file=sys.stderr)
    return None

def get_media_type(url):
    try:
        head = requests.head(url, allow_redirects=True, timeout=60)
        if head.status_code == 200:
            return head.headers['Content-Type']
        cprint(f"\nGetting media type: {url} returned {head.status_code}", "red", file=sys.stderr)
    except requests.exceptions.ReadTimeout:
        cprint(f"\nTimeout for {url}", "red", file=sys.stderr)
    except Exception as e:
        cprint(f"\nError (${e}) for {url}", "red", file=sys.stderr)
    return None

def get_video_duration(url):
    try:
        media_info = MediaInfo.parse(url, **mediainfo_opts)
        duration = media_info.video_tracks[0].duration
        # Value is in ms
        return duration
    except RuntimeError:
        cprint(f"\nGetting duration for {url} failed", "red", file=sys.stderr)
        return None

def extract_details(days):
    details = {}
    for day in gen_timecode(days, 60*24):
        day = day[0:8]
        cprint(f"Extracting events from {day}", "red", file=sys.stderr)
        details_html = requests.get(DETAILS_PREFIX + day, timeout=60).content
        soup = BeautifulSoup(details_html, 'html.parser')
        for event in soup.css.select('#events .evmark'):
            time = event.find('div', {'class': 'evtime'}).text.strip()
            timestamp = datetime.datetime.strptime(f"{day} {time}", '%Y%m%d %I:%M%p')
            timestamp = timestamp.replace(tzinfo=tz)
            timestamp = timestamp.astimezone(datetime.timezone.utc)
            text = event.find('div', {'class': 'evtext'}).text.strip()
            if len(text) > 2 * 40:
                cprint(f"Events text for {timestamp} is to long!", "yellow", file=sys.stderr)
            details[timestamp.isoformat()] = text
    return details

def condense(channels):
    condensed = {}
    for chan, timecodes in channels.items():
        # TODO: Extract base URL, see https://stackoverflow.com/a/53191091
        sorted_timecodes = OrderedDict(sorted(timecodes.items(), key = lambda x: datetime.datetime.fromisoformat(x[0])))
        condensed_timecodes = {}
        last_url = None
        for timecode, urls in sorted_timecodes.items():
            if urls['video_url'] is not None and last_url != urls['video_url']['src']:
                condensed_timecodes[timecode] = urls
                last_url = urls['video_url']['src']
                condensed_timecodes[timecode].pop('start_time', None)
                condensed_timecodes[timecode].pop('channel', None)
                condensed_timecodes[timecode].pop('timestamp', None)

        condensed[chan] = condensed_timecodes
    return condensed

# TODO: Generate missing timecodes for faster static noise
def enrich(args):
    (chan, timecode, urls) = args
    entry = {}
    entry[chan] = {}
    if urls['video_url'] is None:
        cprint(f"Error: Video URL for {chan} at {timecode} is None", "red", file=sys.stderr)
    elif urls['video_url'] is not None and 'src' in urls['video_url']:
        url = urls['video_url']['src']
        urls['video_url']['type'] = get_media_type(url)
        if DURATION:
            urls['duration'] = get_video_duration(url)
    else:
        cprint(f"Error: Video URL {urls['video_url']} set but no 'src', this shouldn't happen", "red", file=sys.stderr)
        raise
    entry[chan][timecode] = urls
    cprint('.', 'green', end="", flush=True, file=sys.stderr)
    return entry

def get_video_for_timecode(args):
    (chan, time, dt) = args
    entry = {}
    url = eval('f"' + TEMPLATE + '"', {}, {'chan': chan, 'time': time})
    try:
        redirect = get_redirect_url(url)
    except requests.exceptions.ConnectionError:
        cprint(f"\nFailed to get {url}", "red", file=sys.stderr)
        redirect =  None
    if redirect is not None:
        url_match = re.search(r'/details/911/day/(?P<day>\d{8})#id/(?P<id>.*)/start/(?P<time>\d{2}:\d{2}:\d{2}UTC/chan/(?P<chan>.*))', redirect)
        id_match = re.search(r'(.*)_(?P<start_date>200109\d{2})_(?P<start_time>\d{6})_(.*)', url_match.group('id'))

        video_url = {}
        video_url['src'] = f"https://archive.org/download/{url_match.group('id')}/{url_match.group('id')}.mp4"
        #video_url['type'] = get_media_type(video_url['src'])

        entry['video_url'] = video_url
        entry['meta_url'] = f"https://archive.org/details/{url_match.group('id')}"
        #entry['duration'] = get_video_duration(video_url['src'])
        if EXTENDED:
            entry['id'] = url_match.group('id')
            entry['redirect'] = redirect
            entry['url'] = url
            entry['fragment_url'] = f"{entry['url']}&raw=1"
        video_start = datetime.datetime.strptime(f"{id_match.group('start_date')} {id_match.group('start_time')}", '%Y%m%d %H%M%S')
        video_start = video_start.replace(tzinfo=datetime.timezone.utc)
        #t = round((dt - video_start).total_seconds())
        entry['start_time'] = round((dt - video_start).total_seconds())

        # TODO: check end times
    else:
        entry['id'] = None
        entry['video_url'] = None
        cprint(f"Adding null for {url}", "red", file=sys.stderr)
    cprint('.', 'green', end="", flush=True, file=sys.stderr)
    entry['timestamp'] = dt.isoformat()
    entry['channel'] = chan
    return entry

def add_end(channels):
    for chan, timecodes in channels.items():
        sorted_timecodes = OrderedDict(sorted(timecodes.items(), key = lambda x: datetime.datetime.fromisoformat(x[0])))
        last = list(sorted_timecodes.keys())[-1]
        if 'duration' in channels[chan][last]:
            channels[chan]['end'] = datetime.datetime.fromisoformat(last) + datetime.timedelta(milliseconds=channels[chan][last]['duration'])
    return channels

# Main program
if __name__ == '__main__':
    cprint(f"Using {POOL_SIZE} processes, using { mediainfo_opts['library_file'] if 'library_file' in mediainfo_opts else 'buildin' } as mediainfo dependency", "orange", file=sys.stderr)
    times = gen_timecode(timespan)

    urls = {
        'metadata': METADATA,
        'events': extract_details(timespan),
        'channels': {}
    }

    channels = {}
    print(f"Preprocessing {len(chans)} channels", file=sys.stderr)
    for chan in chans:
        cprint(f"Preprocessing {chan}, {len(times.items())} items", 'green', file=sys.stderr)
        channels[chan] = {}
        entries = []
        for time, dt in times.items():
            entries.append((chan, time, dt))
        with multiprocessing.Pool(POOL_SIZE) as P:
            processed_entries = P.map(get_video_for_timecode, entries)
        for entry in processed_entries:
            channels[chan][entry['timestamp']] = entry
            channels[chan][entry['timestamp']].pop('channel', None)
            channels[chan][entry['timestamp']].pop('timestamp', None)

        print('', flush=True, file=sys.stderr)

    entries = []
    for chan, timecodes in condense(channels).items():
        for timecode, urls_dict in timecodes.items():
            entries.append((chan, timecode, urls_dict))
    cprint(f"Enriching {len(entries)} items", 'green', file=sys.stderr)
    with multiprocessing.Pool(POOL_SIZE) as P:
        processed_entries = P.map(enrich, entries)
    cprint('', 'green', flush=True, file=sys.stderr)

    channels = reduce(merge, processed_entries)
    urls['channels'] = add_end(channels)

    dump = json.dumps(urls, indent=4, default=str)
    print(dump)
