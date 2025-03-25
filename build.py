import base64
import hashlib
import importlib.util
import itertools
import os
from collections.abc import Iterator
from functools import cache
from pathlib import Path

# CONFIGURATION
TITLE = "Maurice Frank"
URL = "http://maurice-frank.com"

# OPTIONS
isDEV = "--dev" in os.sys.argv
DOCS_DIR = "docs"

# DERIVATIVE SETTINGS
DOCS_PATH = (Path(__file__).parent / DOCS_DIR).absolute()
assert DOCS_PATH.exists() and DOCS_PATH.is_dir(), f"Docs directory {DOCS_PATH} does not exist"
URL_ROOT = f"/{DOCS_DIR}" if isDEV else URL
URL_ROOT = URL_ROOT.rstrip("/") + "/"


def url_for(path: Path) -> str:
    return URL_ROOT + path.absolute().relative_to(DOCS_PATH).as_posix()


@cache
def integrity_attr(path: Path) -> str:
    css_content = path.read_text()
    hash_object = hashlib.sha384(css_content.encode("utf-8"))
    hash_digest = hash_object.digest()
    b64_hash = base64.b64encode(hash_digest).decode("utf-8")
    return f'integrity="sha384-{b64_hash}" crossorigin="anonymous"'


def head_for(path: Path) -> str:
    css_files = list(DOCS_PATH.glob("*.css"))
    if path.parent.absolute() != DOCS_PATH:
        css_files += list(path.parent.glob("*.css"))
    css_files.sort()
    css_tags = ""
    for file in css_files:
        href = url_for(file)
        integrity = integrity_attr(file)
        css_tags += f'<link rel="stylesheet" href="{href}" {integrity}>'

    extra_head_file = path.with_name("head.html")
    extra_head = extra_head_file.read_text() if extra_head_file.exists() else ""

    return f"{css_tags}\n{extra_head}"


def content_for(path: Path) -> str:
    if path.suffix == ".py":
        spec = importlib.util.spec_from_file_location(path.parent.name.replace("-", "_"), path)
        if spec is None:
            print(f"Couldn't spec_from_file_location for {path}")
            return ""
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        if not hasattr(module, "generate"):
            print(f"No generate() function in {path}")
            return ""
        return module.generate()
    else:
        return path.read_text()


def title_for(path: Path) -> str:
    slug = path.parent.name
    return f"{slug.replace('_', ' ').title()} - {TITLE}"


def fixes_for(path: Path, layout: str) -> str:
    slug = path.parent.name
    layout = layout.replace(f'href="/{slug}"', f'href="/{slug}" class="active" ')

    return layout


def build_page(path: Path, layout: str) -> None:
    os.chdir(path.parent)

    layout = (
        layout.replace("{{ROOT}}", URL_ROOT)
        .replace("{{TITLE}}", title_for(path))
        .replace("{{CONTENT}}", content_for(path))
        .replace("{{HEAD}}", head_for(path))
    )

    layout = fixes_for(path, layout)

    path.with_name("index.html").write_text(layout)


if __name__ == "__main__":
    layout = (DOCS_PATH / "__layout.html").read_text()
    for content_file in itertools.chain(DOCS_PATH.rglob("content.html"), DOCS_PATH.rglob("content.py")):
        build_page(content_file, layout)
