import type { ReactNode } from "react"

// The methodology page is always light regardless of the user's theme preference.
// It is a public trust document — its legibility and editorial character depend
// on the warm-paper light aesthetic. data-theme="light" on this wrapper overrides
// the root html[data-theme] for all elements inside it.
export default function MethodologyLayout({ children }: { children: ReactNode }) {
  return <div data-theme="light">{children}</div>
}
