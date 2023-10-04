#!/usr/bin/env python

import datetime, json, re, sys
import requests

# See https://archive.org/details/911
template = 'https://archive.org/details/911?time={time}&chan={chan}'
chans = ['AZT', 'BBC', 'BET', 'CCTV3', 'CNN', 'GLVSN', 'IRAQ', 'MCM', 'NEWSW', 'NHK', 'NTV', 'TCN', 'WETA', 'WJLA', 'WORLDNET', 'WRC', 'WSBK', 'WTTG', 'WUSA']
timespan = ((11, 2), (17, 0))
metadata = {'year':  2001, 'month': 9}
extended = True

def gen_timecode(days):
    # Format: 200109111200
    global metadata
    timestamps = {}
    timestamp = datetime.datetime(metadata['year'], metadata['month'], days[0][0], days[0][1], tzinfo=datetime.timezone.utc)
    end = datetime.datetime(metadata['year'], metadata['month'], days[1][0], days[1][1], 59, 59, tzinfo=datetime.timezone.utc)
    step = datetime.timedelta(minutes=10)

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
            print(f"{url} returned {req.status_code}")
    except requests.exceptions.ReadTimeout:
        print(f"Timeout for {url}")

times = gen_timecode(timespan)

urls = {}
for chan in chans:
    urls[chan] = {}
    for time, dt in times.items():
        entry = {}
        url = eval('f"' + template + '"', {}, {'chan': chan, 'time': time})
        try:
            redirect = get_redirect_url(url)
        except requests.exceptions.ConnectionError:
            print(f"Failed to get {entry['url']}", file=sys.stderr)
            continue
        if redirect != None:
            url_match = re.search(r'/details/911/day/(?P<day>\d{8})#id/(?P<id>.*)/start/(?P<time>\d{2}:\d{2}:\d{2}UTC/chan/(?P<chan>.*))', redirect)
            id_match = re.search(r'(.*)_(?P<start_date>200109\d{2})_(?P<start_time>\d{6})_(.*)', url_match.group('id'))

            entry['id'] = url_match.group('id')
            entry['video_url'] = f"https://archive.org/download/{url_match.group('id')}/{url_match.group('id')}.mp4"
            if extended:
                entry['redirect'] = redirect
                entry['url'] = url
                entry['fragment_url'] = f"{entry['url']}&raw=1"
                entry['meta_url'] = f"https://archive.org/details/{url_match.group('id')}"
            video_start = datetime.datetime.strptime(f"{id_match.group('start_date')} {id_match.group('start_time')}", '%Y%m%d %H%M%S')
            video_start = video_start.replace(tzinfo=datetime.timezone.utc)
            t = round((dt - video_start).total_seconds())
            entry['start_time'] = round((dt - video_start).total_seconds())
        else:
            print(f"{url} returned no redirect", file=sys.stderr)

        urls[chan][dt.isoformat()] = entry

# TODO: Generate missing timecodes for faster static noise

urls['metadata'] = metadata

dump = json.dumps(urls, indent=4)
print(dump)
#print('\n'.join(urls))
