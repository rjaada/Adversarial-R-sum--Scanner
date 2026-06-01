import { ClerkProvider } from "@clerk/nextjs"

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={clerkKey ?? ""}>
      {children}
    </ClerkProvider>
  )
}
