import { useEffect, useState } from 'react'
import { AuthRequired } from './components'
import { AdminDisputesPage } from './pages/AdminDisputesPage'
import { AdminKycDetailPage } from './pages/AdminKycDetailPage'
import { AdminKycPage } from './pages/AdminKycPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { LoginPage } from './pages/LoginPage'
import { getCurrentAppPathname } from './utils/navigation'

function usePathname() {
  const [pathname, setPathname] = useState(() => getCurrentAppPathname())

  useEffect(() => {
    const update = () => setPathname(getCurrentAppPathname())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  return pathname
}

export default function App() {
  const pathname = usePathname()

  if (pathname.startsWith('/login')) return <LoginPage />

  if (/^\/admin\/kyc\/[^/]+/.test(pathname)) {
    return (
      <AuthRequired>
        <AdminKycDetailPage />
      </AuthRequired>
    )
  }

  if (pathname.startsWith('/admin/kyc')) {
    return (
      <AuthRequired>
        <AdminKycPage />
      </AuthRequired>
    )
  }

  if (pathname.startsWith('/admin/disputes')) {
    return (
      <AuthRequired>
        <AdminDisputesPage />
      </AuthRequired>
    )
  }

  return (
    <AuthRequired>
      <AdminOverviewPage />
    </AuthRequired>
  )
}
