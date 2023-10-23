#!/usr/bin/env python

import json
import re
import sys
from pathlib import Path
import math
from PIL import Image, ImageOps
import numpy
import frontmatter
import markdown
from bs4 import BeautifulSoup
from termcolor import cprint
import emoji

CONTENT_DIR = './contents'
CONTENT_PATTERN = '**/*.md'
SUBPAGE_SEPERATOR = '<!--more-->'

# pylint: disable=invalid-name,undefined-variable

# This is a direct port of https://bitbucket.org/rahardy/image-to-sextants/
class ImageToSextants:

    sextantsToUnicode = [
      ' ', '🬀', '🬁', '🬂', '🬃', '🬄', '🬅', '🬆', '🬇', '🬈', '🬉', '🬊', '🬋', '🬌', '🬍', '🬎',
      '🬏', '🬐', '🬑', '🬒', '🬓', '▌', '🬔', '🬕', '🬖', '🬗', '🬘', '🬙', '🬚', '🬛', '🬜', '🬝',
      '🬞', '🬟', '🬠', '🬡', '🬢', '🬣', '🬤', '🬥', '🬦', '🬧', '▐', '🬨', '🬩', '🬪', '🬫', '🬬',
      '🬭', '🬮', '🬯', '🬰', '🬱', '🬲', '🬳', '🬴', '🬵', '🬶', '🬷', '🬸', '🬹', '🬺', '🬻', '█'
    ]

    ATTRIBUTES = {
        "black":   "\x10",
        "red":     "\x11",
        "green":   "\x12",
        "yellow":  "\x13",
        "blue":    "\x14",
        "magenta": "\x15",
        "cyan":    "\x16",
        "white":   "\x17",
        "newBackground": "\x1d"
    }

    def __init__(self, buffer, width):
        self._buffer = buffer
        self._widthPx = width
        self._heightPx = int(len(buffer) / width)
        if not isinstance(width, int):
            raise ValueError('E9 ImageToSextants: width should be integer')
        if not isinstance(self._heightPx, int):
            raise ValueError(f'E11 ImageToSextants: bad width {width} for buffer length {len(buffer)}')
        self._numRows = math.floor(self._heightPx / 3)
        self._numCols = math.floor(self._widthPx / 2)

    def getSextants(self, col, row):
        xIdx = col * 2
        yIdx = row * self._widthPx * 3
        rootIndex = yIdx + xIdx
        if row >= self._numRows:
            raise ValueError(f'E25 ImageToSextants: row {row} out of range for number of rows {self._numRows}')
        if col >= self._numCols:
            raise ValueError(f'E27 ImageToSextants: col {col} out of range for number of cols {self._numCols}')
        result = [
            self._buffer[rootIndex],
            self._buffer[rootIndex + 1],
            self._buffer[rootIndex + self._widthPx],
            self._buffer[rootIndex + self._widthPx + 1],
            self._buffer[rootIndex + self._widthPx * 2],
            self._buffer[rootIndex + self._widthPx * 2 + 1]
        ]
        return [p if p is not None else 0 for p in result]

    def getValueFromSextants(self, col, row):
        cells = self.getSextants(col, row)
        isPixelOn = lambda v: 1 if v > 127 else 0
        val = isPixelOn(cells[0]) + \
              (isPixelOn(cells[1]) << 1) + \
              (isPixelOn(cells[2]) << 2) + \
              (isPixelOn(cells[3]) << 3) + \
              (isPixelOn(cells[4]) << 4) + \
              (isPixelOn(cells[5]) << 5)
        return val

    def getTeletextG1Char(self, col, row):
        value = getValueFromSextants(col, row)
        if value < 0x20:
            result = chr(value + 0x20)
        else:
            result = chr(value + 0x40)
        return result

    def getUnicodeChar(self, col, row):
        value = self.getValueFromSextants(col, row)
        return self.sextantsToUnicode[value]

    def getTeletextG1Rows(self, options):
        rows = []
        for r in range(0, self._numRows):
            cols = []
            for c in range(0, self._numCols):
                cols.append(getTeletextG1Char(c, r))
            rows.append(''.join(cols))
        rows = self.addColourAttributesToRows(rows, options)
        return rows

    def unicodeRows(self):
        rows = []
        for r in range(0, self._numRows):
            cols = []
            for c in range(0, self._numCols):
                cols.append(self.getUnicodeChar(c, r))
            rows.append(''.join(cols))
        return rows

    def addColourAttributesToRows(self, rows, options={}):
        bg = options.get('background', None)
        fg = options.get('foreground', None)
        if bg and bg not in self.ATTRIBUTES:
            raise ValueError(f"E109 bad background: {bg}")
        if fg and fg not in self.ATTRIBUTES:
            raise ValueError(f"E110 bad foreground: {fg}")
        if bg == 'black':
            bg = None
        if bg and not fg:
            fg = 'white'
        if fg or bg:
            rows = [self.ATTRIBUTES[bg] + self.ATTRIBUTES['newBackground'] + row if bg else self.ATTRIBUTES[fg] + row for row in rows]
        return rows

    def html(self):
        rows = '\n'.join(self.unicodeRows())
        return '<pre class="teletext-graphic">' + f"{rows}</pre>"

def check_page_size(md):
    html = markdown.markdown(md, extensions=['attr_list'])
    # See https://stackoverflow.com/a/761847
    text = ''.join(BeautifulSoup(html, features='lxml').findAll(string=True))
    text_lines = text.splitlines()
    if len(text_lines) > 23:
        cprint(f"Text from {file} has to many lines: {len(text_lines)}", "red", file=sys.stderr)
    max_length = 0
    for line in text_lines:
        if len(line) > max_length:
            max_length = len(line)
    if max_length > 40:
        cprint(f"Text from {file} has to long line: {max_length}", "red", file=sys.stderr)

def check_images(md_content, file, max_height=23):
    search_dir = file.parent
    for match in re.finditer(r'!\[(?P<alt>.*?)]\((?P<src>.*?)\)({:(?P<attrs>.*?)})?', md_content):
        img_src = search_dir.joinpath(match.group('src'))
        cprint(f"Loading image {img_src}", "yellow", flush=True, file=sys.stderr)
        with Image.open(img_src) as img:
            if img.mode == '1':
                img = img.convert('L')
            img = ImageOps.invert(img)
            if img.size[1] > max_height * 3:
                cprint(f"Resizing image {img_src} height from {img.size[1]} to {max_height * 3}", "yellow", flush=True, file=sys.stderr)
                img.thumbnail((60, max_height * 3), Image.Resampling.NEAREST)
            #img.thumbnail((60,60), Image.Resampling.NEAREST)
            img = img.resize((round(img.size[0] * (8/9)), img.size[1]))
            ba = numpy.asarray(img).astype(numpy.uint8).flatten()
            converter = ImageToSextants(ba, img.size[0])
            rows = '\n'.join(converter.unicodeRows())
            css_classes = 'teletext-graphic'
            if 'class' in match.group('attrs'):
                css_classes += ' ' + re.search(r'class="(.*)"', match.group('attrs')).group(1)
            html = f'<pre class="{css_classes}">' + f"{rows}</pre>"
            if match.group('attrs') == '':
                md_content = md_content.replace(f"![{match.group('alt')}]({match.group('src')})", html)
            else:
                md_content = md_content.replace(f"![{match.group('alt')}]({match.group('src')}){{:{match.group('attrs')}}}", html)
    return md_content

def count_headings(md_content):
    html = markdown.markdown(md_content)
    count = len(BeautifulSoup(html, features="lxml").find_all(['h1', 'h2']))
    if count is None:
        return 0
    return count


pages = []
for file in Path(CONTENT_DIR).glob(CONTENT_PATTERN):
    page = {}
    cprint(f"Loading file {file}", 'green', flush=True, file=sys.stderr)
    post = frontmatter.load(file)
    if 'number' in post and 'title' in post:
        cprint(f"Processing file {file}", 'green', flush=True, file=sys.stderr)
        # Do a sanity check
        check_page_size(post.content)
        height = 23 - count_headings(post.content)
        md_content = check_images(post.content, file, height)
        md_content = emoji.demojize(md_content, delimiters=("", ""))
        if SUBPAGE_SEPERATOR in post.content:
            html = []
            for subpage in md_content.split(SUBPAGE_SEPERATOR):
                html.append(markdown.markdown(subpage, extensions=['attr_list']))

        else:
            html = markdown.markdown(md_content, extensions=['attr_list'])

        page['markdown'] = post.content
        page['html'] = html
        page['number'] = post['number']
        page['title'] = post['title']
        pages.append(page)

dump = json.dumps(pages, indent=4)
print(dump)
