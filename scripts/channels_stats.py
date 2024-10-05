#!/usr/bin/env python

import datetime
import json
import argparse
import logging
import datetime
import re
from collections import OrderedDict
from termcolor import cprint
from dateutil.parser import *

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
                except:
                    cprint(f"Failed to parse {k}", 'red')
            else:
                ret[k] = v
        return ret


def get_channels(json):
    return list(json["channels"].keys())

def channel_stats(channel):
    pass

# Main program
if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='channel_stats.py')
    parser.add_argument('--input', '-i', required=True, help='Input file')
    args = parser.parse_args()

    if args.input and not args.input == '-':
        with open(args.input) as f:
            json = json.load(f, cls=ChannelDecoder)

    for c in get_channels(json):
        print(f"{c} {len(json["channels"][c].keys())}")


    for c in get_channels(json):
        for time, video in json["channels"][c].items():
            if isinstance(time, datetime.datetime):
                print(f"{c}: {time} + {video["duration"]}ms = {time + datetime.timedelta(0, video["duration"] / 1000)}")
