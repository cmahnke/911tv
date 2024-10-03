#!/usr/bin/env python

import datetime
import json
import re
import sys
import os
import logging
import argparse
from zoneinfo import ZoneInfo
from collections import OrderedDict
from time import sleep
from multiprocessing import Manager, Pool, Lock, Value, cpu_count
from queue import Empty
from functools import reduce
import httpx
from termcolor import cprint
from bs4 import BeautifulSoup
from pymediainfo import MediaInfo
from httpx import ConnectTimeout, ConnectError, ReadTimeout, HTTPStatusError, RemoteProtocolError
from httpcore import ReadTimeout as HttpcoreReadTimeout

# See https://archive.org/details/911
TEMPLATE = 'https://archive.org/details/911?time={time}&chan={chan}'
# Currently excluded: 'GLVSN',
chans = ['AZT', 'BBC', 'BET', 'CCTV3', 'CNN', 'IRAQ', 'MCM', 'NEWSW', 'NHK', 'NTV', 'TCN', 'WETA', 'WJLA', 'WORLDNET', 'WRC', 'WSBK', 'WTTG', 'WUSA']
timespan = ((11, 12), (18, 0))
METADATA = {'year':  2001, 'month': 9, 'timezone': 'America/New_York'}
EXTENDED = False
DURATION = True
HTTP2 = True
POOL_SIZE = max(cpu_count() * 2, 10)
DETAILS_PREFIX = 'https://archive.org/details/911/day/'
tz = ZoneInfo('America/New_York')
WAIT = 0
LOG_FILE = "./urls.log"
logger = logging.getLogger(__name__)
logging.basicConfig(filename=LOG_FILE, format='%(levelname)s %(asctime)s %(process)s %(message)s', level=logging.INFO)
logger.setLevel(logging.DEBUG)
timeout = 90
client = httpx.Client(http2=HTTP2, follow_redirects=True, timeout=timeout)
pool_close_wait = timeout * 2

class RequeueError(Exception):
    def __init__(self, message, count=0):
        super().__init__(message)
        self.count = count

class Counter(object):
    def __init__(self, initval=0):
        self.val = Value('i', initval)
        self.lock = Lock()

    def increment(self):
        with self.lock:
            self.val.value += 1

    def value(self):
        with self.lock:
            return self.val.value

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
def merge(first: dict, second: dict, path=[]):
    for key in second:
        if key in first:
            if isinstance(first[key], dict) and isinstance(second[key], dict):
                merge(first[key], second[key], path + [str(key)])
            elif first[key] != second[key]:
                raise Exception('Conflict at ' + '.'.join(path + [str(key)]))
        else:
            first[key] = second[key]
    return first

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
        req = httpx.get(url, timeout=timeout)
        if req.status_code in (302, 301):
            return req.headers['Location']
        cprint(f"\nResolving Redirect: {url} returned {req.status_code}", "red", file=sys.stderr)
    except ConnectTimeout:
        cprint(f"\nTimeout for {url}", "red", file=sys.stderr)
    return None

def get_media_type(url, verbose=False):
    if verbose:
        with Lock():
            logger.debug(f"Getting media type for {url}")
    head = client.head(url, timeout=timeout)
    if head.status_code == 200:
        return head.headers['Content-Type']
    logger.error(f"Getting media type: {url} returned {head.status_code}")
    return None

def get_video_duration(url, verbose=False):
    if verbose:
        with Lock():
            logger.debug(f"Getting video duration for {url}")
    media_info = MediaInfo.parse(url, **mediainfo_opts)
    duration = media_info.video_tracks[0].duration
    # Value is in ms
    return duration

def extract_details(days):
    details = {}
    for day in gen_timecode(days, 60*24):
        day = day[0:8]
        cprint(f"Extracting events from {day}", "green", file=sys.stderr)
        details_html = httpx.get(DETAILS_PREFIX + day, timeout=timeout).content
        soup = BeautifulSoup(details_html, 'html.parser')
        for event in soup.css.select('#events .evmark'):
            time = event.find('div', {'class': 'evtime'}).text.strip()
            timestamp = datetime.datetime.strptime(f"{day} {time}", '%Y%m%d %I:%M%p')
            timestamp = timestamp.replace(tzinfo=tz)
            timestamp = timestamp.astimezone(datetime.timezone.utc)
            text = event.find('div', {'class': 'evtext'}).text.strip()
            if len(text) > 2 * 40:
                cprint(f"Events text for {timestamp} is to long! ({len(text)})", "yellow", file=sys.stderr)
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
            elif urls['video_url'] is None and last_url is not None:
                condensed_timecodes[timecode] = urls
                last_url = None
                condensed_timecodes[timecode].pop('start_time', None)
                condensed_timecodes[timecode].pop('channel', None)
                condensed_timecodes[timecode].pop('timestamp', None)

        condensed[chan] = condensed_timecodes
    return condensed

def get_video_for_timecode(args):
    (chan, time, time_dt) = args
    entry = {}
    url = eval('f"' + TEMPLATE + '"', {}, {'chan': chan, 'time': time})
    try:
        redirect = get_redirect_url(url)
    except ConnectTimeout:
        cprint(f"\nFailed to get {url}", "red", file=sys.stderr)
        redirect =  None
    except Exception as e:
        raise e
    if redirect is not None:
        url_match = re.search(r'/details/911/day/(?P<day>\d{8})#id/(?P<id>.*)/start/(?P<time>\d{2}:\d{2}:\d{2}UTC/chan/(?P<chan>.*))', redirect)
        id_match = re.search(r'(.*)_(?P<start_date>200109\d{2})_(?P<start_time>\d{6})_(.*)', url_match.group('id'))

        video_url = {}
        video_url['src'] = f"https://archive.org/download/{url_match.group('id')}/{url_match.group('id')}.mp4"
        video_url['type'] = None

        entry['video_url'] = video_url
        entry['meta_url'] = f"https://archive.org/details/{url_match.group('id')}"
        entry['duration'] = None
        if EXTENDED:
            entry['id'] = url_match.group('id')
            entry['redirect'] = redirect
            entry['url'] = url
            entry['fragment_url'] = f"{entry['url']}&raw=1"
        video_start = datetime.datetime.strptime(f"{id_match.group('start_date')} {id_match.group('start_time')}", '%Y%m%d %H%M%S')
        video_start = video_start.replace(tzinfo=datetime.timezone.utc)
        entry['start_time'] = round((time_dt - video_start).total_seconds())
        # TODO: check end times
    else:
        if EXTENDED:
            entry['id'] = None
        entry['video_url'] = None
        cprint(f"Adding null for {url}", "red", file=sys.stderr)
    cprint('.', 'green', end="", flush=True, file=sys.stderr)
    entry['timestamp'] = time_dt.isoformat()
    entry['channel'] = chan
    return entry

def add_end(channels):
    # TODO: Check if list ends with empty video URLs
    for chan, timecodes in channels.items():
        sorted_timecodes = OrderedDict(sorted(timecodes.items(), key = lambda x: datetime.datetime.fromisoformat(x[0])))
        last = list(sorted_timecodes.keys())[-1]
        if 'duration' in channels[chan][last]:
            channels[chan]['end'] = datetime.datetime.fromisoformat(last) + datetime.timedelta(milliseconds=channels[chan][last]['duration'])
    return channels

def enrich_worker(q, r, download_counter):
    while True:
        try:
            item = q.get(timeout=10)
        except Empty:
            break
        if item is None:
            break
        (chan, timecode, urls, retry_count) = item
        if urls['video_url'] is None:
            cprint("O", "yellow", end='', flush=True, file=sys.stderr)
            with Lock():
                logger.error(f"Error: Video URL for {chan} at {timecode} is None")
            continue
        entry = {}
        entry[chan] = {}
        identifier = urls['video_url']['src']
        verbose = False
        if retry_count > 0:
            verbose = True
        try:
            if urls['video_url'] is not None and 'src' in urls['video_url']:
                url = urls['video_url']['src']
                if urls['video_url']['type'] is None:
                    urls['video_url']['type'] = get_media_type(url, verbose)
                if DURATION and urls['duration'] is None:
                    urls['duration'] = get_video_duration(url, verbose)
                else:
                    cprint(f"Error: Video URL {urls['video_url']} set but no 'src', this shouldn't happen", "red", file=sys.stderr)
                    raise
            entry[chan][timecode] = urls
            r.put(entry, block=True)
            with Lock():
                logger.debug(f"Sucessfully enriched {identifier}")
            cprint('.', 'green', end='', flush=True, file=sys.stderr)
            if WAIT > 0:
                sleep(WAIT / 1000)
            download_counter.increment()
        except (ConnectTimeout, ConnectError, ReadTimeout, HttpcoreReadTimeout, RemoteProtocolError, RuntimeError) as e:
            if (isinstance(e, RuntimeError)):
                with Lock():
                    logger.error(f"Getting duration for {identifier} failed ({repr(e)})")
            elif isinstance(e, ConnectError):
                with Lock():
                    logger.error(f"Connection refused for {identifier} ({repr(e)})")
            elif isinstance(e, ConnectTimeout):
                with Lock():
                    logger.error(f"Connect timeout for {identifier} ({repr(e)})")
            elif isinstance(e, ReadTimeout) or isinstance(e, HttpcoreReadTimeout):
                with Lock():
                    logger.error(f"Timeout for {identifier} ({repr(e)})")
            elif isinstance(e, RemoteProtocolError):
                with Lock():
                    logger.error(f"Remote closed the connection {identifier} ({repr(e)})")
            else:
                with Lock():
                    logger.error(f"! Unhandled Exception ! for {identifier} ({repr(e)})")

            if retry_count > 0:
                with Lock():
                    logger.warning(f"Retries for {identifier}: {retry_count}")

            retry_count += 1
            item = (chan, timecode, urls, retry_count)

            q.put(item, block=True)
            with Lock():
                logger.error(f"{type(e).__name__} getting {identifier}, requeueing")
            cprint("X", "red", end='', flush=True, file=sys.stderr)
        except StopIteration as e:
            q.put(item, block=True)
            with Lock():
                logger.error(f"{type(e).__name__} getting {identifier}, requeueing")
            cprint('x', 'yellow', end='', flush=True, file=sys.stderr)
        except KeyboardInterrupt as e:
            pool.terminate()
            pool.join()
            logging.critical(f"Interuped by user ({type(e).__name__})")
            return

#        except Exception as e:
#            raise e

        if download_counter.value() % 1000 == 0:
            cprint(f"\n{download_counter.value()}", 'green', flush=True, file=sys.stderr)

# Main program
if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='gen_urls.py')
    parser.add_argument('--output', '-o', help='Output file')
    args = parser.parse_args()

    cprint(f"Using {POOL_SIZE} processes, using { mediainfo_opts['library_file'] if 'library_file' in mediainfo_opts else 'buildin' } as mediainfo dependency", "yellow", file=sys.stderr)
    times = gen_timecode(timespan)

    urls = {
        'metadata': METADATA,
        'events': extract_details(timespan),
        'channels': {}
    }

    channels = {}
    print(f"Preprocessing {len(chans)} channels", file=sys.stderr)
    for chan in chans:
        logger.debug(f"Preprocessing {chan}, {len(times.items())} items")
        channels[chan] = {}
        entries = []
        for time, time_dt in times.items():
            entries.append((chan, time, time_dt))
        with Pool(POOL_SIZE) as P:
            processed_entries = P.map(get_video_for_timecode, entries)
            P.close()
            P.join()
        for entry in processed_entries:
            channels[chan][entry['timestamp']] = entry
            channels[chan][entry['timestamp']].pop('channel', None)
            channels[chan][entry['timestamp']].pop('timestamp', None)

        print('', flush=True, file=sys.stderr)

    cprint(f"Preprocessed channels...", 'green', file=sys.stderr)
    download_counter = Counter(0)
    m = Manager()
    q = m.Queue()
    r = m.Queue()
    for chan, timecodes in condense(channels).items():
        for timecode, urls_dict in timecodes.items():
            #logger.debug(f"Adding {chan}, {timecode}, {urls_dict} to queue")
            q.put((chan, timecode, urls_dict, 0))
    cprint(f"Enriching {len(processed_entries)} items using a queue of {q.qsize()}", 'green', file=sys.stderr)
    pool = Pool(POOL_SIZE, enrich_worker, (q, r, download_counter))
    logger.debug(f"=== Filled pool === \nEnriching {len(processed_entries)} items using a queue of {q.qsize()}")
    cprint('Filled pool', 'green', flush=True, file=sys.stderr)

    while not q.empty():
        logger.debug(f"Queue size is {q.qsize()}, up to {POOL_SIZE} running, already finished {download_counter.value()}")
        sleep(10)
    cprint(f"\nClosing worker pool in {pool_close_wait}s", 'green', flush=True, file=sys.stderr)
    logger.debug(f"Queue is empty, closing in {pool_close_wait}s")
    sleep(pool_close_wait)
    pool.close()
    pool.join()

    cprint(f"Fetch metadata {download_counter.value()} of entries", "green", flush=True, file=sys.stderr)

    enriched_entries = []
    #cprint('Fetching from result queue', 'green', flush=True, file=sys.stderr)
    while not r.empty():
        result = r.get(timeout=1)
        #logger.debug(f"Extracting result {result}")
        enriched_entries.append(result)

    channels = reduce(merge, enriched_entries)
    urls['channels'] = add_end(channels)

    urls_json = json.dumps(urls, indent=4, default=str)
    if args.output and not args.output == '-':
        with open(args.output, 'w') as file:
            file.write(urls_json)
    else:
        print(urls_json)
