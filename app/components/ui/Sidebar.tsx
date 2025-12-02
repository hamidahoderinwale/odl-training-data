'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      label: 'Deals',
    },
    {
      href: '/timeline',
      label: 'Timeline',
    },
    {
      href: '/models',
      label: 'Models',
    },
    {
      href: '/linkages',
      label: 'Linkages',
    },
  ]

  return (
    <aside className="w-64 bg-surface border-r border-border flex-shrink-0 min-h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">AI Training Data</h2>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`px-3 py-2 rounded-none text-sm transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-muted hover:bg-border-subtle hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

