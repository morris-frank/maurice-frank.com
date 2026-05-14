# morris-frank.com

Static site. The checked-in `docs/**/*.html` files are the source of truth.

## Local preview

```bash
python3 -m http.server 8000 --directory docs
```

Then open [http://localhost:8000](http://localhost:8000).

## Editing

- Edit `docs/index.html` for the homepage.
- Edit the relevant `docs/*/index.html` file for subpages.
- Shared styling lives in `docs/41c90318c3.css`.

## Avatars

```bash
magick avatar_01.jpg avatar_02.jpg avatar_03.jpg avatar_04.jpg avatar_05.jpg avatar_06.jpg avatar_07.jpg avatar_08.jpg avatar_09.jpg +append avatars.jpg
```
