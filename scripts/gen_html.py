#!/usr/bin/env python

import sys
import json
import re
import argparse, pathlib

defaultOutfile = "tt.html"
skip = [404]

lang = "en"
title = ""
stylesheet = ""

def process_html(j):
    pages = []
    sorted(j, key=lambda e: e['number'])
    for page in j:
        if page['number'] in skip:
            continue

        html = re.sub(r'href="(\d*)"', 'href="#\\1"', page['html'])
        html = re.sub(r'^(.*)<!-- -->.*$', "\\1", html, flags=re.DOTALL)

        pages.append(f'<div><div class="page-title">{page['title']}</div><div class="page-nr">{page['number']}</div>\n{html}</div>')

    return pages

def main(argv) -> int:
    parser = argparse.ArgumentParser(prog="gen_html.py", description="Merge teletext tables")
    parser.add_argument("file", type=pathlib.Path, help="Input file name")
    parser.add_argument("-o", "--output", help="Output file name, defaults to '{}'".format(defaultOutfile))

    args = parser.parse_args()

    if args.file:
        with open(args.file) as f:
            j = json.load(f)

    out = f"""
<!DOCTYPE html>
<html lang="{lang}">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <link rel="stylesheet" href="{stylesheet}">
</head>

<body>
  {"".join(process_html(j))}
</body>

</html>
    """

    if args.output and args.output != "-":
        with open(args.output, "w") as toml_file:
            toml_file.write(out)
    else:
        print(out)

if __name__ == "__main__":
    main(sys.argv[1:])
