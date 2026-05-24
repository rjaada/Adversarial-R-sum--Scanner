#!/usr/bin/env python3
"""
Adversarial source scanner CLI.

Loads a JSON fixture, resolves relative timestamps, runs the pure scanner,
and prints a human-readable summary or raw JSON. Optionally exports results
to JSON or Markdown files.

Usage:
    python cli.py --fixture fixtures/sample_clean.json
    python cli.py --fixture fixtures/sample_quarantine.json --json
    python cli.py --fixture fixtures/sample_quarantine.json --out-json report.json
    python cli.py --fixture fixtures/sample_quarantine.json --out-md report.md
    python cli.py --fixture fixtures/sample_watch.json --out-json out.json --out-md out.md
"""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from adversarial_scanner import scan_source_for_adversarial_signatures


def _resolve_fixture(raw: dict) -> dict:
    """
    Convert fixture-relative timestamps to UTC ISO strings.

    Fixture format uses:
      trust_history entries: {"days_ago": float, "reliability_score": float}
      recent_events entries: {"hours_ago": float, ...}

    This makes fixtures permanently valid regardless of when they are run.
    """
    now = datetime.now(tz=timezone.utc)

    trust_history = [
        {
            "snapshot_time": (now - timedelta(days=s["days_ago"])).isoformat(),
            "reliability_score": s["reliability_score"],
        }
        for s in raw.get("trust_history", [])
    ]

    recent_events = [
        {
            "event_id": e.get("event_id", "evt_0"),
            "acled_event_type": e["acled_event_type"],
            "timestamp": (now - timedelta(hours=e["hours_ago"])).isoformat(),
            "corroborated": e.get("corroborated", False),
            "impact_score": e.get("impact_score", 0.5),
        }
        for e in raw.get("recent_events", [])
    ]

    return {
        "source_id": raw["source_id"],
        "trust_history": trust_history,
        "recent_events": recent_events,
        "cluster_data": raw.get("cluster_data", []),
        "prior_injection_detected": raw.get("prior_injection_detected", False),
    }


def _print_summary(result: dict) -> None:
    level = result["risk_level"]
    sigs = ", ".join(result["active_signatures"]) or "none"

    print(f"\n{'=' * 52}")
    print(f"  Source:      {result['source_id']}")
    print(f"  Risk level:  {level}")
    print(f"  Risk score:  {result['adversarial_risk_score']:.4f}")
    print(f"  Signatures:  {sigs}")
    if result.get("note"):
        print(f"  Note:        {result['note']}")
    print(f"{'=' * 52}")

    details = result.get("signature_details", {})
    if details and result["active_signatures"]:
        print("\n  Signature details:")
        for sig in result["active_signatures"]:
            vals = details.get(sig, {})
            print(f"    {sig}:")
            for k, v in vals.items():
                print(f"      {k}: {v}")
    print()


def _build_markdown_report(result: dict) -> str:
    """Pure function — builds a Markdown report string from a scanner result dict."""
    scanned_at = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines: list[str] = []

    lines += [
        "# Adversarial Source Scan Report",
        "",
        f"**Source:** {result['source_id']}  ",
        f"**Scanned at:** {scanned_at}  ",
        f"**Risk level:** {result['risk_level']}  ",
        f"**Risk score:** {result['adversarial_risk_score']:.4f}  ",
    ]

    if result.get("note"):
        lines += [f"**Note:** {result['note']}  "]

    lines += [""]

    active = result["active_signatures"]
    if active:
        lines += ["## Active Signatures", ""]
        for sig in active:
            lines.append(f"- {sig}")
        lines += ["", "## Signature Details", ""]
        details = result.get("signature_details", {})
        for sig in active:
            vals = details.get(sig, {})
            lines.append(f"### {sig}")
            lines.append("")
            for k, v in vals.items():
                lines.append(f"- **{k}:** {v}")
            lines.append("")
    else:
        lines += ["## Active Signatures", "", "No adversarial signatures detected.", ""]

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the adversarial source scanner against a JSON fixture."
    )
    parser.add_argument(
        "--fixture",
        required=True,
        metavar="PATH",
        help="Path to a JSON fixture file (see backend/fixtures/).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON result to stdout.",
    )
    parser.add_argument(
        "--out-json",
        metavar="PATH",
        help="Write full scanner result as JSON to this file.",
    )
    parser.add_argument(
        "--out-md",
        metavar="PATH",
        help="Write a Markdown scan report to this file.",
    )
    args = parser.parse_args()

    fixture_path = Path(args.fixture)
    if not fixture_path.exists():
        print(f"error: fixture not found: {fixture_path}", file=sys.stderr)
        sys.exit(1)

    with fixture_path.open() as fh:
        raw = json.load(fh)

    resolved = _resolve_fixture(raw)

    result = scan_source_for_adversarial_signatures(
        source_id=resolved["source_id"],
        trust_history=resolved["trust_history"],
        recent_events=resolved["recent_events"],
        cluster_data=resolved["cluster_data"],
        prior_injection_detected=resolved["prior_injection_detected"],
    )

    # stdout output — --json replaces human summary, both are independent of file exports
    if args.json:
        json.dump(result, sys.stdout, indent=2)
        print()
    else:
        _print_summary(result)

    # file exports — additive, independent of stdout mode
    if args.out_json:
        Path(args.out_json).write_text(json.dumps(result, indent=2))
        print(f"JSON report written: {args.out_json}", file=sys.stderr)

    if args.out_md:
        Path(args.out_md).write_text(_build_markdown_report(result))
        print(f"Markdown report written: {args.out_md}", file=sys.stderr)


if __name__ == "__main__":
    main()
