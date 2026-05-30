"""
TraceRank benchmark analyzer.

Usage:
    # Auto-score summary only
    python analyze.py --run outputs/run_20260530_120000.csv

    # Full analysis with manual review joined
    python analyze.py --run outputs/run_20260530_120000.csv --review review/validation.csv

    # Pilot mode (skip outlier thresholds, just print distribution)
    python analyze.py --run outputs/run_20260530_120000.csv --pilot
"""
from __future__ import annotations

import argparse
import csv
import statistics
from pathlib import Path


SCORE_FIELDS = [
    "overall_score", "keyword_match", "experience_alignment",
    "parse_integrity", "structure", "quantified_impact",
]

# Tier thresholds
HIGH_THRESHOLD = 70
LOW_THRESHOLD = 45


def tier(score: int) -> str:
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= LOW_THRESHOLD:
        return "medium"
    return "low"


def load_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def safe_int(v: str) -> int | None:
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def print_distribution(label: str, values: list[int]) -> None:
    if not values:
        print(f"  {label}: no data")
        return
    print(f"  {label}: mean={statistics.mean(values):.1f}  "
          f"median={statistics.median(values):.0f}  "
          f"stdev={statistics.stdev(values) if len(values) > 1 else 0:.1f}  "
          f"min={min(values)}  max={max(values)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="TraceRank benchmark analyzer")
    parser.add_argument("--run", required=True)
    parser.add_argument("--review", default="")
    parser.add_argument("--pilot", action="store_true")
    args = parser.parse_args()

    run_path = Path(args.run)
    if not run_path.is_absolute():
        run_path = Path(__file__).parent / run_path

    rows = load_csv(run_path)
    ok_rows = [r for r in rows if not r.get("error")]
    err_rows = [r for r in rows if r.get("error")]

    print(f"\n{'='*60}")
    print(f"BENCHMARK RUN: {run_path.name}")
    print(f"Pairs total: {len(rows)}  |  Scored: {len(ok_rows)}  |  Errors: {len(err_rows)}")
    if err_rows:
        for r in err_rows:
            print(f"  SKIP {r['pair_id']}: {r['error']}")
    print(f"{'='*60}\n")

    if not ok_rows:
        print("No scored pairs to analyze.")
        return

    # Score distributions
    print("SCORE DISTRIBUTIONS")
    for field in SCORE_FIELDS:
        vals = [safe_int(r[field]) for r in ok_rows if safe_int(r[field]) is not None]
        print_distribution(field, vals)  # type: ignore[arg-type]

    # Tier breakdown
    print("\nTIER BREAKDOWN  (≥70 high / 45–69 medium / <45 low)")
    overall_vals = [safe_int(r["overall_score"]) for r in ok_rows if safe_int(r["overall_score"]) is not None]
    tiers = [tier(v) for v in overall_vals]  # type: ignore[arg-type]
    for t in ("high", "medium", "low"):
        n = tiers.count(t)
        bar = "█" * n
        print(f"  {t:6s}  {bar}  {n} ({100*n//len(tiers) if tiers else 0}%)")

    # Signal flags
    no_kw = sum(1 for r in ok_rows if r.get("has_keyword_signal") == "False")
    no_yr = sum(1 for r in ok_rows if r.get("has_years_signal") == "False")
    print(f"\nSIGNAL FLAGS")
    print(f"  No keyword signal (JD vocabulary unrecognized): {no_kw}/{len(ok_rows)}")
    print(f"  No years signal (JD has no experience requirement): {no_yr}/{len(ok_rows)}")

    # Manual review join
    review_by_id: dict[str, dict] = {}
    if args.review:
        review_path = Path(args.review)
        if not review_path.is_absolute():
            review_path = Path(__file__).parent / review_path
        if review_path.exists():
            for r in load_csv(review_path):
                review_by_id[r["pair_id"]] = r
        else:
            print(f"\n[WARN] review file not found: {review_path}")

    if review_by_id:
        matched_ids = [r["pair_id"] for r in ok_rows if r["pair_id"] in review_by_id]
        print(f"\nMANUAL REVIEW  ({len(matched_ids)} pairs joined)")

        matches = 0
        false_pos = []
        false_neg = []
        implausible = []

        for r in ok_rows:
            pid = r["pair_id"]
            rev = review_by_id.get(pid)
            if not rev:
                continue
            auto_tier = tier(safe_int(r["overall_score"]) or 0)
            human_tier = rev.get("reviewer_judgment", "").strip().lower()
            if human_tier and human_tier == auto_tier:
                matches += 1
            if rev.get("false_positive", "").strip().lower() in ("1", "true", "yes"):
                false_pos.append(pid)
            if rev.get("false_negative", "").strip().lower() in ("1", "true", "yes"):
                false_neg.append(pid)
            if rev.get("score_plausible", "").strip().lower() in ("0", "false", "no"):
                implausible.append(pid)

        total_reviewed = len(matched_ids)
        print(f"  Judgment match rate: {matches}/{total_reviewed} "
              f"({100*matches//total_reviewed if total_reviewed else 0}%)")
        print(f"  False positives:  {len(false_pos)}"
              + (f"  → {false_pos}" if false_pos else ""))
        print(f"  False negatives:  {len(false_neg)}"
              + (f"  → {false_neg}" if false_neg else ""))
        print(f"  Score implausible: {len(implausible)}"
              + (f"  → {implausible}" if implausible else ""))

    # Outlier report (skip in --pilot mode)
    if not args.pilot:
        print("\nOUTLIER REPORT  (|score - expected midpoint| top 5)")
        tier_midpoints = {"high": 80, "medium": 57, "low": 30}
        outliers = []
        for r in ok_rows:
            score = safe_int(r["overall_score"])
            expected = r.get("expected_tier", "").strip().lower()
            if score is None or expected not in tier_midpoints:
                continue
            delta = abs(score - tier_midpoints[expected])
            outliers.append((delta, r["pair_id"], score, expected))
        outliers.sort(reverse=True)
        if outliers:
            for delta, pid, score, exp in outliers[:5]:
                print(f"  {pid}  score={score}  expected={exp}  delta={delta}")
        else:
            print("  No pairs with expected_tier set — fill manifest.csv after pilot.")

    # Worst-profile distribution
    worst_counts: dict[str, int] = {}
    for r in ok_rows:
        wp = r.get("profile_worst_id", "").strip()
        if wp:
            worst_counts[wp] = worst_counts.get(wp, 0) + 1
    if worst_counts:
        print("\nWORST PROFILE DISTRIBUTION")
        for profile, count in sorted(worst_counts.items(), key=lambda x: -x[1]):
            print(f"  {profile}: {count}")

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    main()
