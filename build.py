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

for cssFile in CONTENT_DIR.glob("*.css"):
    if cssFile.stem != "main":
        cssFile.unlink()
CONTENT_DIR.joinpath("main.css").with_stem(CSSHASH).write_text(CONTENT_DIR.joinpath("main.css").read_text())


HEAD_FILE = "head.html"
CONTENT_FILE = "content.html"
PYCONTENT_FILE = "content.py"
# CONFIG_FILE = "config.json"

PAGES = [CONTENT_DIR] + list(filter(Path.is_dir, CONTENT_DIR.iterdir()))


def fill_layout(slug: str, layout: str, content: str, head: str) -> str:
    layout = layout.replace("{{CONTENT}}", content)
    layout = layout.replace("{{HEAD}}", head)

    pagetitle = f"{slug.replace('-', ' ').title()} - {BASE_URL}"
    layout = layout.replace("{{PAGETITLE}}", pagetitle)

    layout = layout.replace("{{CSSHASH}}", CSSHASH)
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

    filled = fill_layout(page.name, layout=layout, content=content, head=head)

    (page / "index.html").write_text(filled)
    print(f"Built {page.name}")


for page in PAGES:
    build_page(page, LAYOUT)
