"""Minimal dependency-free OOXML (.docx) writer. Supports headings, paragraphs,
bullets, bold/italic runs, tables, page breaks. No external packages."""
import zipfile, re, html

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')

def esc(t):
    return html.escape(t, quote=False).replace('"', '&quot;')

def runs(text):
    """**bold**, *italic*, `code` -> runs."""
    out, pos = [], 0
    pat = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)')
    for m in pat.finditer(text):
        if m.start() > pos:
            out.append(('', text[pos:m.start()]))
        tok = m.group(0)
        if tok.startswith('**'):
            out.append(('b', tok[2:-2]))
        elif tok.startswith('`'):
            out.append(('c', tok[1:-1]))
        else:
            out.append(('i', tok[1:-1]))
        pos = m.end()
    if pos < len(text):
        out.append(('', text[pos:]))
    xml = ''
    for kind, t in out:
        props = ''
        if kind == 'b': props = '<w:b/>'
        elif kind == 'i': props = '<w:i/>'
        elif kind == 'c': props = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/>'
        rpr = f'<w:rPr>{props}</w:rPr>' if props else ''
        xml += f'<w:r>{rpr}<w:t xml:space="preserve">{esc(t)}</w:t></w:r>'
    return xml or '<w:r><w:t/></w:r>'

def para(text='', style=None, spacing_after=120, align=None):
    ppr = '<w:pPr>'
    if style: ppr += f'<w:pStyle w:val="{style}"/>'
    if align: ppr += f'<w:jc w:val="{align}"/>'
    ppr += f'<w:spacing w:after="{spacing_after}"/></w:pPr>'
    return f'<w:p>{ppr}{runs(text)}</w:p>'

def heading(text, level=1):
    return para(text, style=f'Heading{level}', spacing_after=160)

def bullet(text, level=0):
    ppr = (f'<w:pPr><w:pStyle w:val="ListParagraph"/>'
           f'<w:numPr><w:ilvl w:val="{level}"/><w:numId w:val="1"/></w:numPr>'
           f'<w:spacing w:after="60"/></w:pPr>')
    return f'<w:p>{ppr}{runs(text)}</w:p>'

def pagebreak():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

def table(rows, widths=None):
    n = len(rows[0])
    widths = widths or [int(9360/n)] * n
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    body = ''
    for ri, row in enumerate(rows):
        cells = ''
        for ci, cell in enumerate(row):
            shade = '<w:shd w:val="clear" w:fill="EDEDED"/>' if ri == 0 else ''
            content = ''.join(para(l, spacing_after=40) for l in str(cell).split('\n'))
            cells += (f'<w:tc><w:tcPr><w:tcW w:w="{widths[ci]}" w:type="dxa"/>{shade}</w:tcPr>'
                      f'{content}</w:tc>')
        hdr = '<w:trPr><w:tblHeader/></w:trPr>' if ri == 0 else ''
        body += f'<w:tr>{hdr}{cells}</w:tr>'
    return (f'<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>'
            f'<w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
            + ''.join(f'<w:{e} w:val="single" w:sz="4" w:color="999999"/>'
                      for e in ('top','left','bottom','right','insideH','insideV'))
            + f'</w:tblBorders></w:tblPr><w:tblGrid>{grid}</w:tblGrid>{body}</w:tbl>'
            + '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>')

STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ''' + NS + '''>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="595959"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="280" w:after="140"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="220" w:after="110"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="2E5496"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:outlineLvl w:val="2"/><w:spacing w:before="180" w:after="90"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>
</w:styles>'''

NUMBERING = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ''' + NS + '''>
<w:abstractNum w:abstractNumId="0">
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>'''

def build(path, body_xml):
    doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
           f'<w:document {NS}><w:body>{body_xml}'
           '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
           '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709"/>'
           '</w:sectPr></w:body></w:document>')
    ct = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          '<Default Extension="xml" ContentType="application/xml"/>'
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
          '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
          '</Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')
    drels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
             '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
             '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
             '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
             '</Relationships>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', ct)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/_rels/document.xml.rels', drels)
        z.writestr('word/document.xml', doc)
        z.writestr('word/styles.xml', STYLES)
        z.writestr('word/numbering.xml', NUMBERING)
    return path
