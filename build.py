import base64
import hashlib
import importlib.util
import itertools
import os
import re
from collections import defaultdict
from functools import cache
from pathlib import Path


class TemplatingEngine:
    def __init__(self, docs_dir: Path, base_url: str, layout_file: Path = None, site_name: str = None, bib_file: Path = None):
        layout_file = layout_file or docs_dir / "__layout.html"
        self.__layout = layout_file.read_text()
        self.__bibliography = self.parse_bibtex(bib_file) if bib_file else {}

        self.docs_dir = docs_dir
        self.base_url = base_url
        self.site_name = site_name

    def parse_bibtex(self, bibfile_path: Path) -> dict[str, dict[str, str]]:
        bibliography = defaultdict(dict)

        bibtex_content = bibfile_path.read_text()
        entries = re.split(r"@[\w]+{", bibtex_content)
        for entry in entries[1:]:
            citation_key = entry.split(",", 1)[0].strip()
            fields = re.findall(r"(\w+)\s*=\s*{((?:[^{}]|{[^{}]*})*)}", entry)

            for field, value in fields:
                field = field.lower()
                value = re.sub(r"{{|}}", "", value)
                bibliography[citation_key][field] = value
        return bibliography

    def is_citation_key(self, key: str) -> bool:
        return key in self.__bibliography

    @cache
    def reference_layout(self, citation_key: str) -> str:
        ref = self.__bibliography.get(citation_key, None)
        if ref is None:
            return f"<div class='error'>Reference with citation key '{citation_key}' not found.</div>"

        doi = ref.get("doi", None)
        hasDoi = doi is not None

        asideLayout = (
            f"""<aside>
                        <span class="__dimensions_badge_embed__" data-doi="{doi}" data-legend="hover-right" data-style="small_circle"></span>
                        <div data-badge-type='donut' class='altmetric-embed' data-badge-popover='right' data-doi='{doi}'></div>
                    </aside>"""
            if hasDoi
            else ""
        )

        author = ref.get("author", "Unknown Author")
        authorLayout = f"""<div class="author">{author}</div>"""

        title = ref.get("title", "Untitled")
        titleLayout = (
            f"""<a href="https://doi.org/{doi}" class="title">{title}</a>""" if hasDoi else f"""<span class="title">{title}</span>"""
        )

        journal = ref.get("journal", ref.get("journal", "Unknown publication"))
        year = ref.get("year", "Unknown Year")
        sourceLayout = f"""<div class="source"><span>{journal}</span><span>{year}</span></div>"""

        abstract = ref.get("abstract", None)
        abstractLayout = f"""<div class="abstract">{abstract}</div>""" if abstract else ""

        return f'<div class="reference">{asideLayout}<div>{authorLayout}{titleLayout}{sourceLayout}{abstractLayout}</div></div>'

    def execute_expressions(self, layout: str) -> str:
        pattern = r"\{\{([^{}]+)\}\}"

        def replace_expression(match: re.Match[str]) -> str:
            key = match.group(1)
            if self.is_citation_key(key):
                return self.reference_layout(key)
            else:
                return f"<div class='error'>Expression '{{{key}}}' cannot be resolved.</div>"

        return re.sub(pattern, replace_expression, layout)

    def url_for(self, path: Path) -> str:
        return self.base_url + path.absolute().relative_to(self.docs_dir).as_posix()

    @staticmethod
    @cache
    def integrity_attr(path: Path) -> str:
        css_content = path.read_text()
        hash_object = hashlib.sha384(css_content.encode("utf-8"))
        hash_digest = hash_object.digest()
        b64_hash = base64.b64encode(hash_digest).decode("utf-8")
        return f'integrity="sha384-{b64_hash}" crossorigin="anonymous"'

    def head_for(self, path: Path) -> str:
        css_files = list(self.docs_dir.glob("*.css"))
        if path.parent.absolute() != self.docs_dir:
            css_files += list(path.parent.glob("*.css"))
        css_files.sort()
        css_tags = ""
        for file in css_files:
            href = self.url_for(file)
            integrity = self.integrity_attr(file)
            css_tags += f'<link rel="stylesheet" href="{href}" {integrity}>'

        extra_head_file = path.with_name("head.html")
        extra_head = extra_head_file.read_text() if extra_head_file.exists() else ""

        return f"{css_tags}\n{extra_head}"

    @staticmethod
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

    def title_for(self, path: Path) -> str:
        slug = path.parent.name
        return f"{slug.replace('_', ' ').title()} - {self.site_name}"

    @staticmethod
    def apply_fixes_for(path: Path, layout: str) -> str:
        slug = path.parent.name
        layout = layout.replace(f'href="/{slug}"', f'href="/{slug}" class="active" ')

        return layout

    def html_for(self, path: Path) -> None:
        os.chdir(path.parent)

        # First assemble the base layout and execute the content script
        layout = (
            self.__layout.replace("{{ROOT}}", self.base_url)
            .replace("{{TITLE}}", self.title_for(path))
            .replace("{{CONTENT}}", self.content_for(path))
            .replace("{{HEAD}}", self.head_for(path))
        )

        # Apply fixes to the layout
        layout = self.apply_fixes_for(path, layout)

        # Execute the layout
        layout = self.execute_expressions(layout)

        # Write the layout to the output file
        path.with_name("index.html").write_text(layout)

    def build(self) -> None:
        for content_file in itertools.chain(self.docs_dir.rglob("content.html"), self.docs_dir.rglob("content.py")):
            self.html_for(content_file)


if __name__ == "__main__":
    site_name = "Maurice Frank"
    site_url = "http://maurice-frank.com"
    docs_dir_name = "docs"

    isDEV = "--dev" in os.sys.argv

    docs_dir = (Path(__file__).parent / docs_dir_name).absolute()
    base_url = f"/{docs_dir_name}" if isDEV else site_url
    base_url = base_url.rstrip("/") + "/"

    engine = TemplatingEngine(
        docs_dir=docs_dir,
        base_url=base_url,
        site_name=site_name,
    )
    engine.build()
