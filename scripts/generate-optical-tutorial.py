"""Render the editorial Markdown source to the static article and its PDF.

Requires matplotlib and ReportLab. Supports this article's small Markdown subset.
"""
from pathlib import Path
import html
import io
import re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import findfont, FontProperties
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether
from optical_sharing_figures import FIGURES

matplotlib.rcParams['svg.hashsalt'] = 'optical-tutorial'

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/blog/multiuser-optical-satellite-communications.md'
OUTPUT = ROOT / 'public/blog/multiuser-optical-satellite-communications/index.html'
TITLE = 'How Much Transmitter Hardware Can Satellite Users Share?'
DESCRIPTION = 'A two-user coherent optical model shows how peak drive voltage constrains shared modulation and motivates a boundary for feasible rates.'
URL = 'https://lch8.github.io/blog/multiuser-optical-satellite-communications/'
UPDATED = '9 November 2026'
UPDATED_ISO = '2026-11-09'

def inline(text, pdf=False):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{m[2]}"' + (' color="#006d68"' if pdf else '') + f'>{m[1]}</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    if not pdf:
        text = re.sub(r'\[(\d+)\]', r'<a class="citation" href="#ref\1">[\1]</a>', text)
    return text

labels = [
    'The drive voltage is the sum of the two user waveforms, each scaled by the square root of its mean-square voltage and rotated by its phase.',
    'The absolute real and imaginary components of the drive voltage must each stay within the voltage limit.',
    'The sum of the mean-square user voltages equals the average squared magnitude of the combined drive. It is at most twice the squared voltage limit.',
]

def render_graphic(figure, label, key, width, equation=False):
    svg, png = io.BytesIO(), io.BytesIO()
    with matplotlib.rc_context({'svg.fonttype': 'path' if equation else 'none'}):
        figure.savefig(svg, format='svg', bbox_inches='tight', pad_inches=0.12,
                       transparent=equation, metadata={'Date': None})
    figure.savefig(png, format='png', bbox_inches='tight', pad_inches=0.12,
                   transparent=equation, dpi=180)
    plt.close(figure)
    svg_text = svg.getvalue().decode()
    svg_text = svg_text[svg_text.index('<svg'):]
    svg_text = re.sub(r'(id="|href="#|url\(#)([\w.-]+)',
                      lambda m: f'{m[1]}{key}-{m[2]}', svg_text)
    svg_text = svg_text.replace('<svg ', f'<svg role="img" aria-label="{html.escape(label)}" ', 1)
    png.seek(0)
    image = Image(png)
    ratio = min(72 / 180, width / image.imageWidth)
    image.drawWidth = image.imageWidth * ratio
    image.drawHeight = image.imageHeight * ratio
    return svg_text, image

pdfmetrics.registerFont(TTFont('Article', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('ArticleBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('ArticleItalic', findfont(FontProperties(family='DejaVu Sans',style='oblique'))))
pdfmetrics.registerFontFamily('Article', normal='Article', bold='ArticleBold', italic='ArticleItalic')
ink = colors.HexColor('#19374b')
body_style = ParagraphStyle('Body',fontName='Article',fontSize=10.2,leading=15,spaceAfter=8,textColor=ink,allowWidows=0,allowOrphans=0)
heading_style = ParagraphStyle('Heading',parent=body_style,fontName='ArticleBold',fontSize=16,leading=21,spaceBefore=15,spaceAfter=10,keepWithNext=True)
title_style = ParagraphStyle('Title',parent=heading_style,fontSize=25,leading=31,spaceBefore=0,spaceAfter=13)
small_style = ParagraphStyle('Small',parent=body_style,fontSize=8.5,leading=12,spaceAfter=5)
table_style = ParagraphStyle('Table',parent=body_style,fontSize=8.5,leading=13,spaceAfter=0)
story = [Paragraph(TITLE,title_style),Paragraph(f'Changheng Li · Research note · Updated {UPDATED}',small_style),Spacer(1,12)]
body = []
toc = []
equation_index = 0
for block in re.split(r'\n\s*\n', SOURCE.read_text().strip()):
    if block.startswith('```math'):
        latex = '\n'.join('$' + line.strip() + '$' for line in block.splitlines()[1:-1])
        fig = plt.figure(figsize=(7, .75))
        fig.text(.5, .5, latex, ha='center', va='center', fontsize=16)
        svg_text, img = render_graphic(fig, labels[equation_index],
                                       f'equation-{equation_index}', 460, equation=True)
        body.append(f'<div class="equation">{svg_text}</div>')
        story.append(KeepTogether([img, Spacer(1, 12)]))
        equation_index+=1
    elif block.startswith('```figure'):
        key = block.splitlines()[1].strip()
        make_figure, caption, label = FIGURES[key]
        pdf_width = 400 if key == 'region' else 483
        svg_text, img = render_graphic(make_figure(), label, key, pdf_width)
        body.append(f'<figure>{svg_text}<figcaption>{html.escape(caption)}</figcaption></figure>')
        story.append(KeepTogether([img, Spacer(1, 4), Paragraph(html.escape(caption), small_style)]))
    elif block.startswith('# '):
        title=block[2:].strip()
        anchor='sources' if title=='Sources' else 'section-'+str(len(toc)+1)
        toc.append((anchor,title))
        body.append(f'<h2 id="{anchor}">{html.escape(title)}</h2>')
        story.append(Paragraph(html.escape(title),heading_style))
    elif block.startswith('|'):
        rows=[[c.strip() for c in line.strip().strip('|').split('|')] for line in block.splitlines()]
        rows=[rows[0]]+rows[2:]
        body.append('<div class="table-wrap" tabindex="0" role="region" aria-label="Comparison of three modulation architectures"><table><thead><tr>'+''.join(f'<th scope="col">{inline(c)}</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{inline(c)}</td>' for c in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>')
        table=Table([[Paragraph(inline(c,True),table_style) for c in row] for row in rows],colWidths=[113,185,185],hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dbeae4')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f2f6f4'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
        story.extend([KeepTogether([table]),Spacer(1,12)])
    elif re.match(r'\d+\. ',block):
        number=block.split('.', 1)[0]
        body.append(f'<p class="source" id="ref{number}">{inline(block)}</p>')
        story.append(Paragraph(inline(block,True),small_style))
    elif block.startswith('- '):
        body.append('<ul><li>'+inline(block[2:])+'</li></ul>')
        story.append(Paragraph('• '+inline(block[2:],True),body_style))
    else:
        body.append('<p>'+inline(block)+'</p>')
        story.append(Paragraph(inline(block,True),body_style))
assert equation_index==len(labels)

css='''*{box-sizing:border-box}html{scroll-padding-top:24px}body{margin:0;background:#fafbf9;color:#19374b;font:18px/1.85 Georgia,serif}a{color:#006d68;text-underline-offset:3px}header,footer,.meta,.tools,summary,nav,table{font-family:system-ui,sans-serif}header{border-bottom:1px solid #dce3e1}.masthead{max-width:1100px;margin:auto;padding:20px 28px;display:flex;justify-content:space-between;gap:24px;align-items:center}.brand{font-weight:650;text-decoration:none;font-size:16px}.brand span{font:25px Georgia,serif;margin-right:12px}.nav{display:flex;gap:24px;align-items:center;font-size:14px}.nav a{text-decoration:none}button{padding:7px 10px;background:transparent;border:1px solid #dce3e1;border-radius:4px;color:inherit;cursor:pointer}.tools{max-width:800px;margin:25px auto;font-size:14px;display:flex;justify-content:space-between;gap:20px}main{max-width:800px;margin:0 auto 55px}h1{font-size:46px;font-weight:400;line-height:1.16;letter-spacing:-.03em;margin:32px 0 22px}h2{font-size:29px;line-height:1.35;font-weight:400;letter-spacing:-.02em;margin:48px 0 20px}p{margin:0 0 20px}.meta{font-size:14px;color:#5b6c76;margin-bottom:26px}details{padding:15px 20px;border:1px solid #dce3e1;border-radius:4px;margin:0 0 32px;font-size:15px}summary{cursor:pointer;font-weight:600}details nav{display:grid;gap:10px;margin-top:16px;font-size:14px;line-height:1.5}.equation{background:#edf4ef;border-radius:4px;text-align:center;padding:16px;margin:24px 0;overflow-x:auto}.equation svg{max-width:100%;height:auto;vertical-align:middle}table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.6}th,td{text-align:left;padding:13px 15px;vertical-align:top}th{background:#dbeae4}tbody tr:nth-child(odd){background:#edf4ef}.table-wrap{overflow-x:auto;margin:25px 0}ul{padding-left:25px;margin:0 0 16px}.source{font-size:16px;overflow-wrap:anywhere}.citation{font:14px system-ui,sans-serif;white-space:nowrap}footer{max-width:800px;margin:0 auto;padding:24px 0 35px;border-top:1px solid #dce3e1;font-size:14px;color:#5b6c76;display:flex;justify-content:space-between;gap:25px}a:focus-visible,button:focus-visible,summary:focus-visible,.table-wrap:focus-visible{outline:2px solid #006d68;outline-offset:5px}:root[data-theme=dark]{color-scheme:dark}:root[data-theme=dark] body{background:#101e28;color:#e5edea}:root[data-theme=dark] a{color:#8bd2bb}:root[data-theme=dark] .meta,:root[data-theme=dark] footer{color:#a8bac2}:root[data-theme=dark] .equation,:root[data-theme=dark] tbody tr:nth-child(odd){background:#1b3636}:root[data-theme=dark] th{background:#294641}:root[data-theme=dark] .equation svg{filter:invert(1)}@media(max-width:860px){main,.tools,footer{margin-left:22px;margin-right:22px}h1{font-size:36px}h2{font-size:27px}.masthead{padding:16px 22px}.nav{gap:16px}table{min-width:530px}body{font-size:17px}}@media(max-width:400px){.brand span{display:none}.nav{gap:12px;font-size:13px}h1{font-size:33px}}@media print{header,.tools,details,footer{display:none}main{max-width:none;margin:0}body{background:white;color:black;font-size:11pt}h1{font-size:25pt}h2{font-size:17pt;break-after:avoid}.equation,table{break-inside:avoid}}'''
css += '''figure{margin:26px 0 30px}figure svg{display:block;width:100%;height:auto;background:#fff;border:1px solid #dce3e1;border-radius:4px}figcaption{font:14px/1.55 system-ui,sans-serif;color:#5b6c76;margin-top:10px}:root[data-theme=dark] figcaption{color:#a8bac2}@media print{figure{break-inside:avoid}}'''
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{TITLE}</title><meta name="author" content="Changheng Li"><meta name="description" content="{DESCRIPTION}"><meta property="og:type" content="article"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="{URL}"><meta property="article:published_time" content="2026-11-03"><meta property="article:modified_time" content="{UPDATED_ISO}"><link rel="canonical" href="{URL}"><link rel="icon" href="/favicon.svg"><link rel="alternate" type="application/rss+xml" title="Changheng Li · Blog" href="/feed.xml"><style>{css}</style><script>try{{document.documentElement.dataset.theme=localStorage.getItem('cl-theme')||'light'}}catch{{}}</script></head><body><header><div class="masthead"><a class="brand" href="/"><span>CL.</span>Changheng Li</a><div class="nav"><a href="/research/">Research</a><a href="/blog/">Blog</a><button id="theme-toggle" aria-label="Switch color theme">Theme ◐</button></div></div></header><div class="tools"><a href="/blog/">← All writing</a><a href="/downloads/multiuser-fso-tutorial.pdf" target="_blank" rel="noreferrer">Download PDF ↗</a></div><main><h1>{TITLE}</h1><p class="meta">Changheng Li · Research note · 8 min read<br>Published 3 November 2026 · Updated {UPDATED}</p><details><summary>In this article</summary><nav aria-label="Article sections">'''+''.join(f'<a href="#{a}">{html.escape(t)}</a>' for a,t in toc)+'</nav></details>'+''.join(body)+'''</main><footer><span>Written by Changheng Li<br><a href="mailto:C.Li-7@tudelft.nl">Questions or corrections?</a></span><a href="/blog/">More articles →</a></footer><script>document.getElementById('theme-toggle').addEventListener('click',()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cl-theme',t)}catch{}});</script></body></html>'''
OUTPUT.write_text('\n'.join(line.rstrip() for line in page.splitlines())+'\n')

def footer(canvas,doc):
    canvas.saveState()
    canvas.setFont('Article',8)
    canvas.setFillColor(colors.HexColor('#5b6c76'))
    canvas.drawString(50,28,f'Changheng Li · Optical satellite communications · {UPDATED}')
    canvas.drawRightString(A4[0]-50,28,str(doc.page))
    canvas.restoreState()

pdf=ROOT/'public/downloads/multiuser-fso-tutorial.pdf'
SimpleDocTemplate(str(pdf),pagesize=A4,leftMargin=50,rightMargin=50,topMargin=45,bottomMargin=52,title=TITLE,author='Changheng Li').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUTPUT)
print(pdf)
