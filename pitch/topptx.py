"""Build the Coverit pitch deck as a native .pptx.

Everything is a real PowerPoint shape - text frames, tables, pictures - so the
deck stays editable in Keynote/PowerPoint/Slides. Mirrors deck.html slide for
slide; when you change one, change the other.
"""
import pathlib

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = pathlib.Path(__file__).parent
OUT = HERE / "Coverit-Pitch-Deck.pptx"

# ---------------------------------------------------------------- palette
INK = RGBColor(0x1A, 0x16, 0x14)
MUTED = RGBColor(0x6B, 0x62, 0x5C)
FAINT = RGBColor(0x9A, 0x91, 0x8B)
RULE = RGBColor(0xE8, 0xE0, 0xDA)
PAPER = RGBColor(0xFF, 0xFD, 0xFB)
WARM = RGBColor(0xFD, 0xF6, 0xF0)
CORAL = RGBColor(0xF4, 0x67, 0x4C)
AMBER = RGBColor(0xF7, 0xA3, 0x4B)
GREEN = RGBColor(0x2F, 0x8F, 0x5B)
RED = RGBColor(0xC8, 0x40, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CODE_BG = RGBColor(0x2A, 0x23, 0x20)
CODE_FG = RGBColor(0xF0, 0xE6, 0xDE)

FONT = "Helvetica Neue"
MONO = "Menlo"

W, H = Inches(13.333), Inches(7.5)
ML = Inches(0.79)          # left margin
CW = W - ML * 2            # content width

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


# ---------------------------------------------------------------- helpers
def slide(bg=PAPER):
    s = prs.slides.add_slide(BLANK)
    fill = s.background.fill
    fill.solid()
    fill.fore_color.rgb = bg
    return s


def rect(s, x, y, w, h, fill=None, line=None, radius=None, lw=Pt(1)):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    sh = s.shapes.add_shape(shape_type, x, y, w, h)
    if radius:
        # adjustment is a fraction of the shorter side
        sh.adjustments[0] = radius
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = lw
    sh.shadow.inherit = False
    return sh


def _autofit(tf):
    """Turn on PowerPoint's shrink-text-on-overflow for a text frame."""
    from pptx.oxml.ns import qn
    bodyPr = tf._txBody.find(qn("a:bodyPr"))
    for tagname in ("a:normAutofit", "a:spAutoFit", "a:noAutofit"):
        for old in bodyPr.findall(qn(tagname)):
            bodyPr.remove(old)
    bodyPr.append(bodyPr.makeelement(qn("a:normAutofit"), {}))


def text(s, x, y, w, h, runs, size=16, color=MUTED, bold=False, italic=False,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line=1.5, space_after=0,
         font=FONT, caps=False, spacing=None, shrink=True):
    """runs: a string, or a list of (text, {overrides}) tuples, or a list of
    such lists (one per paragraph)."""
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if shrink:
        # Renderers disagree on font metrics (LibreOffice sets Helvetica ~10%
        # wider than macOS), so let overset text scale down inside its box
        # rather than spill over the shape below it.
        _autofit(tf)

    paras = runs if isinstance(runs, list) and runs and isinstance(runs[0], list) else [runs]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line
        p.space_after = Pt(space_after)
        items = para if isinstance(para, list) else [(para, {})]
        for t, ov in items:
            r = p.add_run()
            r.text = t
            f = r.font
            f.name = ov.get("font", font)
            f.size = Pt(ov.get("size", size))
            f.bold = ov.get("bold", bold)
            f.italic = ov.get("italic", italic)
            f.color.rgb = ov.get("color", color)
            if ov.get("caps", caps):
                r.text = t.upper()
            sp = ov.get("spacing", spacing)
            if sp:
                # character spacing isn't exposed by python-pptx; set via XML
                r.font._rPr.set("spc", str(int(sp * 100)))
    return tb


def kicker(s, label):
    text(s, ML, Inches(0.62), CW, Inches(0.24), label, size=11.5, color=CORAL,
         bold=True, caps=True, spacing=1.6)
    rect(s, ML, Inches(0.95), Inches(0.56), Pt(3), fill=CORAL)


def heading(s, txt, y=Inches(1.22), size=31, w=None, h=Inches(1.05)):
    return text(s, ML, y, w or CW, h, txt, size=size, color=INK,
                bold=True, line=1.14, shrink=False)


def sub(s, txt, y, w=None, size=15.5, h=Inches(0.78)):
    return text(s, ML, y, w or Inches(9.4), h, txt, size=size,
                color=MUTED, line=1.5)


def page_no(s, n):
    text(s, W - Inches(1.1), H - Inches(0.52), Inches(0.6), Inches(0.25),
         f"{n:02d}", size=10.5, color=FAINT, align=PP_ALIGN.RIGHT)


def foot(s, txt):
    text(s, ML, H - Inches(0.62), Inches(10.6), Inches(0.4), txt,
         size=10.5, color=FAINT, line=1.4)


def card(s, x, y, w, h, title=None, body=None, big=None, lbl=None,
         fill=WHITE, border=RULE, big_color=INK, pad=Inches(0.22),
         big_size=30, lbl_size=10.5):
    rect(s, x, y, w, h, fill=fill, line=border, radius=0.09)
    cy = y + pad
    iw = w - pad * 2
    if lbl:
        text(s, x + pad, cy, iw, Inches(0.2), lbl, size=lbl_size, color=FAINT,
             bold=True, caps=True, spacing=0.8)
        cy += Inches(0.28)
    if big:
        bh = Inches(big_size / 72 * 1.15)
        text(s, x + pad, cy, iw, bh, big, size=big_size, color=big_color,
             bold=True, line=1.0)
        cy += bh + Inches(0.1)
    if title:
        text(s, x + pad, cy, iw, Inches(0.3), title, size=15, color=INK,
             bold=True, line=1.2)
        cy += Inches(0.34)
    if body:
        text(s, x + pad, cy, iw, h - (cy - y) - pad, body, size=12.5,
             color=MUTED, line=1.45)


def cell_border(cell, edges=("bottom",), color=RULE, width=Pt(0.75)):
    """python-pptx has no border API; write the a:ln elements directly."""
    from pptx.oxml.ns import qn
    tag_for = {"left": "a:lnL", "right": "a:lnR",
               "top": "a:lnT", "bottom": "a:lnB"}
    tcPr = cell._tc.get_or_add_tcPr()
    for edge in edges:
        name = tag_for[edge]
        for old in tcPr.findall(qn(name)):
            tcPr.remove(old)
        ln = tcPr.makeelement(qn(name), {"w": str(int(width)), "cap": "flat",
                                         "cmpd": "sng", "algn": "ctr"})
        fill = ln.makeelement(qn("a:solidFill"), {})
        clr = fill.makeelement(qn("a:srgbClr"), {"val": f"{color}"})
        fill.append(clr)
        ln.append(fill)
        # a:lnL/R/T/B must appear in L,R,T,B order after the fill props
        tcPr.append(ln)


def table(s, x, y, w, headers, rows, col_w, row_h=Inches(0.46),
          head_h=Inches(0.32), font_size=12, right_cols=(), total_row=False):
    n_rows, n_cols = len(rows) + 1, len(headers)
    h = head_h + row_h * len(rows)
    gf = s.shapes.add_table(n_rows, n_cols, x, y, w, h).table
    gf.first_row = False
    gf.horz_banding = False
    for i, cw in enumerate(col_w):
        gf.columns[i].width = cw
    gf.rows[0].height = head_h
    for r in range(1, n_rows):
        gf.rows[r].height = row_h

    for c, htxt in enumerate(headers):
        cell = gf.cell(0, c)
        cell.fill.background()
        cell.margin_left = cell.margin_right = Inches(0.06)
        cell.margin_top = cell.margin_bottom = 0
        cell.vertical_anchor = MSO_ANCHOR.BOTTOM
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.RIGHT if c in right_cols else PP_ALIGN.LEFT
        r = p.add_run()
        r.text = htxt.upper()
        r.font.name, r.font.size, r.font.bold = FONT, Pt(9.5), True
        r.font.color.rgb = FAINT
        r.font._rPr.set("spc", "90")
        cell_border(cell, ("bottom",), color=RULE, width=Pt(1.25))

    last = len(rows)
    for ri, row in enumerate(rows, start=1):
        is_total = total_row and ri == last
        for c, val in enumerate(row):
            cell = gf.cell(ri, c)
            cell.fill.background()
            if is_total:
                cell_border(cell, ("top",), color=INK, width=Pt(1.5))
            elif ri != last:
                cell_border(cell, ("bottom",), color=RGBColor(0xF2, 0xEC, 0xE7))
            cell.margin_left = cell.margin_right = Inches(0.06)
            cell.margin_top = cell.margin_bottom = Inches(0.05)
            cell.vertical_anchor = MSO_ANCHOR.TOP
            main, _, note = (val.partition("||") if isinstance(val, str) else (val, "", ""))
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.RIGHT if c in right_cols else PP_ALIGN.LEFT
            p.line_spacing = 1.35
            r = p.add_run()
            r.text = main
            r.font.name, r.font.size = FONT, Pt(font_size)
            r.font.bold = (c == 0) or is_total
            r.font.color.rgb = INK if (c == 0 or is_total) else MUTED
            if note:
                p2 = cell.text_frame.add_paragraph()
                p2.line_spacing = 1.3
                r2 = p2.add_run()
                r2.text = note
                r2.font.name, r2.font.size = FONT, Pt(10.5)
                r2.font.color.rgb = FAINT
    return gf


def code(s, x, y, w, h, lines, size=11):
    """lines: list of [(text, color), ...] segment lists."""
    rect(s, x, y, w, h, fill=CODE_BG, line=None, radius=0.07)
    tb = s.shapes.add_textbox(x + Inches(0.2), y + Inches(0.16),
                              w - Inches(0.4), h - Inches(0.32))
    tf = tb.text_frame
    tf.word_wrap = False
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, segs in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = 1.5
        for t, col in segs:
            r = p.add_run()
            r.text = t
            r.font.name, r.font.size = MONO, Pt(size)
            r.font.color.rgb = col


def tag(s, x, y, txt, fg, bg, w=None):
    # ~0.075in per char at 10.5pt, plus horizontal padding; too tight and the
    # label wraps inside the pill.
    w = w or Inches(0.075 * len(txt) + 0.4)
    h = Inches(0.28)
    rect(s, x, y, w, h, fill=bg, line=None, radius=0.5)
    text(s, x, y + Inches(0.045), w, Inches(0.2), txt, size=10.5, color=fg,
         bold=True, align=PP_ALIGN.CENTER)
    return w


def note(s, x, y, w, txt, h=Inches(0.56)):
    rect(s, x, y, Pt(2.5), h, fill=RULE)
    text(s, x + Inches(0.14), y, w - Inches(0.14), h, txt, size=10.5,
         color=FAINT, line=1.45)


def badge(s, txt, y=Inches(0.6)):
    w = Inches(0.082 * len(txt) + 0.4)
    x = W - ML - w
    rect(s, x, y, w, Inches(0.28), fill=RGBColor(0xFD, 0xF0, 0xDD), line=None, radius=0.3)
    text(s, x, y + Inches(0.055), w, Inches(0.2), txt, size=9.5,
         color=RGBColor(0x9A, 0x65, 0x10), bold=True, align=PP_ALIGN.CENTER,
         caps=True, spacing=1.0)


def flow_box(s, x, y, w, h, title, desc):
    rect(s, x, y, w, h, fill=WHITE, line=RULE, radius=0.1)
    text(s, x + Inches(0.12), y + Inches(0.2), w - Inches(0.24), Inches(0.24),
         title, size=12.5, color=INK, bold=True, align=PP_ALIGN.CENTER, line=1.2)
    text(s, x + Inches(0.12), y + Inches(0.52), w - Inches(0.24), Inches(0.6),
         desc, size=10, color=FAINT, align=PP_ALIGN.CENTER, line=1.35)


def arrow(s, x, y):
    text(s, x, y, Inches(0.22), Inches(0.24), "→", size=15, color=FAINT,
         align=PP_ALIGN.CENTER)


# ================================================================ 01 cover
s = slide(WARM)
rect(s, Emu(0), Emu(0), W, H, fill=WARM)
rect(s, ML, Inches(1.55), Inches(1.5), Inches(0.34),
     fill=WHITE, line=RULE, radius=0.4)
text(s, ML, Inches(1.63), Inches(1.5), Inches(0.22), "Pre-seed · 2026",
     size=11, color=CORAL, bold=True, align=PP_ALIGN.CENTER)

text(s, ML, Inches(2.15), CW, Inches(1.1),
     [("CV ", {"color": INK}), ("COVER", {"color": CORAL})],
     size=76, bold=True, line=1.0)
text(s, ML, Inches(3.42), Inches(8.4), Inches(1.0),
     "Cover letters written from the real job posting,\nnot from a guess.",
     size=22, color=MUTED, line=1.32)
text(s, ML, Inches(4.9), Inches(9.5), Inches(1.0),
     [[("coveritt.vercel.app", {"color": INK, "bold": True}),
       ("  ·  live, deployed, no account required", {})],
      [("Built on Bright Data · Into the Scrape-Verse (WeMakeDevs × Bright Data)", {})]],
     size=13, color=FAINT, line=1.75)
page_no(s, 1)

# ================================================================ 02 problem
s = slide()
kicker(s, "The problem")
heading(s, "Applying to ten jobs means writing ten cover letters.")
sub(s, "So people paste the ad into ChatGPT. That produces a letter that reads like "
       "ChatGPT wrote it: the same three-paragraph shape, the same \"I am writing to "
       "express my enthusiasm\", and an increasingly detectable statistical fingerprint "
       "that applicant tracking systems now screen for.", Inches(2.05))

gap, cw3 = Inches(0.26), (CW - Inches(0.52)) / 3
for i, (big, lbl, body) in enumerate([
    ("10×", "Letters per search",
     "Every posting wants a letter that cites that posting. The work scales linearly with applications."),
    ("Generic", "What the shortcut returns",
     "A chatbot only sees what you pasted. Miss a detail from the ad, and the letter is filler."),
    ("Flagged", "The new failure mode",
     "ATS-side AI detection turns the shortcut into a liability, not just a weak letter."),
]):
    card(s, ML + i * (cw3 + gap), Inches(3.35), cw3, Inches(1.95),
         big=big, lbl=lbl, body=body, big_color=CORAL)

note(s, ML, Inches(5.62), CW,
     "But the writing is the easy half. The hard half is acquiring the job posting "
     "reliably, as structured data, from a page built for human eyes and redesigned "
     "without notice. That acquisition problem is what this company is built around.",
     h=Inches(0.62))
page_no(s, 2)

# ================================================================ 03 solution
s = slide()
kicker(s, "The solution")
heading(s, "Upload a CV. Paste job links. Get one letter per posting.")
sub(s, "Each letter is drafted from the actual scraped job ad and your real resume, in "
       "the posting's own language, and downloads as a formal PDF laid out to the German "
       "DIN 5008 letter standard.", Inches(2.0))

fw, fgap = Inches(2.24), Inches(0.28)
fy = Inches(2.95)
steps = [("CV + job URLs", "No account, no payment, no setup"),
         ("Collector router", "Picks a scrape path per URL, runs them concurrently"),
         ("Structured JobPosting", "Title, company, seniority, location, duties"),
         ("Letter draft", "LLM in JSON mode, language-matched"),
         ("DIN 5008 PDF", "Single file, or ZIP for a batch")]
for i, (t, d) in enumerate(steps):
    x = ML + i * (fw + fgap)
    flow_box(s, x, fy, fw, Inches(1.3), t, d)
    if i < len(steps) - 1:
        arrow(s, x + fw + Inches(0.03), fy + Inches(0.53))

for i, (t, b) in enumerate([
    ("Grounded, not generic",
     "The prompt must cite a named responsibility from the posting and a real project or role from the CV. No filler claims."),
    ("Written to pass as human",
     "No em dashes, no \"thrilled to apply\", no rule-of-three adjective stacks, deliberately varied sentence length."),
    ("Correct by locale",
     "A German posting produces a German Anschreiben even from an English CV. That is the right behaviour, not a bug."),
]):
    card(s, ML + i * (cw3 + gap), Inches(4.75), cw3, Inches(1.7),
         title=t, body=b, fill=WARM, border=RGBColor(0xF5, 0xE4, 0xD8))
page_no(s, 3)

# ================================================================ 04 demo product
s = slide()
kicker(s, "Demo · the product")
lw = Inches(5.55)
heading(s, "Three inputs, one screen.", w=lw)
text(s, ML, Inches(2.05), lw, Inches(0.9),
     "Drag in a CV, paste the job links, hit generate. There is no onboarding, no signup "
     "wall and no pricing page in the way. The entire product is one page and a results modal.",
     size=14, color=MUTED, line=1.55)

by = Inches(3.45)
for headline, rest in [
    ("Any LinkedIn URL shape works", " — including the messy one from your address bar with the job id buried in a query string."),
    ("Several jobs at once", " — scraped concurrently, bundled into a ZIP."),
    ("Letterhead auto-fills", " — name, address, phone, email and LinkedIn are parsed out of the CV itself."),
]:
    rect(s, ML + Inches(0.03), by + Inches(0.09), Inches(0.07), Inches(0.07),
         fill=AMBER, radius=0.5)
    text(s, ML + Inches(0.26), by, lw - Inches(0.26), Inches(0.72),
         [(headline, {"color": INK, "bold": True}), (rest, {})],
         size=13.5, color=MUTED, line=1.45)
    by += Inches(0.78)

note(s, ML, Inches(5.75), lw,
     "Live at coveritt.vercel.app — screenshot captured from production.")

pic_w = Inches(6.1)
s.shapes.add_picture(str(HERE / "assets/landing.png"), W - ML - pic_w,
                     Inches(1.55), width=pic_w)
page_no(s, 4)

# ================================================================ 05 demo health
s = slide()
kicker(s, "Demo · the differentiator")
heading(s, "Every scrape reports what\nit actually recovered.", w=lw, size=27, h=Inches(1.25))
text(s, ML, Inches(2.62), lw, Inches(0.86),
     "Field by field, per run, in production. Note the status on these runs: partial — "
     "not a green checkmark. The postings listed no salary, so the run says so.",
     size=13, color=MUTED, line=1.5)

ORANGE_T = RGBColor(0x9C, 0x8D, 0x82)
KEY = AMBER
STR = RGBColor(0x8F, 0xD6, 0xA0)
BAD = RGBColor(0xFF, 0x8F, 0x7A)
code(s, ML, Inches(3.62), lw, Inches(1.85), [
    [("// real, unedited production record", ORANGE_T)],
    [("{", CODE_FG)],
    [('  "collector_name"', KEY), (": ", CODE_FG), ('"linkedin_job"', STR), (",", CODE_FG)],
    [('  "status"', KEY), (": ", CODE_FG), ('"partial"', BAD), (",", CODE_FG)],
    [('  "fields_missing"', KEY), (": [", CODE_FG), ('"salary"', STR), ("],", CODE_FG)],
    [('  "self_heal_events"', KEY), (": []", CODE_FG)],
    [("}", CODE_FG)],
], size=10.5)

note(s, ML, Inches(5.68), lw,
     "A scraper that quietly degrades is worse than one that crashes, because the output "
     "still looks plausible. Naming the missing fields is how you tell the difference.",
     h=Inches(0.7))

s.shapes.add_picture(str(HERE / "assets/health.png"), W - ML - pic_w,
                     Inches(1.7), width=pic_w)
page_no(s, 5)

# ================================================================ 06 insight
s = slide()
kicker(s, "The insight · why this is defensible")
text(s, ML, Inches(1.22), CW, Inches(1.1),
     [[("A scraper that fails loudly is a bug report.", {})],
      [("A scraper that fails ", {}), ("plausibly", {"italic": True}),
       (" sends your application to the wrong company.", {})]],
     size=27, color=INK, bold=True, line=1.16)

hw = (CW - Inches(0.3)) / 2
ch = Inches(2.95)
cy = Inches(2.95)
rect(s, ML, cy, hw, ch, fill=RGBColor(0xFD, 0xF4, 0xF2),
     line=RGBColor(0xF3, 0xD4, 0xCD), radius=0.07)
tag(s, ML + Inches(0.24), cy + Inches(0.24), "What actually happened", RED,
    RGBColor(0xFB, 0xE6, 0xE2))
text(s, ML + Inches(0.24), cy + Inches(0.74), hw - Inches(0.48), Inches(2.0),
     [[("The Scraper Studio collector was built against Greenhouse. Pointed at Lever and "
        "Ashby — unfamiliar layouts — it did ", {}), ("not", {"color": INK, "bold": True}),
       (" return empty fields.", {})],
      [("", {})],
      [("It returned ", {}), ("the training company's name", {"color": INK, "bold": True}),
       (", every time, with the record otherwise perfectly well-formed. The app happily "
        "generated letters addressed to the wrong employer.", {})]],
     size=12.5, color=MUTED, line=1.5)

x2 = ML + hw + Inches(0.3)
rect(s, x2, cy, hw, ch, fill=RGBColor(0xF4, 0xFA, 0xF6),
     line=RGBColor(0xCF, 0xE6, 0xD8), radius=0.07)
tag(s, x2 + Inches(0.24), cy + Inches(0.24), "The fix — at the application layer",
    GREEN, RGBColor(0xE4, 0xF4, 0xEA))
text(s, x2 + Inches(0.24), cy + Inches(0.74), hw - Inches(0.48), Inches(0.5),
     "Self-healing does not catch this, because from the collector's point of view "
     "nothing is broken. It found a company name.", size=12.5, color=MUTED, line=1.45)
code(s, x2 + Inches(0.24), cy + Inches(1.42), hw - Inches(0.48), Inches(0.92), [
    [("# collectors/router.py", ORANGE_T)],
    [("if not", KEY), (" posting.role_title:", CODE_FG)],
    [("    raise", KEY), (" BrightDataError(...)", CODE_FG)],
], size=10)
text(s, x2 + Inches(0.24), cy + Inches(2.48), hw - Inches(0.48), Inches(0.3),
     "Treat a missing role title as proof the scrape did not land.",
     size=12.5, color=MUTED, line=1.4)

note(s, ML, Inches(6.25), CW,
     "This is the moat in miniature. Anyone can call an LLM. The durable asset is a "
     "validated acquisition layer that knows when it is wrong — and a body of hard-won "
     "knowledge about how job boards fail.")
page_no(s, 6)

# ================================================================ 07 architecture
s = slide()
kicker(s, "How it works")
heading(s, "Three collection paths, on purpose. One schema.")
sub(s, "The router picks a path per URL. Everything downstream is path-agnostic, so "
       "adding a board is additive, never a rewrite.", Inches(2.05), size=14)

table(s, ML, Inches(2.75), CW,
      ["URL", "Path", "Why this path"],
      [["linkedin.com", "Prebuilt LinkedIn Jobs dataset",
        "LinkedIn is aggressively hostile to generic scraping and requires a session for most postings. The prebuilt dataset returns a fixed schema synchronously."],
       ["join.com", "schema.org JobPosting collector",
        "join.com renders client-side, so a generic collector reads nothing. Every posting ships a structured JSON-LD block — exact, and stable across layout changes."],
       ["everything else", "Bright Data Scraper Studio collector",
        "Fields are defined in plain language, not CSS selectors, so the collector can be repaired in place when a site's layout shifts."]],
      [Inches(2.0), Inches(3.1), CW - Inches(5.1)],
      row_h=Inches(0.82), font_size=11.5)

cw4 = (CW - Inches(0.78)) / 4
for i, (lbl, body) in enumerate([
    ("Frontend", "Next.js 16, Tailwind v4, client-side PDF + ZIP"),
    ("Backend", "FastAPI, httpx, pydantic, concurrent scrapes"),
    ("Acquisition", "Bright Data Scraper Studio + prebuilt datasets"),
    ("Deploy", "Vercel + Railway, live in production today"),
]):
    card(s, ML + i * (cw4 + Inches(0.26)), Inches(5.62), cw4, Inches(1.15),
         lbl=lbl, body=body)
page_no(s, 7)

# ================================================================ 08 reliability
s = slide()
kicker(s, "Reliability")
heading(s, "Three layers, cheapest first.")
sub(s, "Scraping is not a one-time build. It is a maintenance liability, and the "
       "architecture is designed around that fact.", Inches(2.05), size=14)

for i, (n, t, b, hl) in enumerate([
    ("01", "Plain-language fields",
     "Extraction is driven by what a field means (\"the job title for this posting\"), not by a selector. A renamed CSS class does not silently produce empty strings.", False),
    ("02", "Automated healing",
     "bdata scraper heal repairs the collector against the live page when extraction genuinely regresses — no hand-written selectors to rewrite.", False),
    ("03", "Guard against being confidently wrong",
     "The one that matters. Validate that what came back is actually about the page you asked for — and refuse when it is not.", True),
]):
    x = ML + i * (cw3 + gap)
    card(s, x, Inches(2.72), cw3, Inches(2.15), big=n, title=t, body=b,
         big_color=CORAL if hl else FAINT,
         fill=WARM if hl else WHITE,
         border=RGBColor(0xF0, 0xD9, 0xC8) if hl else RULE)

text(s, ML, Inches(5.0), hw, Inches(0.3), "Three run statuses, reported honestly",
     size=14, color=INK, bold=True)
ty = Inches(5.42)
for label, fg, bg, desc in [
    ("success", GREEN, RGBColor(0xE4, 0xF4, 0xEA), "every expected field came back"),
    ("partial", RGBColor(0x9A, 0x65, 0x10), RGBColor(0xFD, 0xF0, 0xDD), "the scrape landed, some fields were absent"),
    ("failed", RED, RGBColor(0xFB, 0xE6, 0xE2), "nothing usable came back"),
]:
    tw = tag(s, ML, ty, label, fg, bg, w=Inches(0.85))
    text(s, ML + tw + Inches(0.16), ty + Inches(0.03), hw - tw - Inches(0.2),
         Inches(0.24), desc, size=12.5, color=MUTED)
    ty += Inches(0.42)

text(s, x2, Inches(5.0), hw, Inches(0.3), "What we refuse to do",
     size=14, color=INK, bold=True)
text(s, x2, Inches(5.42), hw, Inches(1.2),
     "Unsupported boards are rejected with a clear message rather than silently "
     "mis-scraped. Company context is optional and off by default, because it is "
     "unreliable on JS-heavy marketing sites. When it returns noise, the letter is "
     "written from the posting and CV alone rather than absorbing nonsense.",
     size=12.5, color=MUTED, line=1.5)
page_no(s, 8)

# ================================================================ 09 market
s = slide()
kicker(s, "Market")
heading(s, "Bottom-up, from applications actually written.", w=Inches(9.6), size=29)
badge(s, "Modelled — assumptions stated")
sub(s, "Sized from applicant behaviour rather than from a top-down \"HR tech is $30B\" "
       "number, so every input below can be argued with individually.", Inches(2.05))

for i, (lbl, big, body, hl) in enumerate([
    ("TAM", "$2.4B", "~400M white-collar job seekers globally × ~$6/yr blended willingness-to-pay for application tooling.", False),
    ("SAM", "$310M", "~26M active seekers in EU + UK + North America who apply through the supported boards, at ~$12/yr realised.", False),
    ("SOM — 3 yr", "$4.6M", "1.5% of SAM. ~32k paying users at $144/yr (see pricing), reached via the free tier already live.", True),
]):
    card(s, ML + i * (cw3 + gap), Inches(2.85), cw3, Inches(2.0),
         lbl=lbl, big=big, body=body,
         big_color=CORAL if hl else INK,
         fill=WARM if hl else WHITE,
         border=RGBColor(0xF0, 0xD9, 0xC8) if hl else RULE)

text(s, ML, Inches(5.0), CW, Inches(0.3),
     "Why the beachhead is German-language applications", size=14, color=INK, bold=True)
for i, (h, b) in enumerate([
    ("DIN 5008 is a real barrier.", " German applications have a formal layout standard. Generic tools output an American business letter, which reads as wrong to a German recruiter."),
    ("Language matching is non-trivial.", " A German posting needs a German Anschreiben with the right conventions, not a translation. Already shipped."),
    ("join.com is a DACH board.", " Supporting it is a deliberate wedge into a market the US-built incumbents ignore."),
]):
    text(s, ML + i * (cw3 + gap), Inches(5.42), cw3, Inches(1.0),
         [(h, {"color": INK, "bold": True}), (b, {})],
         size=12, color=MUTED, line=1.5)

foot(s, "All figures are modelled from public population and pricing anchors, not from "
        "observed revenue. The product currently has no paid tier.")
page_no(s, 9)

# ================================================================ 10 unit economics
s = slide()
kicker(s, "Unit economics")
heading(s, "Cost per letter, from the real call graph.", w=Inches(9.6))
badge(s, "Modelled — list prices")
sub(s, "One letter = one scrape + one LLM draft. Both are metered, both are small, and "
       "the PDF is rendered client-side at zero marginal cost.", Inches(2.05))

lt = Inches(5.5)
table(s, ML, Inches(2.85), lt,
      ["Cost component", "Per letter"],
      [["Bright Data scrape||1 collector run or dataset call", "$0.0060"],
       ["LLM draft||~4k in / ~700 out, JSON mode", "$0.0100"],
       ["CV parse + PDF render||server CPU + client-side jsPDF", "$0.0004"],
       ["Marginal COGS", "$0.0164"]],
      [lt - Inches(1.5), Inches(1.5)], row_h=Inches(0.58), right_cols=(1,),
      total_row=True)
note(s, ML, Inches(5.55), lt,
     "Scrape and draft costs are list-price estimates for the current call pattern, "
     "not negotiated rates or measured spend.")

rt_x = ML + lt + Inches(0.5)
rt = CW - lt - Inches(0.5)
table(s, rt_x, Inches(2.85), rt,
      ["Unit model — Pro tier", "Value"],
      [["Price", "$12 / mo"],
       ["Letters included", "40 / mo"],
       ["Assumed real usage", "14 / mo"],
       ["COGS at that usage", "$0.23"],
       ["Payment + infra overhead", "$0.72"],
       ["Gross margin", "92%"]],
      [rt - Inches(1.4), Inches(1.4)], row_h=Inches(0.4), right_cols=(1,),
      total_row=True)

mw = (rt - Inches(0.36)) / 3
for i, (lbl, big, hl) in enumerate([
    ("CAC · content + SEO", "$18", False),
    ("Lifetime · seasonal", "5 mo", False),
    ("LTV / CAC · $55 LTV", "3.1×", True),
]):
    card(s, rt_x + i * (mw + Inches(0.18)), Inches(5.68), mw, Inches(1.05),
         lbl=lbl, big=big, pad=Inches(0.16), big_size=26, lbl_size=8.5,
         big_color=CORAL if hl else INK,
         fill=WARM if hl else WHITE,
         border=RGBColor(0xF0, 0xD9, 0xC8) if hl else RULE)

foot(s, "Churn is structural, not a defect: users leave because they got the job. "
        "Re-acquisition on the next search is the retention model.")
page_no(s, 10)

# ================================================================ 11 business model
s = slide()
kicker(s, "Business model")
heading(s, "Free stays free. The batch is what converts.", w=Inches(9.6))
badge(s, "Proposed — not yet live")
sub(s, "The product is free and account-less today. That is the top of the funnel, not "
       "the business model — and it is why the free tier keeps a real, "
       "unlimited-feeling allowance.", Inches(2.05))

tiers = [
    ("Free", "$0", "3 letters / month. No account. Full DIN 5008 PDF, no watermark.",
     "Purpose: prove the letter quality is different before asking for anything.", False),
    ("Pro — the core", "$12/mo", "40 letters, ZIP batching, saved CV profiles, letter history.",
     "The trigger is volume: the day someone applies to eight roles at once, the ZIP is worth $12.", True),
    ("Careers services", "$450/yr", "Per seat, for university and bootcamp career offices. Cohort dashboards.",
     "Solves the churn problem: the institution renews annually even as students cycle through.", False),
]
for i, (lbl, big, body, sub_t, hl) in enumerate(tiers):
    x = ML + i * (cw3 + gap)
    card(s, x, Inches(2.95), cw3, Inches(1.98), lbl=lbl, big=big, body=body,
         big_color=CORAL if hl else INK,
         fill=WARM if hl else WHITE,
         border=RGBColor(0xF0, 0xD9, 0xC8) if hl else RULE)
    text(s, x + Inches(0.22), Inches(5.12), cw3 - Inches(0.44), Inches(0.72),
         sub_t, size=10.5, color=FAINT, line=1.4)

note(s, ML, Inches(5.9), CW,
     "Why not charge per letter? Per-letter pricing makes users ration the product at "
     "exactly the moment it is most useful — a big application push. Subscription pricing "
     "aligns with how job searches actually happen: nothing for months, then everything "
     "in three weeks.", h=Inches(0.62))
page_no(s, 11)

# ================================================================ 12 competition
s = slide()
kicker(s, "Competition")
heading(s, "Everyone has the LLM.\nAlmost nobody has the acquisition layer.", size=28)
sub(s, "The differentiator is not letter quality in the abstract. It is that the letter "
       "is written from a verified, structured posting instead of from whatever the user "
       "managed to paste.", Inches(2.42), size=14)

table(s, ML, Inches(3.22), CW,
      ["Approach", "Gets the posting how", "Fails how", "Where Coverit differs"],
      [["ChatGPT / Claude direct", "User copy-pastes", "Silently incomplete input",
        "We scrape the full posting as structured fields, so nothing depends on what the user remembered to paste."],
       ["Cover-letter SaaS||Teal, Kickresume, et al.", "Paste, or a thin URL fetch", "Generic US business-letter output",
        "DIN 5008 layout and true language matching — a German posting yields a German Anschreiben."],
       ["LinkedIn Easy Apply", "Native, no letter", "No differentiation at all",
        "We compete on the letter being specific, which is the only part a recruiter reads twice."],
       ["Build-it-yourself", "Own scraper", "Confidently wrong data",
        "The failure mode on slide 06 is invisible until it has already cost someone an application. We built the guard."]],
      [Inches(2.5), Inches(2.2), Inches(2.3), CW - Inches(7.0)],
      row_h=Inches(0.62), font_size=11)

for i, (t, b) in enumerate([
    ("Acquisition breadth", "Three collection paths converging on one schema. Adding a board is additive."),
    ("Failure literacy", "Per-field run records in production. We know when we are wrong, and we say so."),
    ("Locale correctness", "DIN 5008 and language matching are shipped, not roadmap."),
]):
    card(s, ML + i * (cw3 + gap), Inches(5.92), cw3, Inches(1.24),
         title=t, body=b, pad=Inches(0.18))
page_no(s, 12)

# ================================================================ 13 status
s = slide()
kicker(s, "Status")
heading(s, "Built and deployed, not a prototype.")
sub(s, "Everything below is live in production today. There is no paid tier and no user "
       "base yet — that is the honest position, and the next section is what changes it.",
    Inches(2.02))

text(s, ML, Inches(2.85), hw, Inches(0.3), "Shipped", size=14, color=INK, bold=True)
by = Inches(3.28)
for h, rest in [
    ("Three collection paths", " — LinkedIn (any URL shape), join.com, Greenhouse"),
    ("Resume parsing", " — PDF, TXT, Markdown, plus sender-block extraction"),
    ("Language-matched generation", " — one letter per job URL"),
    ("DIN 5008 PDF output", " — individual files and ZIP bundling"),
    ("Editable letters and letterhead", " — review before download"),
    ("Collector health tracking", " — per-field recovery, publicly visible"),
    ("The confident-wrongness guard", " — refuses rather than misattributes"),
]:
    rect(s, ML + Inches(0.03), by + Inches(0.08), Inches(0.06), Inches(0.06),
         fill=AMBER, radius=0.5)
    text(s, ML + Inches(0.22), by, hw - Inches(0.22), Inches(0.46),
         [(h, {"color": INK, "bold": True}), (rest, {})], size=11.5, color=MUTED, line=1.4)
    by += Inches(0.46)

text(s, x2, Inches(2.85), hw, Inches(0.3), "Known limitations — stated, not hidden",
     size=14, color=INK, bold=True)
by = Inches(3.28)
for h, rest in [
    ("Three boards supported.", " Others are refused with a clear message."),
    ("Extraction completeness varies", " by layout; incomplete runs report partial."),
    ("Contact extraction is regex-based.", " Unusual CV layouts may miss a field."),
    ("Run history is in-memory", " and resets on backend restart."),
    ("No paid tier, no auth, no user accounts", " yet."),
]:
    rect(s, x2 + Inches(0.03), by + Inches(0.08), Inches(0.06), Inches(0.06),
         fill=AMBER, radius=0.5)
    text(s, x2 + Inches(0.22), by, hw - Inches(0.22), Inches(0.5),
         [(h, {"color": INK, "bold": True}), (rest, {})], size=11.5, color=MUTED, line=1.4)
    by += Inches(0.54)

note(s, x2, Inches(6.25), hw,
     "The health view exposes these anyway. Stating them here is cheaper than being "
     "found out.")
page_no(s, 13)

# ================================================================ 14 the ask
s = slide()
kicker(s, "The ask")
heading(s, "$400k pre-seed — 18 months to a\nproven paid funnel.", w=Inches(9.6), size=28, h=Inches(1.2))
badge(s, "Proposed")
sub(s, "The engineering risk is retired: it works, it is deployed, and the hard failure "
       "mode is understood and guarded. What is unproven is willingness to pay. That is "
       "what this round buys an answer to.", Inches(2.5), size=14)

for i, (lbl, big, body) in enumerate([
    ("Engineering", "45%", "Board coverage 3 → 15, persistent storage, accounts and billing."),
    ("Acquisition", "30%", "Content and board SEO against the CAC assumption on slide 10."),
    ("Infra + data", "15%", "Bright Data and LLM spend at 10× current volume."),
    ("Reserve", "10%", "Runway buffer past the 18-month mark."),
]):
    card(s, ML + i * (cw4 + Inches(0.26)), Inches(3.25), cw4, Inches(1.55),
         lbl=lbl, big=big, body=body)

table(s, ML, Inches(5.05), CW,
      ["Milestone", "Target", "What it proves"],
      [["Month 3", "Accounts, billing, 15 job boards",
        "The acquisition layer generalises beyond the three boards it was built against."],
       ["Month 6", "1,000 paying users",
        "The $12 price point clears against a genuinely useful free tier."],
       ["Month 12", "First 10 careers-services contracts",
        "The institutional channel solves structural churn."],
       ["Month 18", "$45k MRR, LTV/CAC ≥ 3",
        "The unit model on slide 10 survives contact with real users."]],
      [Inches(1.8), Inches(3.4), CW - Inches(5.2)],
      row_h=Inches(0.44), font_size=11)
page_no(s, 14)

# ================================================================ 15 close
s = slide(WARM)
rect(s, Emu(0), Emu(0), W, H, fill=WARM)
rect(s, ML, Inches(1.5), Inches(0.56), Pt(3), fill=CORAL)
text(s, ML, Inches(1.95), Inches(10.2), Inches(1.5),
     [[("The writing was never the hard part.", {})],
      [("Knowing the posting is ", {}), ("real", {"italic": True}), (" is.", {})]],
     size=38, color=INK, bold=True, line=1.14)
text(s, ML, Inches(3.65), Inches(8.6), Inches(0.9),
     "Coverit is a validated job-posting acquisition layer with a cover-letter product "
     "on top. The letter is what users buy. The acquisition layer is what competitors "
     "cannot copy from a screenshot.", size=16, color=MUTED, line=1.5)

for i, (lbl, val) in enumerate([
    ("Live product", "coveritt.vercel.app"),
    ("Collector health", "/health"),
    ("Source", "github.com/karankartikeya/cvsmart"),
]):
    x = ML + i * (cw3 + gap)
    card(s, x, Inches(4.95), cw3, Inches(0.95), lbl=lbl, pad=Inches(0.2))
    text(s, x + Inches(0.2), Inches(5.45), cw3 - Inches(0.4), Inches(0.3), val,
         size=12.5, color=INK, bold=True)

text(s, ML, Inches(6.35), Inches(9.0), Inches(0.3),
     "Built for Into the Scrape-Verse · WeMakeDevs × Bright Data",
     size=12, color=FAINT)
page_no(s, 15)

prs.save(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size / 1048576:.2f} MB, {len(prs.slides.__iter__.__self__._sldIdLst)} slides)")
