#!/usr/bin/env python

import json, re, sys
from pathlib import Path
import frontmatter

content_dir = './contents'
content_pattern = '*.md'

pages = []
for file in Path(content_dir).glob(content_pattern):
    page = {}
    print(f"Loading file {file}", end="", flush=True, file=sys.stderr)
    post = frontmatter.load(file)
    if 'number' in post and 'title' in post:
        page['content'] = post.content
        page['number'] = post['number']
        page['title'] = post['title']
        pages.append(page)

dump = json.dumps(pages, indent=4)
print(dump)
