import json
from pathlib import Path
import os

BASE_URL = "morris-frank.com"

CONTENT_DIR = Path("./docs")
LAYOUT = (CONTENT_DIR / "__layout.html").read_text()

HEAD_FILE = "head.html"
CONTENT_FILE = "content.html"
PYCONTENT_FILE = "content.py"
CONFIG_FILE = "config.json"

PAGES = [CONTENT_DIR] + list(filter(Path.is_dir, CONTENT_DIR.iterdir()))


def fill_layout(layout: str, content: str, head: str, config) -> str:
    layout = layout.replace("{{CONTENT}}", content)
    layout = layout.replace("{{HEAD}}", head)

    if "title" in config:
        pagetitle = f"{config['title']} - {config['base_url']}"
    else:
        pagetitle = config["base_url"]
    layout = layout.replace("{{PAGETITLE}}", pagetitle)

    title = config.get("title", "")
    layout = layout.replace("{{TITLE}}", title)
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

    filled = fill_layout(layout=layout, content=content, head=head, config=config)

    (page / "index.html").write_text(filled)
    print(f"Built {page.name}")


for page in PAGES:
    build_page(page, LAYOUT)
