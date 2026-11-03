import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, BookOpen, Check, ChevronDown, Copy, Download, FileText, Github, GraduationCap, Mail, MapPin, Menu, Moon, Rss, Sun, X } from 'lucide-react';
import { profile, research, directions, education } from './data/site';
import { publications, publicationUrl, citationText } from './data/publications';
import { posts } from './data/posts';

const isBlogPage = /^\/blog\/?$/.test(window.location.pathname);

function ThemeButton({ theme, toggle }) {
  return <button type="button" className="icon-button theme-button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

function Header({ theme, toggle }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const links = [
    ['Research', '/#research'], ['Looking ahead', '/#directions'], ['Publications', '/#publications'], ['Blog', '/blog/'], ['CV', '/#cv'],
  ];
  useEffect(() => {
    if (!open) return;
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);
  return <header className="site-header">
    <div className="header-inner">
      <a className="brand" href="/" aria-label="Changheng Li home"><span className="brand-mark">CL<span>.</span></span><span>Changheng Li</span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <a key={label} href={href} aria-current={isBlogPage && label === 'Blog' ? 'page' : undefined}>{label}</a>)}</nav>
      <div className="header-actions"><ThemeButton theme={theme} toggle={toggle} /><a className="contact-nav" href={`mailto:${profile.email}`}>Let’s talk <ArrowUpRight size={14} /></a><button ref={menuButton} type="button" className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X size={22} /> : <Menu size={22} />}</button></div>
    </div>
    {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={16} /></a>)}</nav>}
  </header>;
}

function ResearchDrawing({ kind, hero = false }) {
  if (hero) return <div className="research-map" aria-label="Research connects acoustic arrays, reconfigurable channels and quantized observations through estimation, optimization and inference">
    <div className="map-heading"><span className="small-label">A common thread</span><span className="map-note">Physical models → useful algorithms</span></div>
    <a className="map-row" href="#acoustic-inference"><span className="map-image"><ResearchDrawing kind="audio" /></span><span><strong>Acoustic mixtures</strong><small>Statistical estimation</small></span><ArrowUpRight size={18} /></a>
    <a className="map-row" href="#reconfigurable-systems"><span className="map-image"><ResearchDrawing kind="ris" /></span><span><strong>Reconfigurable channels</strong><small>Constrained optimization</small></span><ArrowUpRight size={18} /></a>
    <a className="map-row" href="#quantized-inference"><span className="map-image"><ResearchDrawing kind="quantized" /></span><span><strong>Quantized observations</strong><small>Model-aware inference</small></span><ArrowUpRight size={18} /></a>
    <div className="map-footer"><span className="map-dot" /> Structure, uncertainty, and physical constraints</div>
  </div>;
  return <svg className={`research-drawing ${kind}`} viewBox="0 0 180 100" fill="none" aria-hidden="true">
    {kind === 'audio' && <>
      <circle cx="25" cy="50" r="4" fill="currentColor" /><path d="M43 25Q67 50 43 75M53 13Q88 50 53 87M65 3Q113 50 65 97" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
      {[20, 40, 60, 80].map(y => <g key={y}><circle cx="118" cy={y} r="4" fill="currentColor" /><path d={`M125 ${y}h24`} stroke="currentColor" strokeWidth="1.1" opacity=".45" /></g>)}
      <path d="M153 14v72M153 50h20" stroke="currentColor" strokeWidth="1.2" /><circle cx="173" cy="50" r="3" fill="currentColor" />
    </>}
    {kind === 'ris' && <>
      <path d="M6 75L72 40M6 75L72 60" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      {[0,1,2,3].map(i => [0,1,2,3].map(j => <rect key={`${i}-${j}`} x={76+i*9} y={19+j*15} width="6" height="11" rx="1" fill="currentColor" opacity={.2 + (i+j)%4*.18} />))}
      <path d="M112 40L169 17M112 54L169 77" stroke="currentColor" strokeWidth="1.4" /><circle cx="169" cy="17" r="4" fill="currentColor" /><circle cx="169" cy="77" r="4" fill="currentColor" /><path d="M119 94h18" stroke="currentColor" strokeWidth="1" />
    </>}
    {kind === 'quantized' && <>
      <path d="M4 51h172" stroke="currentColor" opacity=".15" /><path d="M4 49C16 4 29 4 41 49S66 94 78 49S103 4 115 49S140 94 152 49S168 9 176 25" stroke="currentColor" strokeWidth="1.3" opacity=".35" />
      <path d="M4 24h37v52h37V24h37v52h37V24h24" stroke="currentColor" strokeWidth="2" />
      {[12,29,48,65,85,102,122,140,159,173].map((x,i) => <circle key={x} cx={x} cy={[0,1,4,5,8,9].includes(i)?24:76} r="2" fill="currentColor" />)}
    </>}
  </svg>;
}

function Hero() {
  return <section id="home" className="hero container">
    <div className="hero-copy"><p className="eyebrow"><span className="tiny-rule" /> {profile.role} · {profile.affiliation}</p>
      <h1>Signal processing,<br />grounded in<br /><em>physical models.</em></h1>
      <p className="hero-intro">I develop models and efficient algorithms for estimation and optimization, from microphone arrays to reconfigurable wireless systems.</p>
      <p className="hero-question">A recurring question: what can we infer and achieve with the measurements and hardware we actually have?</p>
      <div className="hero-links"><a className="button button-primary" href="#research">Explore my research <ArrowRight size={16} /></a><a className="text-link" href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar <ArrowUpRight size={16} /></a></div>
    </div>
    <ResearchDrawing hero />
    <div className="hero-foot"><span><MapPin size={14} /> Delft, the Netherlands</span><span>Estimation <i /> Optimization <i /> Statistical inference</span><a href="#research">Research, in brief <ChevronDown size={14} /></a></div>
  </section>;
}

function SectionHeading({ number, label, title, children }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span> {label}</p><h2>{title}</h2>{children && <p className="section-intro">{children}</p>}</div>;
}

function Research() {
  return <section id="research" className="research-section section-border"><div className="container">
    <SectionHeading number="01" label="Research" title={<>Problems I work on.<br /><span className="muted-heading">And what I bring to them.</span></>}>My work combines statistical modeling, mathematical analysis and computationally efficient algorithms. Here are three threads through that work.</SectionHeading>
    <div className="research-list">{research.map(item => <article key={item.id} id={item.id} className={`research-item ${item.kind}`}>
      <div className="research-meta"><span className="item-number">{item.number}</span><span className={`status status-${item.kind}`}><span />{item.status}</span><p>{item.field}</p><div className="research-illustration"><ResearchDrawing kind={item.visual} /></div></div>
      <div className="research-body"><h3>{item.title}</h3><p className="research-question">{item.question}</p><p>{item.contribution}</p><p className="research-takeaway">{item.takeaway}</p><div className="method-tags">{item.methods.map(method => <span key={method}>{method}</span>)}</div>{item.evidence.length > 0 && <div className="research-evidence">{item.evidence.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={14} /></a>)}</div>}{item.next && <p className="research-next"><span>Next question</span>{item.next}</p>}</div>
    </article>)}</div>
    <a className="section-bottom-link" href="#publications">Explore the publications <ArrowRight size={17} /></a>
  </div></section>;
}

function Directions() {
  return <section id="directions" className="directions-section"><div className="container">
    <div className="directions-heading"><SectionHeading number="02" label="Looking ahead" title="Questions I want to pursue." /><p>My interests increasingly center on understanding limits, then designing methods that respect them. These are ongoing explorations and directions for future work.</p></div>
    <div className="directions-grid">{directions.map(item => <article className="direction" key={item.number}><span className="direction-letter">{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><small>{item.tags}</small></article>)}</div>
    <p className="collaboration-note"><span>Let’s compare questions.</span> I welcome conversations around estimation, optimization, array processing, and communication or sensing theory. <a href={`mailto:${profile.email}`}>Get in touch <ArrowUpRight size={15} /></a></p>
  </div></section>;
}

function OpticalCover({ compact = false }) {
  return <div className={`optical-cover ${compact ? 'compact' : ''}`} aria-hidden="true"><svg viewBox="0 0 520 260" fill="none">
    <defs><pattern id={compact ? 'dot-grid-compact' : 'dot-grid'} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="currentColor" opacity=".2" /></pattern></defs>
    <rect width="520" height="260" fill={`url(#${compact ? 'dot-grid-compact' : 'dot-grid'})`} />
    {[0,1,2,3,4,5,6,7].map((i) => <g key={i}><path d={`M90 130L${290+(i%4)*49} ${i<4?69:193}`} stroke="currentColor" strokeWidth={i===2?'2':'1'} opacity={i===2?'.85':'.23'} /><circle cx={290+(i%4)*49} cy={i<4?69:193} r="5" stroke="currentColor" opacity=".8" /></g>)}
    <path d="M69 117h41v26H69zM55 111v38M123 111v38M47 111h16v38H47zM115 111h16v38h-16z" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="90" cy="130" r="37" stroke="currentColor" opacity=".2" strokeDasharray="3 5" />
    <text x="67" y="204" fill="currentColor" fontSize="11" fontFamily="monospace">1 TERMINAL</text><text x="293" y="239" fill="currentColor" fontSize="11" fontFamily="monospace">32 USERS?</text>
  </svg><span className="cover-label">A system-design tutorial</span></div>;
}

function PostCard({ post, featured = false }) {
  return <article className={featured ? 'featured-post' : 'archive-post'}>
    <a className="post-cover-link" href={post.href} tabIndex={-1} aria-hidden="true"><OpticalCover compact={!featured} /></a>
    <div className="post-copy"><p className="post-meta"><span>{post.type}</span><span>{post.dateLabel}</span><span>{post.readingTime}</span></p><h3><a href={post.href}>{post.title}</a></h3><p>{post.excerpt}</p><div className="post-tags">{post.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="post-links"><a className="text-link" href={post.href}>Read the tutorial <ArrowRight size={16} /></a><a className="subtle-link" href={post.pdf} target="_blank" rel="noreferrer">PDF <Download size={14} /></a></div></div>
  </article>;
}

function BlogPreview() {
  return <section id="blog" className="blog-section section-border"><div className="container">
    <div className="heading-with-link"><SectionHeading number="03" label="Blog" title="Working through ideas, together.">Tutorials and research notes on the models, assumptions and calculations behind signal processing.</SectionHeading><a className="text-link" href="/blog/">All writing <ArrowUpRight size={16} /></a></div>
    <PostCard post={posts[0]} featured />
  </div></section>;
}

function Publications() {
  const [filter, setFilter] = useState('Selected');
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const timer = useRef(null);
  const categories = ['Selected', 'All', 'Audio', 'Wireless & radar', 'Inference & control'];
  const shown = publications.filter(paper => filter === 'All' || (filter === 'Selected' ? paper.selected : paper.topic === filter));
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copyCitation(paper) {
    try {
      await navigator.clipboard.writeText(citationText(paper));
      setCopied(paper.id); setCopyError(null);clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch { setCopyError(paper.id); }
  }
  return <section id="publications" className="publications-section section-border"><div className="container">
    <div className="heading-with-link"><SectionHeading number="04" label="Publications" title="Papers behind the research." /><a className="text-link" href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar <ArrowUpRight size={16} /></a></div>
    <div className="publication-toolbar"><div className="filter-list" role="group" aria-label="Filter publications">{categories.map(category => <button key={category} type="button" onClick={() => { setFilter(category);setCopyError(null); }} aria-pressed={filter === category} className={filter === category ? 'active' : ''}>{category}</button>)}</div><span className="result-count" aria-live="polite">{shown.length} publications</span></div>
    <div className="publication-list">{shown.map(paper => <article key={paper.id} className="publication"><div className="publication-year">{paper.year}<span>{paper.type}</span></div><div className="publication-content"><h3><a href={publicationUrl(paper)} target="_blank" rel="noreferrer">{paper.title}</a></h3><p className="authors">{paper.authors.split('C. Li').map((part, i) => <span key={i}>{i > 0 && <strong>C. Li</strong>}{part}</span>)}</p><p className="venue">{paper.venue}{paper.detail ? ` · ${paper.detail}` : ''}</p>{copyError === paper.id && <div className="copy-fallback" role="status">Select and copy this citation:<p>{citationText(paper)}</p></div>}</div><div className="publication-actions"><a href={publicationUrl(paper)} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Open ${paper.title}`}><ArrowUpRight size={18} /></a><button type="button" className="icon-button" onClick={() => copyCitation(paper)} aria-label={`Copy citation for ${paper.title}`} title="Copy formatted citation">{copied === paper.id ? <Check size={16} /> : <Copy size={16} />}</button></div></article>)}</div>
    <div className="sr-only" role="status">{copied ? 'Citation copied.' : ''}</div>
  </div></section>;
}

function Background() {
  return <section id="cv" className="background-section section-border"><div className="container background-grid">
    <div><SectionHeading number="05" label="Background" title={<>A foundation in mathematics.<br />A focus on signal processing.</>} /><p>I am a postdoctoral researcher with Embedded Systems & WISE at TU Delft, working on reconfigurable wireless systems. My PhD in the Signal Processing Systems group focused on microphone-array parameter estimation for noisy, reverberant acoustic scenes.</p><div className="background-links"><a className="text-link" href={profile.thesis} target="_blank" rel="noreferrer"><BookOpen size={16} /> Read my PhD thesis <ArrowUpRight size={15} /></a><a className="text-link" href={`mailto:${profile.email}?subject=Academic%20CV`}><FileText size={16} /> Request my CV <ArrowUpRight size={15} /></a></div><div className="toolkit"><span className="small-label">Tools I work with</span><p>MATLAB · Python / PyTorch · LaTeX</p></div><details className="background-extra"><summary>Teaching & recognition <ChevronDown size={15} /></summary><p>Teaching assistant · Estimation and Detection, TU Delft · 2021/22 Q2.</p><p>National Award for Graduates · Ministry of Education, China · 2018.</p></details></div>
    <div className="education-list">{education.map(item => <article key={item.title}><span className="education-year">{item.year}</span><h3>{item.title}</h3><p>{item.school}</p><small>{item.detail}</small></article>)}</div>
  </div></section>;
}

function VisitorMap() {
  const container = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!show || !container.current) return;
    const script = document.createElement('script');
    script.src = 'https://mapmyvisitors.com/map.js?d=jasWhK82vh3XfEJ_FOTtmHMD8ZnmpmRQC82DnGW1BBM&cl=ffffff&w=a';
    script.id = 'mapmyvisitors'; script.async = true;
    const target = container.current;target.appendChild(script);
    return () => target.replaceChildren();
  }, [show]);
  return <details className="visitor-map" onToggle={event => setShow(event.currentTarget.open)}><summary>Visitor map</summary><div ref={container} /></details>;
}

function Footer() {
  return <footer id="contact" className="site-footer"><div className="container"><div className="footer-top"><div><p className="eyebrow">Keep in touch</p><h2>Good questions travel<br />across disciplines.</h2><a className="footer-email" href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight size={22} /></a></div><div className="footer-links"><a href={profile.scholar} target="_blank" rel="noreferrer"><GraduationCap size={17} /> Google Scholar <ArrowUpRight size={14} /></a><a href={profile.github} target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={14} /></a><a href="/blog/"><BookOpen size={17} /> Blog <ArrowUpRight size={14} /></a><a href="/feed.xml"><Rss size={17} /> RSS feed <ArrowUpRight size={14} /></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Changheng Li</span><span>Delft, the Netherlands</span><a href="#home">Back to top ↑</a></div><VisitorMap /></div></footer>;
}

function BlogIndex() {
  return <main id="main-content"><section id="home" className="blog-intro container"><a className="back-link" href="/"><span>←</span> Back to my research</a><p className="eyebrow">The blog</p><h1>Notes from<br /><em>the working desk.</em></h1><div className="blog-intro-bottom"><p>Tutorials, explanations and research notes. I write to make the reasoning visible: what a model assumes, how a calculation works, and what the result lets us conclude.</p><a className="text-link" href="/feed.xml"><Rss size={16} /> Subscribe via RSS <ArrowUpRight size={15} /></a></div></section><section className="blog-archive section-border"><div className="container"><div className="archive-heading"><h2>Latest writing</h2><span>{posts.length} {posts.length === 1 ? 'article' : 'articles'}</span></div>{posts.map(post => <PostCard post={post} featured key={post.slug} />)}</div></section></main>;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cl-theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('cl-theme', theme); } catch { /* Private browsing still permits theme switching. */ }
  }, [theme]);
  return <><a className="skip-link" href="#main-content">Skip to content</a><Header theme={theme} toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />{isBlogPage ? <BlogIndex /> : <main id="main-content"><Hero /><Research /><Directions /><BlogPreview /><Publications /><Background /></main>}<Footer /></>;
}
