# TraceRank — Manual QA Checklist

Use this checklist when testing with real résumés before demos or releases.
Mark ✓ pass / ✗ fail / – skip. Note any issues inline.

---

## 1. Scan Flow

**Setup:** Backend running on :8001, frontend on :3000.

- [ ] Upload a PDF résumé → scan completes without error
- [ ] Upload a DOCX résumé → scan completes without error
- [ ] Upload an unsupported file type (e.g. `.txt`) → error message shown, no crash
- [ ] Submit with no file → error message shown
- [ ] Submit with no job description → error message shown
- [ ] ATS text preview renders and looks like plain-text résumé content
- [ ] Overall score appears and is between 0–100
- [ ] All 6 sub-scores appear (Keywords, Experience, Parse, Structure, Impact)
- [ ] Issues list populates with at least 1 issue for a weak résumé
- [ ] Issues are sorted by impact (highest first)
- [ ] Matched keywords appear green; missing keywords appear red
- [ ] "Fix this first" panel shows ranked fixes with labels
- [ ] Clicking a top-fix item highlights the corresponding issue in the list
- [ ] Scan result appears in scan history sidebar

**Edge cases:**
- [ ] Very short résumé (< 200 words) — scores low, no crash
- [ ] Very long résumé (> 5 pages) — parse completes, preview truncated cleanly
- [ ] JD with no recognisable keywords — scan completes, keyword sections empty
- [ ] Résumé with special characters (accented names, symbols) — no encoding errors

---

## 2. Compare Flow

**Setup:** At least two scans saved to DB (requires DATABASE_URL configured).

- [ ] Scan history shows saved scans
- [ ] "↔ compare" button appears on history items only when a real scan is loaded
- [ ] Clicking "↔ compare" enters compare mode (right pane switches to compare panel)
- [ ] Clicking the same button again exits compare mode
- [ ] Compare panel shows: Before / After filenames, verdict banner, score delta
- [ ] Score delta is correct (after - before, integer pts)
- [ ] Sub-score deltas shown for all 5 scores
- [ ] Keywords gained shown in green; still missing in red
- [ ] Resolved issues shown with ✓; remaining with ·; new regressions with ✗
- [ ] ATS volatility row appears if both scans have simulation data
- [ ] "Exit compare" button returns to normal scan view
- [ ] Verdict is "Improved" when score increases > 2 pts
- [ ] Verdict is "Regressed" when score drops > 2 pts
- [ ] Verdict is "Neutral" when delta ≤ 2 pts

**Edge cases:**
- [ ] Compare two identical scans → Neutral verdict, no keywords gained, no issues resolved
- [ ] No DB configured → compare buttons do not appear (history empty)

---

## 3. Export Flow

- [ ] "Export report" button visible in nav bar
- [ ] Click export on a real scan → new tab opens with HTML report
- [ ] Click export on sample/mock scan → new tab opens with HTML report
- [ ] Report shows: filename, overall score, score breakdown bars
- [ ] Report shows priority actions (if top_fixes present)
- [ ] Report shows critical/high issues (bounded)
- [ ] Report shows keywords (matched green, missing red)
- [ ] Report shows "What to do next" section
- [ ] Report footer shows timestamp and disclaimer
- [ ] Print via browser (Cmd/Ctrl+P) → report renders cleanly on A4/Letter
- [ ] No résumé text or JD text appears verbatim in the report
- [ ] Report works offline (no external CSS/JS dependencies)

**Edge cases:**
- [ ] Scan with 0 top_fixes → priority actions section absent, no crash
- [ ] Scan with 0 issues → issues section absent cleanly
- [ ] Scan without simulation data → ATS section absent cleanly
- [ ] Export button disabled state shows "Exporting…" during request

---

## 4. Rewrite Flow

**Setup:** LLM_ENDPOINT set in backend `.env`, Ollama (or compatible) running.

- [ ] "Generate AI rewrites" button appears on weak_phrasing and low_quantification issues
- [ ] Button does NOT appear when LLM not configured
- [ ] Clicking button generates 3 rewrite variants
- [ ] Variants start with action verbs (not I / My / The)
- [ ] Bare fabricated numbers are wrapped in brackets: [42%] not 42%
- [ ] Rewrite starter is reflected in at least one variant
- [ ] "clear" button removes variants
- [ ] LLM unavailable (Ollama stopped) → friendly error message, no crash
- [ ] Button does not appear for keyword_gap or missing_section issue types

**Edge cases:**
- [ ] LLM endpoint configured but unreachable → "LLM endpoint unreachable" message
- [ ] Short original text (< 5 words) → generates without crash
- [ ] Issue with no rewrite_starter → still generates variants

---

## 5. Analytics Behavior

**Default (disabled):**
- [ ] `ANALYTICS_ENABLED` not set in `.env` → all events return 204, nothing logged
- [ ] No errors thrown in browser console from failed analytics calls

**Enabled (`ANALYTICS_ENABLED=true`):**
- [ ] After scan → `scan_completed` event in backend logs
- [ ] After clicking "Generate AI rewrites" → `rewrite_requested` event logged
- [ ] After clicking "Export report" → `export_triggered` event logged
- [ ] After clicking "↔ compare" and loading a scan → `compare_started` event logged
- [ ] After clicking a top-fix item → `fix_clicked` event logged
- [ ] Log format is structured JSON: `{"analytics": {"event": "...", "properties": {...}}}`
- [ ] No résumé text, JD text, filenames, or emails in logged properties

---

## 6. Degraded / No-DB State

- [ ] Backend starts without `DATABASE_URL` → no crash on startup
- [ ] Scan completes and returns results even without DB
- [ ] Scan history is empty (no DB) → sidebar shows "No saved scans yet"
- [ ] `/api/scans` returns `[]` (not an error) without DB
- [ ] Export via `GET /api/scans/{id}/report` returns 503 (not 500) without DB
- [ ] Compare flow gracefully unavailable (no history to pick from)

---

## 7. ATS Simulation (when enabled)

**Setup:** `ATS_SIMULATION_ENABLED=true` in backend `.env`.

- [ ] Simulation panel appears in right pane after scan
- [ ] 3 profiles shown: Exact Match, Structure Sensitive, Semantic Fit
- [ ] Score spread and volatility (LOW/MEDIUM/HIGH) shown
- [ ] Expanding a profile shows sub-scores, strengths, failures, fixes
- [ ] "Adj. Skills†" footnote visible when profile expanded
- [ ] Universal-safe edits section present
- [ ] Simulation absent in sample/mock if flag not set on backend

---

## Notes

_Use this section to record issues found during QA:_

| Date | Area | Issue | Severity | Status |
|------|------|-------|----------|--------|
|      |      |       |          |        |
