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

Build output is in `dist/`. The build validates post/PDF paths and generates RSS and sitemap files before building both the homepage and the blog index. The existing GitHub Pages workflow runs on changes pushed to `main`.

## Content structure

- `src/data/site.js`: profile, three research summaries, future questions and education.
- `src/data/publications.js`: publications, verified DOI links and formatted citation text.
- `src/data/posts.js`: blog metadata shared by the homepage, blog index, RSS and sitemap.
- `src/App.jsx`: homepage and blog-list components.
- `src/index.css`: responsive layout and light/dark themes.
- `public/blog/<slug>/index.html`: standalone, readable article pages.
- `public/downloads/`: article PDFs.
- `docs/CONTENT_SOURCES.md`: sources for publication corrections and editorial decisions.

## Add a blog post

1. Create `public/blog/<slug>/index.html` with the article content.
2. Put any downloadable PDF under `public/downloads/`.
3. Add one object to `src/data/posts.js` (newest first), including `slug`, `title`, `excerpt`, ISO `date`, `dateLabel`, `type`, `tags`, `readingTime`, `href`, and optional `pdf`.
4. Run `npm run build`; inspect the page and links, then commit the source changes.

No database or external CMS is required. The article URLs and downloads work as static files on GitHub Pages. Blog pages do not depend on a server-side router.

The `Selected` publication view gives five representative papers. Topic filters and `All` expose the full archive. Ongoing LC-RIS work and future research questions are shown with their own status, independently of the publication list.
