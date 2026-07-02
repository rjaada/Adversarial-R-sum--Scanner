import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Clerk is enabled only when a publishable key is configured.
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const isProtectedRoute = createRouteMatcher(["/account(.*)", "/history(.*)"])

// With a key (production, and local dev with keys) run the real Clerk
// middleware. Without one — e.g. a localhost preview sandbox that cannot reach
// Clerk's external accounts.dev domain — fall back to a pass-through so the dev
// server never tries to redirect off-localhost for the dev-browser handshake.
export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
      }
    })
  : function middleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
