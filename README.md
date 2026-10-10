<p align="center">
  <a href="https://maurice-frank.com">
    <img src="https://img.shields.io/badge/%E2%86%97%20maurice--frank.com-D78A7A?style=for-the-badge&amp;labelColor=2D2825" alt="Open maurice-frank.com">
  </a>
</p>

<img src="brand/icon/icon-maurice-frank-512.png" align="left" width="128" hspace="16" alt="Maurice Frank, pixel portrait">

<h3>maurice-frank.com</h3>

<p>
  <sub>ONE HTML FILE, NO BUILD STEP</sub>
  <br>
  <strong>Personal site of Maurice Frank: profile, ventures, CV, code, media and labs.</strong>
  <br>
  <br>
  <img src="https://img.shields.io/badge/HTML%20%2B%20CSS-static-D78A7A?style=flat-square&amp;labelColor=2D2825" alt="Static HTML and CSS">
  <a href="tokens.css"><img src="https://img.shields.io/badge/theme-light%20%2B%20dark-D78A7A?style=flat-square&amp;labelColor=2D2825" alt="Light and dark theme"></a>
  <a href="_redirects"><img src="https://img.shields.io/badge/routing-_redirects-7E9688?style=flat-square&amp;labelColor=2D2825" alt="Routing via _redirects"></a>
</p>

<br clear="left">

| Path | What |
|---|---|
| `index.html`, `style.css`, `tokens.css` | the whole site |
| `artifacts/` | standalone interactive pages, e.g. the NL tax simulator |
| `artifacts/drift/` | Drift, the endless downtempo generator (built output and valley plates) |
| `tools/drift/` | Drift's source: `pnpm install && pnpm build` writes `artifacts/drift/` |
| `soilytix/` | Soilytix engineering write-ups and mocks |
| `motion-stills/` | the motion-stills gallery page |
| `maps/`, `logos/` | GPX tracks and venture logos |
| `brand/icon/` | tool icons used in the *Code* section |
| `_redirects` | old URLs → current paths |
| `tools/gallery/` | local-only photo mosaic and page text editor, never deployed |

Preview by opening `index.html`, or serve the folder: `python3 -m http.server`.

## Gallery editor

```sh
python3 tools/gallery/server.py   # then open http://localhost:8001
```

Shows the photography mosaic dealt into lanes the way `index.html` does (5 desktop, 2 phone). Drag a photo within or across lanes, hide it (adds `hidden`, kept in the file, skipped by the packer) or remove it (deletes its item), then *Write index.html*. Lane *r* position *j* is source slot `j × rows + r`, so a cross-lane drag rewrites source order and the target lane hands its last photo to the end of the lane you dragged from. Hiding or removing re-deals everything after it. *Caption* edits a photo's caption and description (the alt text follows the description when they matched).

*Edit page texts* opens the site at `/site/index.html` (any page under the repo works) with an *Edit texts* toggle: every element holding only text — titles, labels, descriptions, tags, dates — becomes editable in place. The server adds the `data-edit` source offsets and the editor script to the served copy only; the files on disk carry neither.

Every save writes the source file and commits it with a message listing old → new; nothing is pushed. A file with uncommitted changes is refused rather than swept into the commit; undo with `git revert`. The server binds 127.0.0.1 only.

## Avatars

```sh
magick avatar_0{1..9}.jpg +append avatars.jpg
```
