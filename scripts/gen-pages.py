#!/usr/bin/env python

import json, re, sys
from pathlib import Path
import frontmatter
import markdown
from bs4 import BeautifulSoup
from termcolor import cprint

content_dir = './contents'
content_pattern = '*.md'

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

pages = []
for file in Path(content_dir).glob(content_pattern):
    page = {}
    print(f"Loading file {file}", end="", flush=True, file=sys.stderr)
    post = frontmatter.load(file)
    if 'number' in post and 'title' in post:
        # Do a sanity check
        check_page_size(post.content)
        #TODO: Split pages if required here 
        html = markdown.markdown(post.content, extensions=['attr_list'])
        page['markdown'] = post.content
        page['html'] = html
        page['number'] = post['number']
        page['title'] = post['title']
        pages.append(page)

dump = json.dumps(pages, indent=4)
print(dump)
