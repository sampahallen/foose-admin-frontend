import { useEffect, useState } from 'react'
import { AuthRequired } from './components'
import { AdminDisputesPage } from './pages/AdminDisputesPage'
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage'
import { AdminKycDetailPage } from './pages/AdminKycDetailPage'
import { AdminKycPage } from './pages/AdminKycPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { AdminUserRolesPage } from './pages/AdminUserRolesPage'
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

  if (pathname.startsWith('/admin/analytics')) {
    return (
      <AuthRequired superAdminOnly>
        <AdminAnalyticsPage />
      </AuthRequired>
    )
  }

  if (pathname.startsWith('/admin/users')) {
    return (
      <AuthRequired superAdminOnly>
        <AdminUserRolesPage />
      </AuthRequired>
    )
  }

  return (
    <AuthRequired superAdminOnly>
      <AdminOverviewPage />
    </AuthRequired>
  )
}
