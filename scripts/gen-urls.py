#!/usr/bin/env python

import datetime, json, re, sys
from zoneinfo import ZoneInfo
from collections import OrderedDict
import requests
from termcolor import cprint
from bs4 import BeautifulSoup

# See https://archive.org/details/911
template = 'https://archive.org/details/911?time={time}&chan={chan}'
chans = ['AZT', 'BBC', 'BET', 'CCTV3', 'CNN', 'GLVSN', 'IRAQ', 'MCM', 'NEWSW', 'NHK', 'NTV', 'TCN', 'WETA', 'WJLA', 'WORLDNET', 'WRC', 'WSBK', 'WTTG', 'WUSA']
timespan = ((11, 12), (18, 0))
metadata = {'year':  2001, 'month': 9, 'timezone': 'America/New_York'}
extended = False
condensed = True
details_prefix = 'https://archive.org/details/911/day/'
tz = ZoneInfo('America/New_York')

def gen_timecode(days, minutes=10):
    # Details format: 20010911
    # Timecode format: 200109111200
    global metadata
    timestamps = {}
    timestamp = datetime.datetime(metadata['year'], metadata['month'], days[0][0], days[0][1], tzinfo=datetime.timezone.utc)
    metadata['start'] = timestamp.isoformat()
    end = datetime.datetime(metadata['year'], metadata['month'], days[1][0], days[1][1], 59, 59, tzinfo=datetime.timezone.utc)
    metadata['end'] = end.isoformat()
    step = datetime.timedelta(minutes=minutes)

    result = []

    while timestamp < end:
        timestamps[timestamp.strftime('%Y%m%d%H%M')] = timestamp
        timestamp += step
    return timestamps

def get_redirect_url(url):
    try:
        req = requests.get(url, allow_redirects=False)
        if req.status_code == 302 or req.status_code == 301:
            return req.headers['Location']
        else:
            cprint(f"\nResolving Redirect: {url} returned {req.status_code}", "red", file=sys.stderr)
    except requests.exceptions.ReadTimeout:
        cprint(f"\nTimeout for {url}", "red", file=sys.stderr)

def get_media_type(url):
    try:
        head = requests.head(url, allow_redirects=True)
        if head.status_code == 200:
            return head.headers['Content-Type']
        else:
            cprint(f"\nGetting media type: {url} returned {head.status_code}", "red", file=sys.stderr)
    except Exception as e:
        cprint(f"\nError (${e}) for {url}", "red", file=sys.stderr)

def extract_details(days):
    details = {}
    for day in gen_timecode(days, 60*24):
        day = day[0:8]
        cprint(f"Extracting events from {day}", "red", file=sys.stderr)
        details[day] = {}
        details_html = requests.get(details_prefix + day).content
        soup = BeautifulSoup(details_html, 'html.parser')
        for event in soup.css.select('#events .evmark'):
            time = event.find('div', {'class': 'evtime'}).text.strip()
            timestamp = datetime.datetime.strptime(f"{day} {time}", '%Y%m%d %I:%M%p')
            timestamp = timestamp.replace(tzinfo=tz)
            text = event.find('div', {'class': 'evtext'}).text.strip()
            details[day][timestamp.isoformat()] = text
    return details

def condense(channels):
    condensed = {}
    for chan, timecodes in channels.items():
        # TODO: Extract base URL, see https://stackoverflow.com/a/53191091
        sorted_timecodes = OrderedDict(sorted(timecodes.items(), key = lambda x: datetime.datetime.fromisoformat(x[0])))
        condensed_timecodes = {}
        last_url = None
        last_timecode = None
        for timecode, urls in sorted_timecodes.items():
            if urls['video_url'] != None and last_url != urls['video_url']['src']:
                condensed_timecodes[timecode] = urls
                last_url = urls['video_url']['src']
                last_timecode = timecode
                del condensed_timecodes[timecode]['start_time']
            else:
                condensed_timecodes[last_timecode]['end'] = timecode
                #del condensed_timecodes[last_timecode]['start_time']

        condensed[chan] = condensed_timecodes
    return condensed

times = gen_timecode(timespan)

urls = {'channels': {}}
print(f"Processing {len(chans)} channels", file=sys.stderr)
for chan in chans:
    cprint(f"Processing {chan}, {len(times.items())} items", 'green', file=sys.stderr)
    urls['channels'][chan] = {}
    for time, dt in times.items():
        entry = {}
        url = eval('f"' + template + '"', {}, {'chan': chan, 'time': time})
        try:
            redirect = get_redirect_url(url)
        except requests.exceptions.ConnectionError:
            cprint(f"\nFailed to get {url}", "red", file=sys.stderr)
            continue
        if redirect != None:
            url_match = re.search(r'/details/911/day/(?P<day>\d{8})#id/(?P<id>.*)/start/(?P<time>\d{2}:\d{2}:\d{2}UTC/chan/(?P<chan>.*))', redirect)
            id_match = re.search(r'(.*)_(?P<start_date>200109\d{2})_(?P<start_time>\d{6})_(.*)', url_match.group('id'))

            video_url = {}
            video_url['src'] = f"https://archive.org/download/{url_match.group('id')}/{url_match.group('id')}.mp4"
            video_url['type'] = get_media_type(video_url['src'])
            entry['video_url'] = video_url
            entry['meta_url'] = f"https://archive.org/details/{url_match.group('id')}"
            if extended:
                entry['id'] = url_match.group('id')
                entry['redirect'] = redirect
                entry['url'] = url
                entry['fragment_url'] = f"{entry['url']}&raw=1"
            video_start = datetime.datetime.strptime(f"{id_match.group('start_date')} {id_match.group('start_time')}", '%Y%m%d %H%M%S')
            video_start = video_start.replace(tzinfo=datetime.timezone.utc)
            t = round((dt - video_start).total_seconds())
            entry['start_time'] = round((dt - video_start).total_seconds())

            # TODO: check end times
        else:
            entry['id'] = None
            entry['video_url'] = None
            cprint(f"Adding null for {url}", "red", file=sys.stderr)
        cprint('.', 'green', end="", flush=True, file=sys.stderr)
        urls['channels'][chan][dt.isoformat()] = entry
    print('', flush=True, file=sys.stderr)

# TODO: Generate missing timecodes for faster static noise

if condensed:
    urls['channels'] = condense(urls['channels'])

urls['metadata'] = metadata
urls['events'] = extract_details(timespan)

dump = json.dumps(urls, indent=4, default=str)
print(dump)
#print('\n'.join(urls))
