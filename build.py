import yaml
from pathlib import Path
import os

BASE_URL = "https://morris-frank.dev/"

CONTENT_DIR = Path("./content")
LAYOUT = (CONTENT_DIR / "__layout.html").read_text()

HEAD_FILE = "head.html"
CONTENT_FILE = "content.html"
PYCONTENT_FILE = "content.py"
CONFIG_FILE = "config.yaml"

PAGES = [CONTENT_DIR] + list(filter(Path.is_dir, CONTENT_DIR.iterdir()))


def fill_layout(layout: str, content: str, head: str, config) -> str:
    layout = layout.replace("{{CONTENT}}", content)
    layout = layout.replace("{{HEAD}}", head)

    layout = layout.replace("{{TITLE}}", config.get("title", "MISSING TITLE"))
    layout = layout.replace("{{MAIN_CLASSNAME}}", config.get("main_classname", ""))
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

    config = yaml.safe_load((page / CONFIG_FILE).read_text())
    config = config or {}
    config = {"base_url": BASE_URL, **config}

    filled = fill_layout(layout=layout, content=content, head=head, config=config)

    (page / "index.html").write_text(filled)
    print(f"Built {page.name}")


for page in PAGES:
    build_page(page, LAYOUT)
