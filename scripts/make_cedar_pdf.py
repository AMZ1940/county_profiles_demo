"""Create a printable PDF snapshot of the fictional Cedar practice profile."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Repository folder")
parser.add_argument("--output", type=Path, help="Optional PDF destination")
args = parser.parse_args()
REPO = args.root.resolve()
OUT = (args.output or REPO / "docs" / "Cedar_Demo_County_Resilience_Profile.pdf").resolve()
DATA = json.loads((REPO / "data" / "cedar_profile.json").read_text(encoding="utf-8"))
with (REPO / "data" / "counties.csv").open(encoding="utf-8-sig", newline="") as stream:
    COUNTY = next(row for row in csv.DictReader(stream) if row["county"] == DATA["county"])

W, H = letter
NAVY = HexColor("#0b1f3a")
TEAL = HexColor("#087e80")
INK = HexColor("#1c2d3b")
MUTED = HexColor("#637785")
LINE = HexColor("#dbe4e8")
PALE = HexColor("#eef5f5")
RED = [HexColor(x) for x in ("#fff1ef", "#ffd7d2", "#f7a99f", "#e97068", "#c83b43", "#8e1b2c")]


def text(x, y, value, size=9, font="Helvetica", color=INK):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    pdf.drawString(x, y, str(value))


def right(x, y, value, size=9, font="Helvetica", color=INK):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    pdf.drawRightString(x, y, str(value))


def lines(value, max_width, size=9, font="Helvetica"):
    words = str(value).split()
    result = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if stringWidth(trial, font, size) <= max_width:
            current = trial
        else:
            if current:
                result.append(current)
            current = word
    if current:
        result.append(current)
    return result


def wrapped(x, y, value, max_width, size=9, leading=13, max_lines=None, color=INK):
    chunks = lines(value, max_width, size)
    if max_lines is not None:
        chunks = chunks[:max_lines]
    for chunk in chunks:
        text(x, y, chunk, size, color=color)
        y -= leading
    return y


def card(x, y, width, height, fill=HexColor("#ffffff")):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x, y, width, height, 7, fill=1, stroke=1)


def section_title(y, number, title, subtitle=None):
    text(42, y, number, 9, "Helvetica-Bold", TEAL)
    text(42, y - 25, title, 17, "Helvetica-Bold", NAVY)
    if subtitle:
        text(42, y - 42, subtitle, 8, color=MUTED)


def page_header(section, page):
    pdf.setFillColor(NAVY)
    pdf.rect(0, H - 82, W, 82, fill=1, stroke=0)
    text(42, H - 33, "COUNTY RESILIENCE LAB  /  PRACTICE PROFILE", 8, "Helvetica-Bold", HexColor("#b4d9dc"))
    text(42, H - 60, section, 18, "Helvetica-Bold", HexColor("#ffffff"))
    pdf.setStrokeColor(LINE)
    pdf.line(42, 39, W - 42, 39)
    text(42, 25, "Fictional data - not for operational use", 7, color=MUTED)
    right(W - 42, 25, f"{page} / 4", 7, color=MUTED)


def money(value):
    return f"${value / 1_000_000:.2f}M".replace(".00M", "M")


def topography_picture(x, y, width, height):
    """Draw a fictional contour illustration, not a real county map."""
    pdf.saveState()
    clip = pdf.beginPath()
    clip.roundRect(x, y, width, height, 6)
    pdf.clipPath(clip, stroke=0)
    pdf.setFillColor(HexColor("#eaf1e9"))
    pdf.rect(x, y, width, height, fill=1, stroke=0)
    pdf.setStrokeColor(HexColor("#83aa96"))
    pdf.setLineWidth(0.8)
    for inset in (0, 9, 18, 27, 36):
        pdf.ellipse(x + 8 + inset, y + 17 + inset * 0.23,
                    x + 132 - inset * 0.55, y + 83 - inset * 0.32,
                    fill=0, stroke=1)
    pdf.setStrokeColor(HexColor("#7caebc"))
    pdf.setLineWidth(3)
    river = pdf.beginPath()
    river.moveTo(x + width - 22, y + height + 6)
    river.curveTo(x + width - 50, y + 49, x + width - 19, y + 31, x + width - 47, y - 5)
    pdf.drawPath(river, fill=0, stroke=1)
    pdf.setFillColor(HexColor("#ffffff"))
    pdf.setFillAlpha(0.87)
    pdf.rect(x, y, width, 16, fill=1, stroke=0)
    pdf.setFillAlpha(1)
    text(x + 8, y + 5, "ILLUSTRATIVE TERRAIN  /  NOT A REAL MAP", 6, "Helvetica-Bold", NAVY)
    pdf.restoreState()
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x, y, width, height, 6, fill=0, stroke=1)


def hazard_icon(name, cx, cy):
    """Small vector pictograms keep the PDF self-contained and printable."""
    pdf.setFillColor(PALE)
    pdf.circle(cx, cy, 17, fill=1, stroke=0)
    pdf.setStrokeColor(TEAL)
    pdf.setFillColor(TEAL)
    pdf.setLineWidth(1.6)
    if "flood" in name.lower():
        for offset in (-6, 0, 6):
            wave = pdf.beginPath()
            wave.moveTo(cx - 10, cy + offset)
            wave.curveTo(cx - 5, cy + offset + 4, cx - 2, cy + offset - 4, cx + 2, cy + offset)
            wave.curveTo(cx + 6, cy + offset + 4, cx + 8, cy + offset - 3, cx + 11, cy + offset)
            pdf.drawPath(wave, fill=0, stroke=1)
    elif "tornado" in name.lower():
        for offset, half in ((7, 10), (2, 8), (-3, 5), (-8, 2)):
            pdf.line(cx - half, cy + offset, cx + half, cy + offset)
    elif "heat" in name.lower():
        pdf.circle(cx, cy, 5, fill=0, stroke=1)
        for dx, dy in ((0, 9), (0, -9), (9, 0), (-9, 0), (7, 7), (-7, 7), (7, -7), (-7, -7)):
            pdf.line(cx + dx * 0.75, cy + dy * 0.75, cx + dx * 1.2, cy + dy * 1.2)
    elif "winter" in name.lower():
        for dx, dy in ((0, 10), (9, 5), (9, -5)):
            pdf.line(cx - dx, cy - dy, cx + dx, cy + dy)
        pdf.circle(cx, cy, 2, fill=1, stroke=0)
    else:
        flame = pdf.beginPath()
        flame.moveTo(cx, cy - 10)
        flame.curveTo(cx - 12, cy - 4, cx - 5, cy + 5, cx - 3, cy + 10)
        flame.curveTo(cx + 1, cy + 5, cx + 6, cy + 8, cx + 6, cy + 1)
        flame.curveTo(cx + 10, cy - 4, cx + 4, cy - 10, cx, cy - 10)
        pdf.drawPath(flame, fill=1, stroke=0)


def score_badge(cx, cy, score):
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(3)
    pdf.circle(cx, cy, 17, fill=0, stroke=1)
    pdf.setStrokeColor(TEAL)
    pdf.arc(cx - 17, cy - 17, cx + 17, cy + 17, startAng=90, extent=-3.6 * score)
    pdf.setLineWidth(1)
    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawCentredString(cx, cy - 3, str(score))


def page_one():
    page_header("Cedar Demo County", 1)
    pdf.setFillColor(HexColor("#fff6e9"))
    pdf.roundRect(42, 662, 528, 34, 5, fill=1, stroke=0)
    text(53, 675, "FICTIONAL DEMONSTRATION - All places, events, and award values are invented.", 8, "Helvetica-Bold", HexColor("#805823"))
    section_title(639, "01 / OVERVIEW", "County at a glance", "County figures are compared with an invented Cedar State baseline.")
    topography_picture(403, 583, 167, 75)
    stats = [
        ("POPULATION", f"{int(COUNTY['population']):,}", f"State {DATA['state_facts']['population']:,}"),
        ("HOUSEHOLDS", f"{int(COUNTY['households']):,}", f"State {DATA['state_facts']['households']:,}"),
        ("MEDIAN HOUSEHOLD INCOME", f"${int(COUNTY['median_household_income']):,}", f"State ${DATA['state_facts']['median_household_income']:,}"),
    ]
    for i, (label, value, comparison) in enumerate(stats):
        x = 42 + i * 180
        card(x, 505, 168, 75)
        text(x + 12, 557, label, 7, "Helvetica-Bold", MUTED)
        text(x + 12, 529, value, 18, "Helvetica-Bold", NAVY)
        text(x + 12, 514, comparison, 8, color=TEAL)
    section_title(478, "02 / PEOPLE", "Support-needs indicators", "Percent of the relevant population or households; bases vary by indicator.")
    text(50, 410, "INDICATOR", 7, "Helvetica-Bold", MUTED)
    text(305, 410, "COUNTY / STATE", 7, "Helvetica-Bold", MUTED)
    right(562, 410, "DIFFERENCE", 7, "Helvetica-Bold", MUTED)
    y = 397
    for i, row in enumerate(DATA["indicators"]):
        if i % 2 == 0:
            pdf.setFillColor(HexColor("#f5f8f8"))
            pdf.rect(42, y - 26, 528, 31, fill=1, stroke=0)
        text(50, y - 9, row["label"], 8, "Helvetica-Bold")
        text(50, y - 20, row["note"], 6.5, color=MUTED)
        bx = 305
        pdf.setFillColor(HexColor("#d7e3e6"))
        pdf.rect(bx, y - 13, 132, 5, fill=1, stroke=0)
        pdf.setFillColor(TEAL)
        pdf.rect(bx, y - 13, min(132, row["county"] * 2.6), 5, fill=1, stroke=0)
        text(447, y - 11, f"{row['county']:.1f}% / {row['state']:.1f}%", 7)
        right(562, y - 11, f"{row['county'] - row['state']:+.1f} pp", 8, "Helvetica-Bold", TEAL)
        y -= 31
    wrapped(42, 73, "Difference is in percentage points: county minus state. These group-level rates do not identify any person's needs.", 528, 7.5, 10, color=MUTED)
    pdf.showPage()


def page_two():
    page_header("Vulnerability map and disaster history", 2)
    section_title(686, "03 / PLACE", "Schematic vulnerability heat map", "Darker red indicates a higher modeled support-needs share.")
    card(42, 368, 528, 243)
    text(59, 590, "12 INVENTED PLANNING ZONES", 8, "Helvetica-Bold", NAVY)
    x0, y0, cw, ch = 60, 572, 104, 40
    for i, zone in enumerate(DATA["zones"]):
        row, col = divmod(i, 3)
        x, y = x0 + col * 107, y0 - row * 44
        level = max(0, min(5, int((zone["score"] - 18) / 5)))
        pdf.setFillColor(RED[level])
        pdf.roundRect(x, y - ch, cw, ch, 3, fill=1, stroke=0)
        color = HexColor("#ffffff") if level >= 4 else NAVY
        text(x + 7, y - 16, zone["name"], 7.5, "Helvetica-Bold", color)
        text(x + 7, y - 30, f"{zone['score']}%", 10, "Helvetica-Bold", color)
    pdf.setFillColor(RED[0])
    pdf.rect(59, 383, 48, 9, fill=1, stroke=0)
    for i in range(1, 6):
        pdf.setFillColor(RED[i])
        pdf.rect(59 + i * 48, 383, 48, 9, fill=1, stroke=0)
    text(59, 373, "Lower", 7, color=MUTED)
    right(347, 373, "Higher", 7, color=MUTED)
    text(391, 541, "MAP READING GUIDE", 7, "Helvetica-Bold", TEAL)
    wrapped(391, 518, "Cedar Center has the highest practice score at 44%.", 160, 9, 14)
    wrapped(391, 461, "Tiles are not real neighborhoods or census tracts. Scores are invented and are not calculated from the countywide indicators.", 160, 8, 12, color=MUTED)
    section_title(341, "04 / HISTORY", "Invented disaster events", "Type, incident duration, impacts, and awarded PA / IA amounts.")
    positions = [(42, 174), (312, 174), (42, 50), (312, 50)]
    for event, (x, y) in zip(DATA["disasters"], positions):
        card(x, y, 258, 111)
        text(x + 11, y + 90, str(event["year"]), 8, "Helvetica-Bold", TEAL)
        wrapped(x + 50, y + 90, event["type"], 193, 9, 12, 2)
        text(x + 11, y + 64, f"{event['duration_days']} days", 8, "Helvetica-Bold")
        text(x + 74, y + 64, f"PA {money(event['pa'])}  |  IA {money(event['ia'])}", 7.5)
        wrapped(x + 11, y + 46, event["impact"], 235, 7.5, 10.5, 3, MUTED)
    pdf.showPage()


def page_three():
    page_header("Recovery funding", 3)
    section_title(686, "05 / FUNDING", "Where the practice dollars went", "PA, IA, and other grants are separate funding streams.")
    pa = sum(row["amount"] for row in DATA["pa_categories"])
    ia = sum(row["ia"] for row in DATA["disasters"])
    grants = sum(row["amount"] for row in DATA["grants"])
    for i, (label, value) in enumerate((("PUBLIC ASSISTANCE", pa), ("INDIVIDUAL ASSISTANCE", ia), ("OTHER GRANTS", grants))):
        x = 42 + i * 180
        card(x, 558, 168, 75)
        text(x + 12, 610, label, 7, "Helvetica-Bold", MUTED)
        text(x + 12, 579, money(value), 20, "Helvetica-Bold", NAVY)
    text(42, 528, "PUBLIC ASSISTANCE BY CATEGORY", 9, "Helvetica-Bold", TEAL)
    text(42, 513, "Awarded dollars for eligible public work in the fictional events", 8, color=MUTED)
    max_cat = max(row["amount"] for row in DATA["pa_categories"])
    y = 486
    for row in DATA["pa_categories"]:
        text(48, y, row["code"], 9, "Helvetica-Bold", TEAL)
        text(70, y, row["name"], 8)
        pdf.setFillColor(PALE)
        pdf.roundRect(272, y - 2, 220, 9, 2, fill=1, stroke=0)
        pdf.setFillColor(TEAL)
        pdf.roundRect(272, y - 2, 220 * row["amount"] / max_cat, 9, 2, fill=1, stroke=0)
        right(562, y, money(row["amount"]), 8, "Helvetica-Bold", NAVY)
        y -= 37
    pdf.setStrokeColor(LINE)
    pdf.line(42, 263, 570, 263)
    text(42, 243, "OTHER EMERGENCY-RELATED GRANTS", 9, "Helvetica-Bold", TEAL)
    y = 218
    for grant in DATA["grants"]:
        text(46, y, f"{grant['short']}  |  {grant['name']}", 8, "Helvetica-Bold")
        right(562, y, f"{money(grant['amount'])}  ({grant['year']})", 8, "Helvetica-Bold", TEAL)
        wrapped(46, y - 13, grant["purpose"], 490, 7.5, 11, 2, MUTED)
        y -= 49
    wrapped(42, 65, "IA supported individuals and households; the amounts above are invented examples, not FEMA award records.", 528, 7.5, 10, color=MUTED)
    pdf.showPage()


def page_four():
    page_header("Future hazard planning", 4)
    section_title(686, "06 / FUTURE RISK", "Illustrative hazard index", "Relative planning scores from 0 to 100; not probabilities or forecasts.")
    y = 594
    for hazard in DATA["hazards"]:
        card(42, y - 51, 528, 56)
        hazard_icon(hazard["type"], 69, y - 23)
        text(96, y - 16, hazard["type"], 10, "Helvetica-Bold")
        text(96, y - 32, hazard["likelihood"] + " scenario likelihood", 7.5, color=MUTED)
        pdf.setFillColor(PALE)
        pdf.roundRect(270, y - 28, 225, 11, 2, fill=1, stroke=0)
        pdf.setFillColor(TEAL)
        pdf.roundRect(270, y - 28, hazard["score"] * 2.25, 11, 2, fill=1, stroke=0)
        score_badge(538, y - 23, hazard["score"])
        y -= 69
    card(42, 119, 528, 95, HexColor("#eff5f5"))
    text(54, 190, "HOW TO INTERPRET THESE SCORES", 9, "Helvetica-Bold", TEAL)
    wrapped(54, 173, "The likelihood labels and index values are fictional scenario assumptions. A real county profile needs documented hazard models, exposure data, a time horizon, and expert review.", 500, 8.5, 12, color=INK)
    text(42, 94, "SOURCE AND UPDATE NOTES", 9, "Helvetica-Bold", TEAL)
    wrapped(42, 77, "County facts: data/counties.csv. Comparisons, zones, events, grants and hazards: data/cedar_profile.json. Data as of 2026-01-01. This PDF is a snapshot; edit the source files and regenerate it to reflect future changes.", 528, 7.5, 10, color=MUTED)
    pdf.showPage()


OUT.parent.mkdir(parents=True, exist_ok=True)
pdf = canvas.Canvas(str(OUT), pagesize=letter, pageCompression=1)
pdf.setTitle("Cedar Demo County Resilience Profile - Fictional Practice Data")
pdf.setAuthor("County Resilience Lab practice project")
page_one()
page_two()
page_three()
page_four()
pdf.save()
print(OUT)
