#!/usr/bin/env python

import json, re, sys
from pathlib import Path
import frontmatter
import markdown

content_dir = './contents'
content_pattern = '*.md'

pages = []
for file in Path(content_dir).glob(content_pattern):
    page = {}
    print(f"Loading file {file}", end="", flush=True, file=sys.stderr)
    post = frontmatter.load(file)
    if 'number' in post and 'title' in post:
        page['markdown'] = post.content
        page['html'] = markdown.markdown(post.content, extensions=['attr_list'])
        page['number'] = post['number']
        page['title'] = post['title']
        pages.append(page)

dump = json.dumps(pages, indent=4)
print(dump)
