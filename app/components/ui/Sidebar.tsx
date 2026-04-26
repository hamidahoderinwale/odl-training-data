'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { href: '/', label: 'Deals' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/models', label: 'Models' },
    { href: '/linkages', label: 'Linkages' },
  ]

  return (
    <aside
      className={`bg-surface border-r border-border flex-shrink-0 self-start sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-2 border-b border-border h-[57px]">
        {!collapsed && (
          <h2 className="text-lg font-semibold pl-2 truncate">AI Training Data</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-text-muted hover:text-text transition-colors text-lg leading-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      {!collapsed && (
        <nav className="p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 rounded-none text-sm transition-colors ${
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
      )}
    </aside>
  )
}
