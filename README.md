<p align="center">
  <a href="https://maurice-frank.com">
    <img src="https://img.shields.io/badge/%E2%86%97%20maurice--frank.com-8EDE3D?style=for-the-badge&amp;labelColor=16211B" alt="Open maurice-frank.com">
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
  <img src="https://img.shields.io/badge/HTML%20%2B%20CSS-static-8EDE3D?style=flat-square&amp;labelColor=16211B" alt="Static HTML and CSS">
  <a href="tokens.css"><img src="https://img.shields.io/badge/theme-light%20%2B%20dark-8EDE3D?style=flat-square&amp;labelColor=16211B" alt="Light and dark theme"></a>
  <a href="_redirects"><img src="https://img.shields.io/badge/routing-_redirects-1AB172?style=flat-square&amp;labelColor=16211B" alt="Routing via _redirects"></a>
</p>

<br clear="left">

| Path | What |
|---|---|
| `index.html`, `style.css`, `tokens.css` | the whole site |
| `artifacts/` | standalone interactive pages, e.g. the NL tax simulator |
| `soilytix/` | Soilytix engineering write-ups and mocks |
| `motion-stills/` | the motion-stills gallery page |
| `maps/`, `logos/` | GPX tracks and venture logos |
| `brand/icon/` | tool icons used in the *Code* section |
| `_redirects` | old URLs → current paths |

Preview by opening `index.html`, or serve the folder: `python3 -m http.server`.

## Avatars

```sh
magick avatar_0{1..9}.jpg +append avatars.jpg
```
