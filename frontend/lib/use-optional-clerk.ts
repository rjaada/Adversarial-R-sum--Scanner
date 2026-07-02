"use client"

/**
 * Clerk hooks that degrade to a stable signed-out shape when Clerk is not
 * configured (keyless localhost preview). In production a key is always
 * present, so these forward to the real Clerk hooks unchanged.
 *
 * `clerkEnabled` is a build-time constant, so the branch is identical on every
 * render — the conditional hook call is safe at runtime. The inline eslint
 * disable silences the rules-of-hooks lint, which can't see that the condition
 * never changes.
 */
import { useAuth, useUser } from "@clerk/nextjs"
import { clerkEnabled } from "./clerk-enabled"

type OptionalAuth = {
  isLoaded: boolean
  isSignedIn: boolean | undefined
  getToken: (options?: unknown) => Promise<string | null>
}

const ANON_AUTH: OptionalAuth = {
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
}

export function useOptionalAuth(): OptionalAuth {
  if (!clerkEnabled) return ANON_AUTH
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth() as OptionalAuth
}

type ClerkUser = ReturnType<typeof useUser>["user"]

type OptionalUser = {
  isLoaded: boolean
  isSignedIn: boolean | undefined
  user: ClerkUser | null
}

const ANON_USER: OptionalUser = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
}

export function useOptionalUser(): OptionalUser {
  if (!clerkEnabled) return ANON_USER
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useUser() as OptionalUser
}
