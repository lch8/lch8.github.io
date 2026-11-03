"""Generate the site's two-page public academic CV. Requires ReportLab."""

import argparse
import json
import os
from datetime import date
from pathlib import Path
import subprocess
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--updated', default=date.today().isoformat())
args = parser.parse_args()
updated = date.fromisoformat(args.updated)
node = os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node')
data = json.loads(subprocess.check_output([
    node, '--input-type=module', '-e',
    "import {profile,education,research} from './src/data/site.js';"
    "import {publications,publicationUrl} from './src/data/publications.js';"
    "console.log(JSON.stringify({profile,education,research,"
    "publications:publications.filter(p=>p.selected).map(p=>({...p,url:publicationUrl(p)}))}));",
], cwd=ROOT, text=True))
profile = data['profile']

font_dir = Path('/usr/share/fonts/truetype/dejavu')
if (font_dir / 'DejaVuSans.ttf').exists():
    regular, bold = font_dir / 'DejaVuSans.ttf', font_dir / 'DejaVuSans-Bold.ttf'
else:
    font_dir = Path(reportlab.__file__).resolve().parent / 'fonts'
    regular, bold = font_dir / 'Vera.ttf', font_dir / 'VeraBd.ttf'
pdfmetrics.registerFont(TTFont('CV', str(regular)))
pdfmetrics.registerFont(TTFont('CVBold', str(bold)))
pdfmetrics.registerFontFamily('CV', normal='CV', bold='CVBold')

ink = colors.HexColor('#213c4f')
muted = colors.HexColor('#526570')
teal = colors.HexColor('#1f746e')
line = colors.HexColor('#d8e2e2')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('CVBody', fontName='CV', fontSize=10.1, leading=15.1,
                          textColor=ink, spaceAfter=7, alignment=TA_LEFT))
styles.add(ParagraphStyle('CVSmall', parent=styles['CVBody'], fontSize=9.4,
                          leading=14, textColor=muted, spaceAfter=5))
styles.add(ParagraphStyle('CVTitle', parent=styles['CVBody'], fontName='CVBold',
                          fontSize=29, leading=35, spaceAfter=7))
styles.add(ParagraphStyle('CVSection', parent=styles['CVBody'], fontName='CVBold',
                          fontSize=10.2, leading=15, textColor=teal,
                          spaceBefore=15, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle('CVItem', parent=styles['CVBody'], fontName='CVBold',
                          fontSize=10.4, leading=15, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle('CVPaper', parent=styles['CVBody'], fontSize=10.4,
                          leading=15.5, spaceAfter=3))


def p(text, style='CVBody'):
    return Paragraph(text, styles[style])


def link(label, url):
    return f'<a href="{escape(url, {chr(34): "&quot;"})}" color="#1f746e">{escape(label)}</a>'


def section(title):
    return p(escape(title.upper()), 'CVSection')


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(line)
    canvas.line(48, 43, width - 48, 43)
    canvas.setFont('CV', 8)
    canvas.setFillColor(muted)
    canvas.drawString(48, 29, f"Changheng Li · Public academic CV · Updated {updated.day} {updated.strftime('%B %Y')}")
    canvas.drawRightString(width - 48, 29, str(doc.page))
    canvas.restoreState()


story = [
    p(escape(profile['name']), 'CVTitle'),
    p('Postdoctoral Researcher · Delft University of Technology'),
    p('Embedded Systems &amp; WISE · Delft, the Netherlands', 'CVSmall'),
    p(link(profile['email'], 'mailto:' + profile['email']) + ' &nbsp; | &nbsp; '
      + link('lch8.github.io', 'https://lch8.github.io/') + ' &nbsp; | &nbsp; '
      + link('Google Scholar', profile['scholar']), 'CVSmall'),
    Spacer(1, 9),
    HRFlowable(width='100%', thickness=0.7, color=line),
    section('Current position'),
    p('Postdoctoral Researcher · TU Delft', 'CVItem'),
    p('Research on liquid-crystal reconfigurable intelligent surfaces (LC-RIS), '
      'including phase design under slow, asymmetric hardware response and '
      'reconfiguration-time constraints.'),
    section('Research'),
    p('<b>Microphone arrays and speech enhancement.</b> Joint estimation of source '
      'transfer functions and the power of speech, reverberation and noise, using '
      'statistical structure shared across time frames.'),
    p('<b>Quantized-data inference.</b> Model-order selection from signed measurements; '
      'collaborative work on one-bit MIMO channel estimation and radar inference.'),
    p('<b>Future interests.</b> Communication-and-sensing limits, tracking with slow '
      'hardware, and learning methods that retain physical model structure.'),
    p('<b>Software:</b> ' + link('MATLAB implementations at TU Delft', profile['software']) + '.', 'CVSmall'),
    section('Education'),
]

for item in data['education']:
    story.append(KeepTogether([
        p(f"{escape(item['title'])} &nbsp; · &nbsp; {escape(item['year'])}", 'CVItem'),
        p(escape(item['school']), 'CVBody'),
        p(escape(item['detail']), 'CVSmall'),
        Spacer(1, 5),
    ]))

story.extend([
    section('Teaching, recognition and tools'),
    p('<b>Teaching:</b> Teaching assistant, Estimation and Detection, TU Delft · 2021/22 Q2.'),
    p('<b>Award:</b> National Award for Graduates, Ministry of Education, China · 2018.'),
    p('<b>Tools:</b> MATLAB · Python / PyTorch · LaTeX'),
    PageBreak(),
    p('Selected publications', 'CVTitle'),
    p('Five representative papers. ' + link('Full publication list', 'https://lch8.github.io/publications/')
      + ' · ' + link('Google Scholar', profile['scholar']), 'CVSmall'),
    Spacer(1, 10),
    HRFlowable(width='100%', thickness=0.7, color=line),
    Spacer(1, 15),
])

for index, paper in enumerate(data['publications'], 1):
    authors = escape(paper['authors']).replace('C. Li', '<b>C. Li</b>')
    venue = escape(paper['venue'])
    detail = ', ' + escape(paper['detail']) if paper.get('detail') else ''
    story.append(KeepTogether([
        p(f"{index:02d} &nbsp; <b>{escape(paper['title'])}</b>", 'CVPaper'),
        p(authors, 'CVSmall'),
        p(f"{venue}{detail}, {paper['year']}.", 'CVSmall'),
        p(link('doi.org/' + paper['doi'], paper['url']), 'CVSmall'),
        Spacer(1, 13),
    ]))

story.extend([
    section('PhD thesis'),
    p('Multi-Microphone Signal Parameter Estimation in Various Acoustic Scenarios', 'CVItem'),
    p('Delft University of Technology · 2025', 'CVSmall'),
    p(link('Read thesis', profile['thesis']), 'CVSmall'),
])

output = ROOT / 'public' / profile['cv'].lstrip('/')
output.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=48, leftMargin=48,
                        topMargin=43, bottomMargin=62, title='Changheng Li — Public Academic CV',
                        author=profile['name'], subject='Research, academic background and selected publications')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(output)
