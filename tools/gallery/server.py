#!/usr/bin/env python3
"""Local-only editor for index.html: the photography mosaic order and captions, and every page text in place.

Run from the repo root: python3 tools/gallery/server.py, then open http://localhost:8001.
Reads and rewrites the .photo-item blocks inside #photo-scroller, keeping each block's text verbatim.
Pages under /site/ are served with a data-edit attribute added to each text-only element, holding its offset
in the source file; those attributes exist only in the served copy, never on disk.
Every save writes the source file and commits it to the local checkout; nothing is ever pushed.
"""

import hashlib
import html
import json
import mimetypes
import re
import subprocess
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
EDITOR = Path(__file__).with_name("index.html")
PAGE_EDITOR = Path(__file__).with_name("page-editor.js")
PORT = 8001

ITEM = re.compile(r'[ \t]*<button type="button"\s+class="photo-item".*?</button>', re.S)
HIDDEN = re.compile(r'\n[ \t]*hidden[ \t]*(?=\n)')
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP = {"head", "script", "style", "svg", "template", "textarea", "select"}


def load():
    text = INDEX.read_text()
    start = text.index('id="photo-scroller"')
    end = text.index("</section>", start)
    items = list(ITEM.finditer(text, start, end))
    return text, items


def attr(block, name):
    m = re.search(rf'{name}="([^"]*)"', block)
    return html.unescape(m.group(1)) if m else ""


def set_attr(block, name, value):
    return re.sub(rf'(\s{name}=")[^"]*"', lambda m: m.group(1) + html.escape(value) + '"', block, count=1)


def set_hidden(block, hidden):
    block = HIDDEN.sub("", block)
    if hidden:
        indent = re.search(r'\n([ \t]*)class="photo-item"', block).group(1)
        block = block.replace('class="photo-item"', f'class="photo-item"\n{indent}hidden', 1)
    return block


def set_text(block, caption, description):
    old = attr(block, "data-description")
    block = set_attr(block, "data-caption", caption)
    if description != old:
        if "data-description=" not in block:
            indent = re.search(r'\n([ \t]*)data-caption=', block).group(1)
            block = re.sub(r'(data-caption="[^"]*")', rf'\1\n{indent}data-description=""', block, count=1)
        block = set_attr(block, "data-description", description)
        if attr(block, "alt") == old:
            block = set_attr(block, "alt", description)
    return block


def snapshot():
    text, items = load()
    photos = [
        {
            "id": i,
            "src": attr(m.group(0), "src"),
            "caption": attr(m.group(0), "data-caption"),
            "description": attr(m.group(0), "data-description"),
            "tone": attr(m.group(0), "data-tone"),
            "hidden": bool(HIDDEN.search(m.group(0))),
        }
        for i, m in enumerate(items)
    ]
    return {"version": hashlib.sha1(text.encode()).hexdigest(), "photos": photos}


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def ensure_clean(path):
    """Refuse to edit a file with uncommitted changes, so a commit never sweeps in someone else's work."""
    if git("status", "--porcelain", "--", str(path)).strip():
        raise ValueError(f"{path.relative_to(ROOT)} has uncommitted changes; commit or discard them first")


def commit(path, subject, lines=()):
    git("commit", "--only", "-m", "\n\n".join([subject, "\n".join(lines)]).strip(), "--", str(path))


def save(body):
    text, items = load()
    if hashlib.sha1(text.encode()).hexdigest() != body["version"]:
        raise ValueError("index.html changed on disk since the editor loaded it; reload first")
    ensure_clean(INDEX)
    blocks = [m.group(0) for m in items]
    ids = [p["id"] for p in body["photos"]]
    if len(set(ids)) != len(ids) or not all(0 <= i < len(blocks) for i in ids):
        raise ValueError("photo ids do not match index.html")
    log = []
    for p in body["photos"]:
        old = blocks[p["id"]]
        for key in ("caption", "description"):
            if p[key] != attr(old, f"data-{key}"):
                log.append(f"- {key}: {attr(old, f'data-{key}')!r} -> {p[key]!r}")
        blocks[p["id"]] = set_text(set_hidden(old, p["hidden"]), p["caption"], p["description"])
    out = "\n".join(blocks[p["id"]] for p in body["photos"])
    new = text[: items[0].start()] + out + text[items[-1].end():]
    if new == text:
        return
    INDEX.write_text(new)
    reordered = [p["id"] for p in body["photos"]] != list(range(len(items))) or any(
        p["hidden"] != bool(HIDDEN.search(items[p["id"]].group(0))) for p in body["photos"]
    )
    what = " and ".join(w for w, on in (("reorder", reordered), ("edit captions of", log)) if on)
    commit(INDEX, f"content(index.html): {what} the photography mosaic", log)


class Spans(HTMLParser):
    """Maps each text-only element (no child elements, some visible text) to the offsets of its content."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.text = text
        self.lines = [0] + [m.end() for m in re.finditer("\n", text)]
        self.stack = []
        self.spans = {}  # content start -> (content end, tag end, tag name length)
        self.feed(text)
        self.close()

    def pos(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if self.stack:
            self.stack[-1]["leaf"] = False
        if tag in VOID:
            return
        start = self.pos()
        self.stack.append({"tag": tag, "start": start, "content": start + len(self.get_starttag_text()), "leaf": True})

    def handle_endtag(self, tag):
        if not any(e["tag"] == tag for e in self.stack):
            return
        while (e := self.stack.pop())["tag"] != tag:
            pass
        end = self.pos()
        inside = any(s["tag"] in SKIP for s in self.stack) or tag in SKIP
        if e["leaf"] and not inside and self.text[e["content"]:end].strip():
            self.spans[e["content"]] = (end, e["start"] + 1 + len(tag))


def plain(source):
    return " ".join(html.unescape(source).split())


def site_file(rel):
    path = (ROOT / unquote(rel).lstrip("/")).resolve()
    if not path.is_relative_to(ROOT) or ".git" in path.relative_to(ROOT).parts:
        raise ValueError("outside the site")
    return path / "index.html" if path.is_dir() else path


def annotated(path):
    text = path.read_text()
    out, last = [], 0
    for start, (_, name_end) in sorted(Spans(text).spans.items(), key=lambda s: s[1][1]):
        out += [text[last:name_end], f' data-edit="{start}"']
        last = name_end
    out.append(text[last:])
    page = "".join(out)
    at = page.rfind("</body>")
    return page[:at] + '<script src="/page-editor.js"></script>\n' + page[at:]


def edit(body):
    path = site_file(body["file"])
    text = path.read_text()
    spans = Spans(text).spans
    for e in body["edits"]:
        if e["start"] not in spans or plain(text[e["start"]:spans[e["start"]][0]]) != e["old"]:
            raise ValueError(f"{body['file']} changed on disk since the page loaded; reload first")
    ensure_clean(path)
    for e in sorted(body["edits"], key=lambda e: -e["start"]):
        end = spans[e["start"]][0]
        old = text[e["start"]:end]
        lead, trail = re.match(r"\s*", old).group(0), re.search(r"\s*$", old).group(0)
        text = text[: e["start"]] + lead + html.escape(" ".join(e["new"].split()), quote=False) + trail + text[end:]
    path.write_text(text)
    rel = path.relative_to(ROOT)
    edits = body["edits"]
    subject = f'content({rel}): "{edits[0]["new"][:50]}"' if len(edits) == 1 else f"content({rel}): edit {len(edits)} texts"
    commit(path, subject, [f'- {e["old"]!r} -> {e["new"]!r}' for e in edits])


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body, kind="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/":
            self.reply(200, EDITOR.read_bytes(), "text/html; charset=utf-8")
        elif path == "/photos":
            self.reply(200, snapshot())
        elif path == "/page-editor.js":
            self.reply(200, PAGE_EDITOR.read_bytes(), "text/javascript; charset=utf-8")
        elif path.startswith("/site/"):
            try:
                file = site_file(path[len("/site/"):])
            except ValueError:
                return self.reply(404, {"error": "not found"})
            if not file.is_file():
                self.reply(404, {"error": "not found"})
            elif file.suffix == ".html":
                self.reply(200, annotated(file).encode(), "text/html; charset=utf-8")
            else:
                self.reply(200, file.read_bytes(), mimetypes.guess_type(file.name)[0] or "application/octet-stream")
        else:
            self.reply(404, {"error": "not found"})

    def do_POST(self):
        routes = {"/photos": save, "/edits": edit}
        if self.path not in routes:
            return self.reply(404, {"error": "not found"})
        try:
            routes[self.path](json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        except (ValueError, KeyError) as e:
            return self.reply(409, {"error": str(e)})
        except subprocess.CalledProcessError as e:
            return self.reply(500, {"error": f"git failed: {e.stderr.strip()}"})
        self.reply(200, snapshot() if self.path == "/photos" else {"ok": True})


if __name__ == "__main__":
    print(f"Editor for {ROOT} on http://localhost:{PORT} (page texts at /site/)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
