# Changheng Li — research homepage & blog

React 19 + Vite. Deployed by the existing GitHub Actions workflow to https://lch8.github.io/.

## Run locally

```sh
npm ci
npm run dev
```

## Production build

```sh
npm run build
```

Build output is in `dist/`. The build validates article and PDF paths and generates RSS and sitemap files. Home, Research, Publications, Blog and CV each have a separate HTML entry point, so direct links work on GitHub Pages. The existing GitHub Pages workflow runs on changes pushed to `main`.

## Content structure

- `src/data/site.js`: profile, three research summaries, future questions and education.
- `src/data/publications.js`: publications, verified DOI links and formatted citation text.
- `src/data/posts.js`: blog metadata shared by the homepage, blog index, RSS and sitemap.
- `src/App.jsx`: concise homepage and separate Research, Publications, Blog and CV pages.
- `src/index.css`: responsive layout and light/dark themes.
- `public/blog/<slug>/index.html`: standalone, readable article pages.
- `public/downloads/`: tutorial and public academic CV PDFs.
- `scripts/generate-cv.py`: regenerates the public CV from profile and publication data (Python + ReportLab required).
- `docs/CONTENT_SOURCES.md`: sources for publication corrections and editorial decisions.

## Add a blog post

1. Create `public/blog/<slug>/index.html` with the article content.
2. Put any downloadable PDF under `public/downloads/`.
3. Add one object to `src/data/posts.js` (newest first), including `slug`, `title`, `excerpt`, ISO `date`, `dateLabel`, `type`, `tags`, `readingTime`, `href`, and optional `pdf`.
4. Run `npm run build`; inspect the page and links, then commit the source changes.

No database or external CMS is required. The article URLs and downloads work as static files on GitHub Pages. Blog pages do not depend on a server-side router.

The homepage presents two main research areas, three representative contributions, two future questions and the latest article. Detailed research, the full publication archive and academic background have their own pages. Publications initially shows all records; the `Selected` filter gives five representative papers. Ongoing LC-RIS work and future research questions have their own status.

To regenerate the downloadable CV after updating the profile or publications, run `python scripts/generate-cv.py`, review both PDF pages, and commit the script/data changes together with `public/downloads/changheng-li-cv.pdf`. The checked-in PDF is served directly; the site build does not require Python.
