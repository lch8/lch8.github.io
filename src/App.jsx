import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, BookOpen, Check, Copy, Download, Github, GraduationCap, Menu, Moon, Rss, Sun, X } from 'lucide-react';
import { profile, research, directions, education, selectedWork } from './data/site';
import { publications, publicationUrl, citationText } from './data/publications';
import { posts } from './data/posts';

const pathname = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
const currentPage = ({ '/research': 'research', '/publications': 'publications', '/blog': 'blog', '/cv': 'cv' })[pathname] || 'home';
const navigation = [['Home', '/', 'home'], ['Research', '/research/', 'research'], ['Publications', '/publications/', 'publications'], ['Blog', '/blog/', 'blog'], ['CV', '/cv/', 'cv']];

function Header({ theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const links = navigation.map(([label, href, page]) => <a key={page} href={href} aria-current={currentPage === page ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</a>);
  return <header className="site-header">
    <div className="header-inner">
      <a className="brand" href="/" aria-label="Changheng Li home"><span className="brand-mark">CL.</span><span>Changheng Li</span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{links}</nav>
      <div className="header-actions">
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button ref={menuButton} type="button" className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{links}</nav>}
  </header>;
}

function Heading({ title, link, href }) {
  return <div className="section-heading"><h2>{title}</h2>{link && <a className="text-link" href={href}>{link}<ArrowRight size={16} /></a>}</div>;
}

function Hero() {
  return <section id="home" className="hero container">
    <h1>Changheng Li</h1>
    <p className="hero-role">Postdoctoral Researcher <span>·</span> TU Delft</p>
    <p className="hero-intro">I work on statistical estimation and optimization for microphone arrays and reconfigurable wireless systems.</p>
    <div className="hero-links">
      <a className="button button-primary" href="/research/">Research <ArrowRight size={16} /></a>
      <a className="button button-secondary" href={profile.cv} target="_blank" rel="noreferrer">Download CV <Download size={16} /></a>
      <a className="text-link" href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar <ArrowUpRight size={15} /></a>
    </div>
  </section>;
}

function ResearchOverview() {
  return <section id="research" className="home-section overview container">
    <Heading title="Research" link="Full overview" href="/research/" />
    <div className="overview-grid">
      <a id="acoustic-inference" className="overview-card" href="/research/#acoustic-inference">
        <span className="status">Published · PhD research</span>
        <h3>Microphone arrays &<br className="desktop-break" /> speech enhancement</h3>
        <p>Joint estimation of sources, reverberation and noise from microphone-array recordings.</p>
        <span className="overview-link">Papers & code <ArrowRight size={15} /></span>
      </a>
      <a id="reconfigurable-systems" className="overview-card current" href="/research/#reconfigurable-systems">
        <span className="status status-current">Current research</span>
        <h3>Response-aware<br className="desktop-break" /> LC-RIS optimization</h3>
        <p>Phase design for liquid-crystal reconfigurable surfaces with slow hardware response.</p>
        <span className="overview-link">Research question <ArrowRight size={15} /></span>
      </a>
    </div>
    <div id="quantized-inference" className="earlier-work"><span>Earlier work</span><p>Model selection and inference from quantized measurements.</p><a href="/research/#quantized-inference" className="text-link">Details <ArrowRight size={15} /></a></div>
  </section>;
}

function SelectedWork() {
  return <section id="publications" className="home-section selected-section container">
    <Heading title="Selected work" link="All publications" href="/publications/" />
    <div className="selected-list">{selectedWork.map(work => {
      const paper = publications.find(p => p.id === work.paperId);
      return <article className="selected-work" key={work.paperId}>
        <div className="work-meta">{work.venue}</div>
        <div className="work-body"><h3><a href={publicationUrl(paper)} target="_blank" rel="noreferrer" title={paper.title}>{work.title}<ArrowUpRight size={16} /></a></h3><p>{work.contribution}</p></div>
        <div className="work-links"><a href={publicationUrl(paper)} target="_blank" rel="noreferrer">Paper <ArrowUpRight size={14} /></a>{work.software && <a href={work.software} target="_blank" rel="noreferrer">MATLAB <ArrowUpRight size={14} /></a>}</div>
      </article>;
    })}</div>
  </section>;
}

function NextQuestions() {
  return <section id="directions" className="home-section next-section container">
    <Heading title="Next questions" link="Research directions" href="/research/#directions" />
    <div className="next-grid">
      <article><h3>Limits of communication & sensing</h3><p>OFDM optimality and the role of range-sidelobe criteria.</p></article>
      <article><h3>Tracking with slow hardware</h3><p>How motion and uncertainty constrain reconfigurable surfaces.</p></article>
    </div>
  </section>;
}

function LatestWriting() {
  const post = posts[0];
  return <section id="blog" className="home-section latest-section container">
    <Heading title="Latest writing" link="Blog" href="/blog/" />
    <article className="latest-post"><div><p className="post-meta">{post.type} <span>·</span> {post.dateLabel}</p><h3><a href={post.href}>{post.title}<ArrowUpRight size={17} /></a></h3><p>{post.excerpt}</p></div><a className="text-link" href={post.pdf} target="_blank" rel="noreferrer">PDF <Download size={15} /></a></article>
  </section>;
}

function HomePage() {
  return <main id="main-content"><Hero /><ResearchOverview /><SelectedWork /><NextQuestions /><LatestWriting /></main>;
}

function PageHeader({ title, children, action }) {
  return <section id="home" className="page-header container"><a className="back-link" href="/">← Home</a><div className="page-title-row"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div></section>;
}

function ResearchDrawing({ kind }) {
  return <svg className="research-drawing" viewBox="0 0 180 100" fill="none" aria-hidden="true">
    {kind === 'audio' && <><circle cx="25" cy="50" r="4" fill="currentColor" /><path d="M43 25Q67 50 43 75M53 13Q88 50 53 87M65 3Q113 50 65 97" stroke="currentColor" strokeWidth="1.2" opacity=".4" />{[20,40,60,80].map(y => <g key={y}><circle cx="118" cy={y} r="4" fill="currentColor" /><path d={`M125 ${y}h24`} stroke="currentColor" opacity=".5" /></g>)}<path d="M153 14v72M153 50h20" stroke="currentColor" /><circle cx="173" cy="50" r="3" fill="currentColor" /></>}
    {kind === 'ris' && <><path d="M6 75L72 40M6 75L72 60" stroke="currentColor" opacity=".5" />{[0,1,2,3].map(i => [0,1,2,3].map(j => <rect key={`${i}-${j}`} x={76+i*9} y={19+j*15} width="6" height="11" rx="1" fill="currentColor" opacity={.2+(i+j)%4*.18} />))}<path d="M112 40L169 17M112 54L169 77" stroke="currentColor" strokeWidth="1.4" /><circle cx="169" cy="17" r="4" fill="currentColor" /><circle cx="169" cy="77" r="4" fill="currentColor" /></>}
    {kind === 'quantized' && <><path d="M4 51h172M4 49C16 4 29 4 41 49S66 94 78 49S103 4 115 49S140 94 152 49S168 9 176 25" stroke="currentColor" opacity=".35" /><path d="M4 24h37v52h37V24h37v52h37V24h24" stroke="currentColor" strokeWidth="2" /></>}
  </svg>;
}

function ResearchPage() {
  return <main id="main-content">
    <PageHeader title="Research">Published work in acoustic and quantized-data inference, current work on reconfigurable wireless systems, and questions I want to pursue.</PageHeader>
    <div className="container research-page">
      <nav className="page-index" aria-label="Research topics">{research.map(item => <a href={`#${item.id}`} key={item.id}>{item.title}</a>)}<a href="#directions">Future directions</a></nav>
      {research.map(item => <article className={`research-detail ${item.kind}`} id={item.id} key={item.id}>
        <aside><span className={`status ${item.kind === 'current' ? 'status-current' : ''}`}>{item.status}</span><ResearchDrawing kind={item.visual} /></aside>
        <div><h2>{item.title}</h2><p className="detail-question">{item.question}</p><p>{item.contribution}</p><div className="method-tags">{item.methods.map(method => <span key={method}>{method}</span>)}</div>{item.evidence.length > 0 && <div className="research-evidence">{item.evidence.map(link => <a className="text-link" key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={15} /></a>)}</div>}{item.next && <p className="research-next">{item.next}</p>}</div>
      </article>)}
      <section id="directions" className="research-directions"><Heading title="Future directions" /><p className="directions-intro">I am exploring the following questions and welcome discussions with researchers working on related problems.</p><div className="direction-list">{directions.map(item => <article key={item.number}><h3>{item.title}</h3><p>{item.text}</p><span>{item.tags}</span></article>)}</div><a className="text-link" href={`mailto:${profile.email}`}>Contact me <ArrowUpRight size={15} /></a></section>
    </div>
  </main>;
}

function PublicationsPage() {
  const [filter, setFilter] = useState('All');
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const timer = useRef(null);
  const categories = ['All', 'Selected', 'Audio', 'Wireless & radar', 'Inference & control'];
  const shown = publications.filter(p => filter === 'All' || (filter === 'Selected' ? p.selected : p.topic === filter));
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copyCitation(paper) {
    try {
      await navigator.clipboard.writeText(citationText(paper));
      setCopied(paper.id);setCopyError(null);clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch { setCopyError(paper.id); }
  }
  return <main id="main-content">
    <PageHeader title="Publications" action={<a className="text-link" href={profile.scholar} target="_blank" rel="noreferrer">Google Scholar <ArrowUpRight size={16} /></a>}>Journal articles, conference papers and my PhD thesis.</PageHeader>
    <section className="container publications-page"><div className="publication-toolbar"><div className="filter-list" role="group" aria-label="Filter publications">{categories.map(category => <button key={category} type="button" onClick={() => { setFilter(category);setCopyError(null); }} aria-pressed={filter === category} className={filter === category ? 'active' : ''}>{category}</button>)}</div><span className="result-count" aria-live="polite">{shown.length} publications</span></div>
      <div className="publication-list">{shown.map(paper => <article key={paper.id} className="publication"><div className="publication-year">{paper.year}<span>{paper.type}</span></div><div className="publication-content"><h2><a href={publicationUrl(paper)} target="_blank" rel="noreferrer">{paper.title}</a></h2><p className="authors">{paper.authors.split('C. Li').map((part,i) => <span key={i}>{i > 0 && <strong>C. Li</strong>}{part}</span>)}</p><p className="venue">{paper.venue}{paper.detail ? ` · ${paper.detail}` : ''}</p>{copyError === paper.id && <div className="copy-fallback" role="status">Select and copy this citation:<p>{citationText(paper)}</p></div>}</div><div className="publication-actions"><a href={publicationUrl(paper)} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Open ${paper.title}`}><ArrowUpRight size={19} /></a><button type="button" className="icon-button" onClick={() => copyCitation(paper)} aria-label={`Copy citation for ${paper.title}`} title="Copy formatted citation">{copied === paper.id ? <Check size={17} /> : <Copy size={17} />}</button></div></article>)}</div><div className="sr-only" role="status">{copied ? 'Citation copied.' : ''}</div>
    </section>
  </main>;
}

function CVPage() {
  return <main id="main-content">
    <PageHeader title="CV & background" action={<a className="button button-primary" href={profile.cv} target="_blank" rel="noreferrer">Download CV <Download size={16} /></a>}>Postdoctoral researcher at TU Delft, with a background in applied mathematics and statistical signal processing.</PageHeader>
    <div className="container cv-page"><section className="cv-about"><Heading title="Current position" /><h3>Postdoctoral Researcher · TU Delft</h3><p>Embedded Systems & WISE. My current research studies liquid-crystal reconfigurable surfaces and response-aware wireless optimization.</p><p>My PhD in the Signal Processing Systems group focused on joint, low-complexity microphone-array parameter estimation in noisy, reverberant scenes.</p><a className="text-link" href={profile.thesis} target="_blank" rel="noreferrer"><BookOpen size={16} /> PhD thesis <ArrowUpRight size={16} /></a></section>
      <section className="cv-education"><Heading title="Education" /><div className="education-list">{education.map(item => <article key={item.title}><span>{item.year}</span><div><h3>{item.title}</h3><p>{item.school}</p><small>{item.detail}</small></div></article>)}</div></section>
      <div className="cv-extra"><section><h2>Technical tools</h2><p>MATLAB · Python / PyTorch · LaTeX</p></section><section><h2>Teaching</h2><p>Teaching assistant, Estimation and Detection, TU Delft · 2021/22 Q2.</p></section><section><h2>Recognition</h2><p>National Award for Graduates, Ministry of Education, China · 2018.</p></section></div>
    </div>
  </main>;
}

function BlogPage() {
  return <main id="main-content"><PageHeader title="Blog" action={<a className="text-link" href="/feed.xml"><Rss size={16} /> RSS feed <ArrowUpRight size={15} /></a>}>Tutorials and research notes on signal processing, communication and sensing.</PageHeader><section className="container blog-list">{posts.map(post => <article className="blog-post" key={post.slug}><div className="post-meta">{post.type} <span>·</span> {post.dateLabel} <span>·</span> {post.readingTime}{post.updatedLabel && <> <span>·</span> Updated {post.updatedLabel}</>}</div><h2><a href={post.href}>{post.title}<ArrowUpRight size={22} /></a></h2><p>{post.excerpt}</p><div className="post-tags">{post.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="post-actions"><a className="button button-primary" href={post.href}>Read article <ArrowRight size={16} /></a><a className="text-link" href={post.pdf} target="_blank" rel="noreferrer">Download PDF <Download size={15} /></a></div></article>)}</section></main>;
}

function VisitorMap() {
  const container = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!show || !container.current) return;
    const script = document.createElement('script');
    script.src = 'https://mapmyvisitors.com/map.js?d=jasWhK82vh3XfEJ_FOTtmHMD8ZnmpmRQC82DnGW1BBM&cl=ffffff&w=a';
    script.id = 'mapmyvisitors';script.async = true;
    const target = container.current;target.appendChild(script);
    return () => target.replaceChildren();
  }, [show]);
  return <details className="visitor-map" onToggle={e => setShow(e.currentTarget.open)}><summary>Visitor map</summary><div ref={container} /></details>;
}

function Footer() {
  return <footer id="contact" className="site-footer"><div className="container"><div className="footer-main"><div><strong>Changheng Li</strong><p>TU Delft · Delft, the Netherlands</p><a href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight size={15} /></a></div><nav aria-label="External profiles"><a href={profile.scholar} target="_blank" rel="noreferrer"><GraduationCap size={17} /> Google Scholar</a><a href={profile.github} target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a><a href="/feed.xml"><Rss size={16} /> RSS</a></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Changheng Li</span><a href="#home">Back to top ↑</a></div><VisitorMap /></div></footer>;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cl-theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('cl-theme', theme); } catch { /* Theme remains usable without storage. */ }
  }, [theme]);
  const pages = { home: HomePage, research: ResearchPage, publications: PublicationsPage, blog: BlogPage, cv: CVPage };
  const Page = pages[currentPage];
  return <><a className="skip-link" href="#main-content">Skip to content</a><Header theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} /><Page /><Footer /></>;
}
