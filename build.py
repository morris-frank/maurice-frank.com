import hashlib
import json
from pathlib import Path
from base64 import b64encode, b64decode

import os

BASE_URL = "maurice-frank.com"

DEV = "--dev" in os.sys.argv

CONTENT_DIR = Path("./docs")
LAYOUT = (CONTENT_DIR / "__layout.html").read_text()

with open(CONTENT_DIR / "main.css", "rb") as f:
    CSSHASH = hashlib.file_digest(f, "sha256").hexdigest()
    CSSHASH = b64encode(bytes.fromhex(CSSHASH)).decode()
    CSSHASH = f"sha256-{CSSHASH}"

HEAD_FILE = "head.html"
CONTENT_FILE = "content.html"
PYCONTENT_FILE = "content.py"
CONFIG_FILE = "config.json"

PAGES = [CONTENT_DIR] + list(filter(Path.is_dir, CONTENT_DIR.iterdir()))


def fill_layout(slug: str, layout: str, content: str, head: str, config) -> str:
    layout = layout.replace("{{CONTENT}}", content)
    layout = layout.replace("{{HEAD}}", head)

    if "title" in config:
        pagetitle = f"{config['title']} - {config['base_url']}"
    else:
        pagetitle = config["base_url"]
    layout = layout.replace("{{PAGETITLE}}", pagetitle)

    title = config.get("title", "")
    layout = layout.replace("{{TITLE}}", title)

    layout = layout.replace("{{CSSHASH}}", "" if DEV else f"integrity=\"{CSSHASH}\" crossorigin=\"anonymous\"")
    layout = layout.replace("{{ROOT}}", "/docs/" if DEV else "/")

    layout = layout.replace(f"href=\"/{slug}\"", f"href=\"/{slug}\" class=\"active\" ")
    return layout


def build_page(page: Path, layout: str) -> None:
    if not (page / CONTENT_FILE).exists() and not (page / PYCONTENT_FILE).exists():
        print(f"Skipping {page.name} (no {CONTENT_FILE}, {PYCONTENT_FILE})")
        return

    if (page / PYCONTENT_FILE).exists():
        cdir = os.getcwd()
        os.chdir(page)
        exec(Path(PYCONTENT_FILE).read_text(), {}, locals())
        content = locals()["generate"]()
        os.chdir(cdir)
    else:
        content = (page / CONTENT_FILE).read_text()

    head = ""
    if (page / HEAD_FILE).exists():
        head = (page / HEAD_FILE).read_text()

    config = json.loads((page / CONFIG_FILE).read_text())
    config = config or {}
    config = {"base_url": BASE_URL, **config}

    filled = fill_layout(page.name, layout=layout, content=content, head=head, config=config)

    (page / "index.html").write_text(filled)
    print(f"Built {page.name}")


for page in PAGES:
    build_page(page, LAYOUT)
