/**
 * pdf-text.ts
 *
 * Reconstructs searchable page text from PDF.js getTextContent() output.
 * Produces a charItemMap so every character position maps back to the
 * original text item — enabling precise bbox lookup for overlay rects.
 *
 * Targets pdfplumber x_tolerance=2, y_tolerance=2 behaviour so that
 * source_excerpt strings from the backend match the reconstructed text.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawTextItem {
  str: string
  transform: number[]  // PDF text matrix [a,b,c,d,tx,ty]; tx=x, ty=y baseline
  width: number        // advance width in PDF user-space units
  height: number       // effective font size in PDF user-space units
  hasEOL: boolean
  fontName?: string
}

export interface ReconstructedPage {
  /** Reading-order reconstructed text for this page. */
  text: string
  /**
   * charItemMap[i] = index into `items` for character i in `text`.
   * -1 for synthetic characters (inserted spaces, newlines).
   */
  charItemMap: number[]
  /** Filtered, in-order source items (indexed by charItemMap). */
  items: RawTextItem[]
  pageIndex: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemX(item: RawTextItem): number { return item.transform[4] }
function itemY(item: RawTextItem): number { return item.transform[5] }

/**
 * Line-grouping y-tolerance per spec:
 *   max(max(item_a.height, item_b.height) * 0.5, 2)
 *
 * The absolute floor of 2 PDF units handles PDFs where item height
 * metadata is unreliable (e.g. some Type3 or bitmap-embedded fonts).
 */
function sameLine(a: RawTextItem, b: RawTextItem): boolean {
  const tol = Math.max(Math.max(a.height, b.height) * 0.5, 2)
  return Math.abs(itemY(a) - itemY(b)) <= tol
}

// ── Filter ────────────────────────────────────────────────────────────────────

/**
 * Extract genuine text items from PDF.js getTextContent() output.
 * Skips TextMarkedContent items (no `str` field) and blank zero-width items.
 */
function extractItems(content: { items: unknown[] }): RawTextItem[] {
  const out: RawTextItem[] = []
  for (const raw of content.items) {
    const item = raw as Record<string, unknown>
    if (typeof item.str !== "string") continue            // TextMarkedContent
    if (item.str === "" && (item.width as number) === 0) continue  // invisible
    out.push(raw as RawTextItem)
  }
  return out
}

// ── Core reconstruction ───────────────────────────────────────────────────────

/**
 * Reconstruct reading-order text for one PDF page.
 *
 * Algorithm:
 *   1. Filter items (remove non-text, blank zero-width)
 *   2. Sort: descending y (top of page first), then ascending x
 *   3. Group into line clusters using the y-tolerance formula
 *   4. Within each cluster: sort by x ascending
 *   5. Build text + charItemMap:
 *      - Space between items when gap > 2 PDF units (pdfplumber x_tolerance=2)
 *      - \n between lines; \n\n when vertical gap > 2× line height
 */
export function reconstructPageText(
  content: { items: unknown[] },
  pageIndex: number,
): ReconstructedPage {
  const items = extractItems(content)

  // Step 2: sort
  const sorted = [...items].sort((a, b) => {
    const dy = itemY(b) - itemY(a)
    if (Math.abs(dy) > 0.01) return dy
    return itemX(a) - itemX(b)
  })

  // Step 3: group into line clusters
  const lineGroups: RawTextItem[][] = []
  for (const item of sorted) {
    const last = lineGroups[lineGroups.length - 1]
    if (last && sameLine(last[last.length - 1], item)) {
      last.push(item)
    } else {
      lineGroups.push([item])
    }
  }

  // Step 4: sort each cluster by x
  for (const g of lineGroups) g.sort((a, b) => itemX(a) - itemX(b))

  // Map item identity → index in the filtered `items` array
  const itemIndexMap = new Map<RawTextItem, number>()
  for (let i = 0; i < items.length; i++) itemIndexMap.set(items[i], i)

  // Step 5: build text + charItemMap
  let text = ""
  const charItemMap: number[] = []

  const synth = (ch: string) => {
    text += ch
    charItemMap.push(-1)
  }

  for (let gi = 0; gi < lineGroups.length; gi++) {
    const group = lineGroups[gi]
    let prevItem: RawTextItem | null = null

    for (const item of group) {
      const itemIdx = itemIndexMap.get(item) ?? -1

      // Space insertion: gap > 2 PDF units (mirrors pdfplumber x_tolerance=2)
      if (prevItem !== null) {
        const gap = itemX(item) - (itemX(prevItem) + prevItem.width)
        const prevEndsSpace = prevItem.str.endsWith(" ")
        const nextStartsSpace = item.str.startsWith(" ")
        if (gap > 2.0 && !prevEndsSpace && !nextStartsSpace) synth(" ")
      }

      // Append item characters
      for (const ch of item.str) {
        text += ch
        charItemMap.push(itemIdx)
      }

      prevItem = item
    }

    // Newline between groups
    if (gi < lineGroups.length - 1) {
      const nextGroup = lineGroups[gi + 1]
      const lineH = Math.max(...group.map(i => i.height))
      // Vertical gap: current group baseline Y minus next group baseline Y
      // (PDF y goes up, so earlier line has higher y value)
      const thisY = Math.max(...group.map(itemY))
      const nextY = Math.max(...nextGroup.map(itemY))
      const vertGap = thisY - nextY

      if (vertGap > lineH * 2.0) {
        synth("\n"); synth("\n")
      } else {
        synth("\n")
      }
    }
  }

  return { text, charItemMap, items, pageIndex }
}

// ── Multi-page concatenation ──────────────────────────────────────────────────

export interface MultiPageText {
  /** All pages concatenated, separated by '\n' between pages. */
  text: string
  /**
   * charItemMap[i] = item index within charPageMap[i]'s ReconstructedPage.
   * -1 for synthetic characters.
   */
  charItemMap: number[]
  /** charPageMap[i] = which page index the character at position i belongs to. */
  charPageMap: number[]
  pages: ReconstructedPage[]
}

export function buildMultiPageText(pages: ReconstructedPage[]): MultiPageText {
  let text = ""
  const charItemMap: number[] = []
  const charPageMap: number[] = []

  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) {
      // Page separator — assigned to the previous page
      text += "\n"
      charItemMap.push(-1)
      charPageMap.push(pi - 1)
    }
    const page = pages[pi]
    for (let ci = 0; ci < page.text.length; ci++) {
      text += page.text[ci]
      charItemMap.push(page.charItemMap[ci])
      charPageMap.push(pi)
    }
  }

  return { text, charItemMap, charPageMap, pages }
}
