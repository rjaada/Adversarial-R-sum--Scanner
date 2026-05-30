"""
TraceRank benchmark runner — frozen engine edition.

Usage:
    # 10-pair pilot (reads first 10 rows of manifest)
    python runner.py --manifest manifest.csv --limit 10

    # Full run
    python runner.py --manifest manifest.csv

    # Custom output path
    python runner.py --manifest manifest.csv --output outputs/run_custom.csv

Inputs:  inputs/resumes/<resume_file>  (plain .txt)
         inputs/jds/<jd_file>          (plain .txt)
Outputs: outputs/run_<timestamp>.csv
"""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

# Resolve backend package so we can import services directly
REPO_ROOT = Path(__file__).parent.parent
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.fix_ranker import rank_fixes
from app.services.jd_requirements import extract_jd_requirements
from app.services.parse_sections import parse_resume_sections
from app.services.rewrite_suggestions import generate_fix_suggestions
from app.services.scoring import extract_raw_signals, scores_from_raw

ENGINE_VERSION = "1.0-frozen-2026-05-30"

INPUTS = Path(__file__).parent / "inputs"
OUTPUTS = Path(__file__).parent / "outputs"

OUTPUT_FIELDS = [
    "pair_id", "resume_file", "jd_file", "role_type",
    "source_resume", "source_jd", "expected_tier",
    # scores
    "overall_score", "keyword_match", "experience_alignment",
    "parse_integrity", "structure", "quantified_impact",
    # keyword evidence
    "matched_keywords_n", "missing_keywords_n", "total_jd_keywords",
    # issues
    "issues_total", "issues_critical", "issues_high", "issues_medium", "issues_low",
    # worst profile
    "profile_worst_id", "profile_worst_score", "profile_adjacent_score",
    # signal flags
    "min_years_jd", "has_keyword_signal", "has_years_signal",
    # run metadata
    "run_timestamp", "engine_version", "error",
]


def pct(v: float) -> int:
    return round(v * 100)


def run_pair(resume_text: str, jd_text: str) -> dict:
    # .txt benchmark inputs have no formatting overhead — parse_integrity = 1.0
    sections = parse_resume_sections(resume_text)
    jd_reqs = extract_jd_requirements(jd_text)
    raw = extract_raw_signals(sections, jd_reqs, parse_integrity=1.0)
    scores = scores_from_raw(raw)
    issues = generate_fix_suggestions(sections, jd_reqs)
    sorted_issues = sorted(issues, key=lambda x: x.impact_score, reverse=True)

    required = jd_reqs.get("required_keywords", [])
    resume_lower = resume_text.lower()
    matched = [k for k in required if k.lower() in resume_lower]
    missing = [k for k in required if k.lower() not in resume_lower]

    worst_id = worst_score = adj_score = ""
    try:
        from app.services.ats_profiles import simulate_profiles
        sim = simulate_profiles(sections, jd_reqs, parse_integrity=1.0, issues=sorted_issues)
        if sim:
            worst_id = sim.worst_profile.id if sim.worst_profile else ""
            worst_score = pct(sim.worst_profile.score) if sim.worst_profile else ""
            adj_profile = next((p for p in sim.profiles if p.id == "adjacent_coverage"), None)
            adj_score = pct(adj_profile.score) if adj_profile else ""
    except Exception:
        pass

    return {
        "overall_score": pct(scores.overall),
        "keyword_match": pct(scores.keyword_match),
        "experience_alignment": pct(scores.experience_alignment),
        "parse_integrity": pct(scores.parse_integrity),
        "structure": pct(scores.structure),
        "quantified_impact": pct(scores.quantified_impact),
        "matched_keywords_n": len(matched),
        "missing_keywords_n": len(missing),
        "total_jd_keywords": len(required),
        "issues_total": len(sorted_issues),
        "issues_critical": sum(1 for i in sorted_issues if i.severity == "critical"),
        "issues_high": sum(1 for i in sorted_issues if i.severity == "high"),
        "issues_medium": sum(1 for i in sorted_issues if i.severity == "medium"),
        "issues_low": sum(1 for i in sorted_issues if i.severity == "low"),
        "profile_worst_id": worst_id,
        "profile_worst_score": worst_score,
        "profile_adjacent_score": adj_score,
        "min_years_jd": jd_reqs.get("min_years_experience") or "",
        "has_keyword_signal": len(required) > 0,
        "has_years_signal": jd_reqs.get("min_years_experience") is not None,
        "error": "",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="TraceRank benchmark runner")
    parser.add_argument("--manifest", default="manifest.csv")
    parser.add_argument("--output", default="")
    parser.add_argument("--limit", type=int, default=0, help="Run first N pairs only")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = Path(__file__).parent / manifest_path

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = Path(args.output) if args.output else OUTPUTS / f"run_{timestamp}.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with manifest_path.open() as f:
        rows = list(csv.DictReader(f))

    if args.limit:
        rows = rows[: args.limit]

    run_ts = datetime.now(timezone.utc).isoformat()
    results: list[dict] = []

    for i, row in enumerate(rows, 1):
        pair_id = row["pair_id"]
        print(f"[{i}/{len(rows)}] {pair_id} ...", end=" ", flush=True)

        resume_path = INPUTS / "resumes" / row["resume_file"]
        jd_path = INPUTS / "jds" / row["jd_file"]

        result: dict = {f: row.get(f, "") for f in OUTPUT_FIELDS}
        result["run_timestamp"] = run_ts
        result["engine_version"] = ENGINE_VERSION

        try:
            resume_text = resume_path.read_text(encoding="utf-8")
            jd_text = jd_path.read_text(encoding="utf-8")
            scored = run_pair(resume_text, jd_text)
            result.update(scored)
            print(f"score={result['overall_score']}")
        except FileNotFoundError as e:
            result["error"] = f"missing file: {e.filename}"
            print(f"SKIP — {result['error']}")
        except Exception as e:
            result["error"] = f"{type(e).__name__}: {e}"
            print(f"ERROR — {result['error']}")

        results.append(result)

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(results)

    ok = sum(1 for r in results if not r["error"])
    print(f"\nDone. {ok}/{len(results)} pairs scored → {output_path}")


if __name__ == "__main__":
    main()
