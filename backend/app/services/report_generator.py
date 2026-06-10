"""
HTML report generator — produces a self-contained, print-friendly forensic action document.
Pure function: ScanResult → str (HTML). No I/O.
"""
from __future__ import annotations

import html
from datetime import datetime, timezone

from app.schemas import ScanResult


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _score_color(p: int) -> str:
    if p >= 70:
        return "#0f5c52"
    if p >= 50:
        return "#9a4d22"
    return "#8c2f4e"


def _pct(v: float) -> int:
    return round(v * 100)


_LABEL_COLORS: dict[str, tuple[str, str]] = {
    "Must-have gap":     ("#8c2f4e", "rgba(140,47,78,0.08)"),
    "Critical section":  ("#8c2f4e", "rgba(140,47,78,0.08)"),
    "Broad impact":      ("#0f5c52", "rgba(15,92,82,0.08)"),
    "Fast win":          ("#0f5c52", "rgba(15,92,82,0.08)"),
    "Quantify":          ("#9a4d22", "rgba(154,77,34,0.08)"),
}
_LABEL_DEFAULT = ("#6f6b64", "rgba(0,0,0,0.05)")

_SEV_COLOR: dict[str, str] = {
    "critical": "#8c2f4e",
    "high":     "#9a4d22",
    "medium":   "#6f6b64",
    "low":      "#a0998e",
}

_PROFILE_SHORT = {
    "exact_match":        "Exact",
    "structure_sensitive": "Structure",
    "adjacent_coverage":  "Transferable",
}

_VOL_COLOR = {"LOW": "#0f5c52", "MEDIUM": "#9a4d22", "HIGH": "#8c2f4e"}


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------

def _label_chip(label: str) -> str:
    color, bg = _LABEL_COLORS.get(label, _LABEL_DEFAULT)
    return (
        f'<span style="display:inline-block;font-size:10px;padding:1px 6px;'
        f'border-radius:2px;background:{bg};color:{color};'
        f'font-weight:600;letter-spacing:0.03em;margin-right:4px">'
        f'{html.escape(label)}</span>'
    )


def _score_row(label: str, value: float, *, large: bool = False) -> str:
    p = _pct(value)
    c = _score_color(p)
    num_size = "22px" if large else "15px"
    return (
        f'<div style="margin-bottom:6px">'
        f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">'
        f'<span style="font-size:11px;color:#6f6b64;text-transform:uppercase;letter-spacing:0.08em">{html.escape(label)}</span>'
        f'<span style="font-family:monospace;font-size:{num_size};font-weight:700;color:{c}">{p}<span style="font-size:10px;color:#a0998e">/100</span></span>'
        f'</div>'
        f'<div style="height:3px;background:#d9d3ca;border-radius:2px">'
        f'<div style="height:3px;width:{p}%;background:{c};border-radius:2px"></div>'
        f'</div>'
        f'</div>'
    )


def _section_head(title: str) -> str:
    return (
        f'<div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;'
        f'color:#6f6b64;font-weight:600;border-bottom:1px solid #d9d3ca;'
        f'padding-bottom:5px;margin:22px 0 12px">{html.escape(title)}</div>'
    )


def _priority_actions(scan: ScanResult) -> str:
    if not scan.top_fixes:
        return ""
    rows = []
    for i, fix in enumerate(scan.top_fixes):
        profiles = " · ".join(_PROFILE_SHORT.get(p, p) for p in fix.affects_profiles)
        chips = "".join(_label_chip(l) for l in fix.labels)
        rows.append(
            f'<div style="margin-bottom:12px;padding-bottom:12px;'
            f'border-bottom:1px solid #ece7e0">'
            f'<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:3px">'
            f'<span style="font-family:monospace;font-size:10px;color:#a0998e;padding-top:1px;flex-shrink:0">{i+1:02d}</span>'
            f'<span style="font-size:13px;font-weight:600;color:#1f1d1a;line-height:1.4">{html.escape(fix.title)}</span>'
            f'</div>'
            f'<div style="margin-left:20px">'
            f'<div style="font-size:12px;color:#1f1d1a;margin-bottom:5px;line-height:1.5">{html.escape(fix.suggested_fix)}</div>'
            f'<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'
            f'{chips}'
            f'<span style="margin-left:auto;font-family:monospace;font-size:10px;color:#a0998e">{html.escape(profiles)}</span>'
            f'</div>'
            f'</div>'
            f'</div>'
        )
    return _section_head("Priority actions") + "\n".join(rows)


def _issues_section(scan: ScanResult, max_issues: int = 8) -> str:
    critical_high = [
        iss for iss in scan.issues
        if iss.severity in ("critical", "high")
    ][:max_issues]
    if not critical_high:
        return ""

    rows = []
    for iss in critical_high:
        sev_color = _SEV_COLOR.get(iss.severity, "#6f6b64")
        fix_text = iss.fix_pattern or iss.suggested_fix
        starter_block = ""
        if iss.rewrite_starter:
            starter_block = (
                f'<div style="margin-top:5px;padding:6px 10px;'
                f'background:rgba(15,92,82,0.05);border-left:2px solid #0f5c52;'
                f'font-family:monospace;font-size:11px;color:#1f1d1a;line-height:1.6">'
                f'{html.escape(iss.rewrite_starter)}</div>'
            )
        rows.append(
            f'<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #ece7e0">'
            f'<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:3px">'
            f'<span style="font-family:monospace;font-size:10px;font-weight:700;color:{sev_color};'
            f'text-transform:uppercase;flex-shrink:0">{html.escape(iss.severity)}</span>'
            f'<span style="font-size:13px;font-weight:500;color:#1f1d1a">{html.escape(iss.title)}</span>'
            f'</div>'
            f'<div style="font-size:12px;color:#6f6b64;margin-bottom:4px;line-height:1.4">{html.escape(iss.description)}</div>'
            f'<div style="font-size:12px;color:#1f1d1a;line-height:1.5">{html.escape(fix_text)}</div>'
            f'{starter_block}'
            f'</div>'
        )
    label = f"Issues — critical and high ({len(critical_high)} shown)"
    return _section_head(label) + "\n".join(rows)


def _simulation_section(scan: ScanResult) -> str:
    if not scan.simulation:
        return ""
    sim = scan.simulation
    vol_color = _VOL_COLOR.get(sim.score_spread.volatility, "#6f6b64")

    profile_cells = []
    for p in sim.profiles:
        c = _score_color(p.score)
        profile_cells.append(
            f'<div style="flex:1;text-align:center;padding:6px 4px;border:1px solid #d9d3ca;border-radius:2px">'
            f'<div style="font-family:monospace;font-size:18px;font-weight:700;color:{c}">{p.score}</div>'
            f'<div style="font-size:10px;color:#6f6b64;margin-top:2px">{html.escape(p.label)}</div>'
            f'<div style="font-size:9px;font-family:monospace;color:{_VOL_COLOR.get(p.risk_level,"#6f6b64")};margin-top:1px">{p.risk_level}</div>'
            f'</div>'
        )

    spread_note = (
        f'<div style="font-size:11px;color:{vol_color};font-family:monospace;margin-top:8px">'
        f'Δ{sim.score_spread.delta} pts · {sim.score_spread.volatility} volatility</div>'
    )
    summary_note = (
        f'<div style="font-size:11px;color:#6f6b64;font-style:italic;margin-top:6px;line-height:1.5">'
        f'{html.escape(sim.cross_profile_summary)}</div>'
    )
    profile_row = f'<div style="display:flex;gap:6px;margin-top:4px">{"".join(profile_cells)}</div>'

    universal = ""
    if sim.universal_fixes:
        items = "".join(
            f'<div style="font-size:12px;color:#1f1d1a;margin-bottom:3px">• {html.escape(f)}</div>'
            for f in sim.universal_fixes
        )
        universal = (
            f'<div style="margin-top:10px;padding:8px 10px;'
            f'background:rgba(15,92,82,0.04);border:1px solid #c5dbd7;border-radius:2px">'
            f'<div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;'
            f'color:#0f5c52;font-weight:600;margin-bottom:5px">Safe across all profiles</div>'
            f'{items}</div>'
        )

    return (
        _section_head("ATS profile simulation")
        + profile_row
        + spread_note
        + summary_note
        + universal
    )


def _what_next(scan: ScanResult) -> str:
    bullets: list[str] = []

    # Derive from top_fixes first — they're already ranked
    for fix in scan.top_fixes[:3]:
        bullets.append(fix.suggested_fix)

    # Fill from missing keywords if still short
    if len(bullets) < 3 and scan.missing_keywords:
        kw_str = ", ".join(scan.missing_keywords[:5])
        bullets.append(f"Add missing keywords to Skills section: {kw_str}")

    if not bullets:
        bullets.append("Review the issues above and apply fixes starting from the highest severity.")

    items = "".join(
        f'<div style="font-size:12px;color:#1f1d1a;margin-bottom:5px;line-height:1.5">'
        f'<span style="color:#0f5c52;font-weight:600;margin-right:6px">→</span>'
        f'{html.escape(b)}</div>'
        for b in bullets
    )
    return _section_head("What to do next") + items


# ---------------------------------------------------------------------------
# Full report
# ---------------------------------------------------------------------------

def generate_html_report(scan: ScanResult, generated_at: str | None = None) -> str:
    if generated_at is None:
        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    overall_p = _pct(scan.scores.overall)
    overall_color = _score_color(overall_p)

    scores_html = (
        _score_row("Overall", scan.scores.overall, large=True)
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-top:10px">'
        + _score_row("Keywords", scan.scores.keyword_match)
        + _score_row("Experience", scan.scores.experience_alignment)
        + _score_row("Parse integrity", scan.scores.parse_integrity)
        + _score_row("Structure", scan.scores.structure)
        + _score_row("Impact language", scan.scores.quantified_impact)
        + '</div>'
    )

    matched_kws = ""
    if scan.matched_keywords or scan.missing_keywords:
        chips = "".join(
            f'<span style="font-size:10px;font-family:monospace;padding:2px 6px;border-radius:2px;'
            f'background:rgba(15,92,82,0.08);color:#0f5c52;margin:2px">{html.escape(k)}</span>'
            for k in scan.matched_keywords
        ) + "".join(
            f'<span style="font-size:10px;font-family:monospace;padding:2px 6px;border-radius:2px;'
            f'background:rgba(140,47,78,0.06);color:#8c2f4e;margin:2px">–{html.escape(k)}</span>'
            for k in scan.missing_keywords
        )
        matched_kws = (
            _section_head("Keywords")
            + f'<div style="display:flex;flex-wrap:wrap;gap:2px">{chips}</div>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TraceRank Report — {html.escape(scan.source_id)}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html {{ background: #f6f3ee; color: #1f1d1a; font-family: Inter, system-ui, sans-serif;
         font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }}
  body {{ max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }}
  @media print {{
    html {{ background: #fff; font-size: 12px; }}
    body {{ padding: 16px; max-width: 100%; }}
    .no-print {{ display: none !important; }}
    a {{ text-decoration: none; color: inherit; }}
  }}
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;
            border-bottom:2px solid #1f1d1a;padding-bottom:12px;margin-bottom:20px">
  <div>
    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;
                color:#6f6b64;margin-bottom:4px">TraceRank — ATS forensic report</div>
    <div style="font-size:17px;font-weight:700;color:#1f1d1a">{html.escape(scan.source_id)}</div>
    <div style="font-size:11px;color:#6f6b64;margin-top:2px">{html.escape(generated_at)}</div>
  </div>
  <div style="text-align:right">
    <div style="font-family:monospace;font-size:36px;font-weight:800;
                color:{overall_color};line-height:1">{overall_p}</div>
    <div style="font-size:10px;color:#a0998e;letter-spacing:0.08em;text-transform:uppercase">Overall</div>
  </div>
</div>

<!-- Scores -->
{_section_head("Score breakdown")}
{scores_html}

<!-- Simulation -->
{_simulation_section(scan)}

<!-- Priority actions -->
{_priority_actions(scan)}

<!-- Issues -->
{_issues_section(scan)}

<!-- Keywords -->
{matched_kws}

<!-- What to do next -->
{_what_next(scan)}

<!-- Footer -->
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #d9d3ca;
            font-size:10px;color:#a0998e">
  Generated by TraceRank · {html.escape(generated_at)} · Scores and simulations are heuristic estimates, not exact ATS outputs.
</div>

</body>
</html>"""
