/**
 * Progress Bar Component
 * Displays a progress bar with dynamic width based on percentage
 * Uses CSS custom properties set via useEffect to avoid inline styles
 */

'use client'

import { useEffect, useRef } from 'react'

interface ProgressBarProps {
  percentage: number
  className?: string
  barClassName?: string
}

export default function ProgressBar({ 
  percentage, 
  className = '',
  barClassName = ''
}: ProgressBarProps) {
  const safePercentage = Math.min(100, Math.max(0, percentage))
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--progress-percentage', `${safePercentage}`)
    }
  }, [safePercentage])
  
  const containerClasses = className ? `progress-bar-container ${className}` : 'progress-bar-container'
  const barClasses = barClassName ? `progress-bar-fill ${barClassName}` : 'progress-bar-fill'
  
  return (
    <div 
      ref={containerRef}
      className={containerClasses}
    >
      <div className={barClasses} />
    </div>
  )
}
