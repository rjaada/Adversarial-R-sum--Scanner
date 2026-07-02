/**
 * Whether Clerk auth is configured for this build.
 *
 * Clerk is enabled only when a publishable key is present. Without one — e.g.
 * a localhost preview sandbox that cannot reach Clerk's external accounts.dev
 * domain — the app runs in a keyless, signed-out mode (see layout.tsx, which
 * skips ClerkProvider). Components must not call Clerk hooks or render Clerk
 * components when this is false; use the helpers in lib/use-optional-clerk and
 * components/OptionalUserButton instead.
 *
 * This is a build-time constant (NEXT_PUBLIC_ inlined), so any branch on it is
 * stable across renders and safe with React's rules of hooks.
 */
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
