export const dynamic = "force-dynamic"

import AccountLayoutShell from "./AccountLayoutShell"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutShell>{children}</AccountLayoutShell>
}
