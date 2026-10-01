#!/usr/bin/env python3
"""Local-only editor for the photography mosaic in index.html.

Run from the repo root: python3 tools/gallery/server.py, then open http://localhost:8001.
Reads and rewrites the .photo-item blocks inside #photo-scroller, keeping each block's text verbatim.
"""

import hashlib
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
EDITOR = Path(__file__).with_name("index.html")
PORT = 8001

ITEM = re.compile(r'[ \t]*<button type="button"\s+class="photo-item".*?</button>', re.S)
HIDDEN = re.compile(r'\n[ \t]*hidden[ \t]*(?=\n)')


def load():
    text = INDEX.read_text()
    start = text.index('id="photo-scroller"')
    end = text.index("</section>", start)
    items = list(ITEM.finditer(text, start, end))
    return text, items


def attr(block, name):
    m = re.search(rf'{name}="([^"]*)"', block)
    return m.group(1) if m else ""


def set_hidden(block, hidden):
    block = HIDDEN.sub("", block)
    if hidden:
        indent = re.search(r'\n([ \t]*)class="photo-item"', block).group(1)
        block = block.replace('class="photo-item"', f'class="photo-item"\n{indent}hidden', 1)
    return block


def snapshot():
    text, items = load()
    photos = [
        {
            "id": i,
            "src": attr(m.group(0), "src"),
            "caption": attr(m.group(0), "data-caption"),
            "tone": attr(m.group(0), "data-tone"),
            "hidden": bool(HIDDEN.search(m.group(0))),
        }
        for i, m in enumerate(items)
    ]
    return {"version": hashlib.sha1(text.encode()).hexdigest(), "photos": photos}


def save(body):
    text, items = load()
    if hashlib.sha1(text.encode()).hexdigest() != body["version"]:
        raise ValueError("index.html changed on disk since the editor loaded it; reload first")
    blocks = [m.group(0) for m in items]
    ids = [p["id"] for p in body["photos"]]
    if len(set(ids)) != len(ids) or not all(0 <= i < len(blocks) for i in ids):
        raise ValueError("photo ids do not match index.html")
    out = "\n".join(set_hidden(blocks[p["id"]], p["hidden"]) for p in body["photos"])
    INDEX.write_text(text[: items[0].start()] + out + text[items[-1].end():])


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body, kind="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/":
            self.reply(200, EDITOR.read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/photos":
            self.reply(200, snapshot())
        else:
            self.reply(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/photos":
            return self.reply(404, {"error": "not found"})
        try:
            save(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        except (ValueError, KeyError) as e:
            return self.reply(409, {"error": str(e)})
        self.reply(200, snapshot())


if __name__ == "__main__":
    print(f"Gallery editor for {INDEX} on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
