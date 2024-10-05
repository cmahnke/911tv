#!/usr/bin/env python

import datetime
import json
import argparse
import sys
#import logging
import re
#from collections import OrderedDict
from termcolor import cprint
from dateutil.parser import parse, ParserError

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

def until(start, lengthMs):
    return start + datetime.timedelta(0, lengthMs / 1000)


def get_channels(json):
    return list(json["channels"].keys())

def channel_durations(epg, c=None):
    def single(epg, c):
        for time, video in epg["channels"][c].items():
            if isinstance(time, datetime.datetime):
                print(f"{c}: {time} + {video["duration"]}ms = {until(time, video["duration"])}")

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

def gaps(epg, c=None):
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
                    print(f"{c}: Gap found between {m['previuos_end']} and {m['next_start']}: {m['missing']}")


    if c is None:
        for c in get_channels(epg):
            single(epg, c)
    else:
        single(epg, c)

commands = {
    "durations": channel_durations,
    "chunks": chunks,
    "gaps": gaps
}

# Main program
if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='channel_stats.py')
    parser.add_argument('--input', '-i', required=True, help='Input file')
    parser.add_argument('--channel', '-c', required=False, help='Channel to display')
    parser.add_argument("stat", type=str, choices=list(commands.keys()), help='Stat to print')
    args = parser.parse_args()

    if args.input and not args.input == '-':
        with open(args.input, encoding='utf-8') as f:
            json = json.load(f, cls=ChannelDecoder)

    if args.channel:
        if args.channel in json["channels"]:
            channel = args.channel
        else:
            cprint(f"Channel {args.channel} not in list, choose from {get_channels(json)}!", 'red')
            sys.exit(1)
    else:
        channel = None

    if args.stat:
        commands[args.stat](json, channel)
    else:
        chunks(json, channel)
        channel_durations(json, channel)
