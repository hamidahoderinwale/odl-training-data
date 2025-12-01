'use client'

import { useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64 p-3 bg-surface border border-border rounded-none shadow-lg text-xs text-text leading-relaxed pointer-events-none`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t border-border border-l-transparent border-r-transparent border-b-transparent' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b border-border border-l-transparent border-r-transparent border-t-transparent' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l border-border border-t-transparent border-b-transparent border-r-transparent' :
              'right-full top-1/2 -translate-y-1/2 border-r border-border border-t-transparent border-b-transparent border-l-transparent'
            }`}
            style={{
              [position === 'top' ? 'marginTop' : position === 'bottom' ? 'marginBottom' : position === 'left' ? 'marginLeft' : 'marginRight']: '-1px'
            }}
          />
        </div>
      )}
    </div>
  )
}

