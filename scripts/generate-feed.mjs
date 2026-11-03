import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { posts } from '../src/data/posts.js';
import { profile } from '../src/data/site.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const origin = 'https://lch8.github.io';
const xml = value => String(value).replace(/[<>&"']/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' })[c]);
mkdirSync(publicDir, { recursive: true });
if (!existsSync(`${publicDir}${profile.cv}`)) throw new Error(`Missing CV: ${profile.cv}`);
for (const post of posts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) throw new Error(`Invalid post date: ${post.slug}`);
  if (!existsSync(`${publicDir}${post.href}index.html`)) throw new Error(`Missing article: ${post.href}`);
  if (post.pdf && !existsSync(`${publicDir}${post.pdf}`)) throw new Error(`Missing PDF: ${post.pdf}`);
}
const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Changheng Li · Blog</title><link>${origin}/blog/</link><description>Tutorials and research notes on signal processing, communication and sensing.</description><language>en</language><atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>${posts.map(p => `<item><title>${xml(p.title)}</title><link>${origin}${xml(p.href)}</link><guid isPermaLink="true">${origin}${xml(p.href)}</guid><pubDate>${new Date(p.date+'T00:00:00Z').toUTCString()}</pubDate><description>${xml(p.excerpt)}</description>${p.tags.map(t=>`<category>${xml(t)}</category>`).join('')}</item>`).join('')}</channel></rss>\n`;
writeFileSync(`${publicDir}feed.xml`, feed);
writeFileSync(`${publicDir}sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/research/', '/publications/', '/blog/', '/cv/', ...posts.map(p=>p.href)].map(path=>`<url><loc>${origin}${xml(path)}</loc></url>`).join('')}</urlset>\n`);
writeFileSync(`${publicDir}robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated feed and sitemap for ${posts.length} post(s).`);
