"use client"

/**
 * Renders Clerk's <UserButton> when Clerk is configured, and nothing when it
 * is not (keyless localhost preview). Drop-in replacement for <UserButton>.
 */
import { UserButton } from "@clerk/nextjs"
import { clerkEnabled } from "@/lib/clerk-enabled"

type UserButtonProps = React.ComponentProps<typeof UserButton>

export function OptionalUserButton(props: UserButtonProps) {
  if (!clerkEnabled) return null
  return <UserButton {...props} />
}
