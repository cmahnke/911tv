#!/usr/bin/env python

import datetime
import json
import argparse
import sys
import re
from termcolor import cprint
from zoneinfo import ZoneInfo
from dateutil.parser import parse, ParserError

tz = ZoneInfo('America/New_York')

class ChannelDecoder(json.JSONDecoder):
    def __init__(self, *args, **kwargs):
        json.JSONDecoder.__init__(
            self, object_hook=self.object_hook, *args, **kwargs)

    def object_hook(self, obj):
        regex = r"\d{4}-\d{2}-\d{2}T\d{2}:.*"
        ret = {}
        for k, v in obj.items():
            if isinstance(k, str) and re.search(regex, k):
                try:
                    key = parse(k)
                    ret[key] = v
                except ParserError:
                    cprint(f"Failed to parse {k}", 'red')
            else:
                ret[k] = v
        return ret

def until(start, length_ms):
    return start + datetime.timedelta(milliseconds=length_ms)

def get_channels(json):
    return list(json["channels"].keys())

def channel_durations(epg, c=None):
    def single(epg, c):
        for time, video in epg["channels"][c].items():
            if isinstance(time, datetime.datetime):
                print(f"{c}: {show_time(time)} + {video["duration"]}ms = {show_time(until(time, video["duration"]))}")

    if c is None:
        for c in get_channels(epg):
            single(epg, c)
    else:
        single(epg, c)

def chunks(epg, c=None):
    def single(epg, c):
        print(f"{c} {len(epg["channels"][c].keys())}")

    if c is None:
        for c in get_channels(epg):
            single(epg, c)
    else:
        single(epg, c)

def ends(epg, c=None):
    def single(epg, c):
        print(f"{c} {show_time(parse(epg["channels"][c]["end"]))}")

    if c is None:
        for c in get_channels(epg):
            single(epg, c)
    else:
        single(epg, c)

def gaps(epg, c=None, echo=True):
    def single(epg, c):
        def previuos_end(j):
            p = epg["channels"][c][dates[j-1]]
            return until(dates[j-1], p["duration"])
        missing_footage = []
        dates = list(epg["channels"][c].keys())
        dates = list(filter(lambda elm: isinstance(elm, datetime.datetime), dates))
        for i, _ in enumerate(dates):
            k = dates[i]
            #entry = epg["channels"][c][k]
            if i > 0:
                pe = previuos_end(i)
                if pe < k:
                    m = {"channel": c, "previuos_end": pe, "next_start": k, "missing": k - pe}
                    missing_footage.append(m)
                    if echo:
                        print(f"{c}: Gap found between {show_time(m['previuos_end'])} and {show_time(m['next_start'])}: {m['missing']}")


    if c is None:
        for c in get_channels(epg):
            single(epg, c)
    else:
        single(epg, c)

def show_time(time):
    global show_local
    if not show_local:
        return time.isoformat()
    return time.astimezone(tz).isoformat()

commands = {
    "durations": channel_durations,
    "chunks": chunks,
    "gaps": gaps,
    "ends": ends
}
show_local = False

# Main program
if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='channel_stats.py')
    parser.add_argument('--input', '-i', required=True, help='Input file')
    parser.add_argument('--channel', '-c', required=False, help='Channel to display')
    parser.add_argument('--timezone', '-t', action='store_true', required=False, help='Display dates in ')
    parser.add_argument("stat", type=str, choices=list(commands.keys()), help='Stat to print')
    args = parser.parse_args()

    if args.input and not args.input == '-':
        with open(args.input, encoding='utf-8') as f:
            json = json.load(f, cls=ChannelDecoder)

    if args.channel:
        if args.channel.upper() in json["channels"]:
            channel = args.channel.upper()
        else:
            cprint(f"Channel {args.channel.upper()} not in list, choose from {get_channels(json)}!", 'red')
            sys.exit(1)
    else:
        channel = None

    if args.timezone:
        show_local = True

    if args.stat:
        commands[args.stat](json, channel)
    else:
        chunks(json, channel)
        channel_durations(json, channel)
