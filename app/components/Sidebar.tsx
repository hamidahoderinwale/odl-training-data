'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      label: 'Deals',
      icon: '📊',
    },
    {
      href: '/timeline',
      label: 'Timeline',
      icon: '📅',
    },
    {
      href: '/models',
      label: 'Models',
      icon: '🤖',
    },
    {
      href: '/linkages',
      label: 'Linkages',
      icon: '🔗',
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: '📈',
    },
  ]

  return (
    <aside className="w-64 bg-surface border-r border-border flex-shrink-0 min-h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">AI Training Data</h2>
        <p className="text-xs text-text-muted">Deals Dashboard</p>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-muted hover:bg-border-subtle hover:text-text'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

