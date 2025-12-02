/**
 * Shared utility functions for formatting and data manipulation
 */

export interface DealPrice {
  priceUsd?: number | null
  priceRangeMinUsd?: number | null
  priceRangeMaxUsd?: number | null
  reportedTerms?: string | null
}

/**
 * Format a price value to a human-readable string
 */
export function formatPriceValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(0)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Format a deal's price to a human-readable string
 */
export function formatPrice(deal: DealPrice): string {
  // Check reported terms first for special cases
  const terms = deal.reportedTerms?.toLowerCase() || ''
  
  if (terms.includes('public') || terms.includes('commons') || terms.includes('open data')) {
    return 'Public commons'
  }
  
  if (deal.priceUsd) {
    return formatPriceValue(deal.priceUsd)
  }
  
  if (deal.priceRangeMinUsd && deal.priceRangeMaxUsd) {
    return `${formatPriceValue(deal.priceRangeMinUsd)}–${formatPriceValue(deal.priceRangeMaxUsd)}`
  }
  
  return deal.reportedTerms || 'Undisclosed'
}

/**
 * Get URL for a source name
 * Maps common source names to their URLs
 */
export function getSourceUrl(sourceName: string | null): string | null {
  if (!sourceName) return null
  
  // If it's already a URL, return as-is
  if (sourceName.startsWith('http://') || sourceName.startsWith('https://')) {
    return sourceName
  }
  
  // Map source names to URLs
  const sourceUrlMap: Record<string, string> = {
    'CB Insights': 'https://www.cbinsights.com/research/ai-content-licensing-deals/',
    'Reuters': 'https://www.reuters.com/',
    'Axios': 'https://www.axios.com/',
    'TechCrunch': 'https://techcrunch.com/',
    'The Verge': 'https://www.theverge.com/',
    'SEC Filing': 'https://www.sec.gov/edgar/searchedgar/companysearch.html',
    'Company Filings': 'https://www.sec.gov/edgar/searchedgar/companysearch.html',
    'Court Filing': 'https://www.uscourts.gov/',
    'MBW': 'https://www.musicbusinessworldwide.com/',
    'Open Source': 'https://opensource.org/',
  }
  
  // Check for exact match
  if (sourceUrlMap[sourceName]) {
    return sourceUrlMap[sourceName]
  }
  
  // Check for partial matches (case-insensitive)
  const lowerSource = sourceName.toLowerCase()
  for (const [key, url] of Object.entries(sourceUrlMap)) {
    if (key.toLowerCase() === lowerSource) {
      return url
    }
  }
  
  // If no match, return null (not a clickable link)
  return null
}

/**
 * Format a date string to a human-readable format
 * Handles abbreviated year ranges from PDF (e.g., "2023-24", "2020-24")
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  
  // Handle formats like "2025-09-05", "2025-08", "2025 H1", "2023-2024", "2023-24", "2020-24"
  if (dateString.includes('H1') || dateString.includes('H2')) {
    return dateString
  }
  
  // Handle abbreviated year ranges (e.g., "2023-24", "2020-24" from PDF Table 4)
  // Keep them as-is to match the source document
  const abbreviatedRangePattern = /^(\d{4})[–-](\d{2})(?:\s|$|[^0-9])/
  if (abbreviatedRangePattern.test(dateString)) {
    return dateString // Return as-is to match PDF format
  }
  
  if (dateString.includes('–') || dateString.includes('-')) {
    const parts = dateString.split(/[–-]/)
    if (parts.length === 2) {
      const start = parts[0].trim()
      const end = parts[1].trim()
      // If both parts are 4-digit years, check if we should abbreviate
      if (/^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
        const startYear = parseInt(start)
        const endYear = parseInt(end)
        // Abbreviate short ranges (e.g., "2023-2024" → "2023-24") to match PDF style
        if (endYear - startYear <= 4 && endYear >= 2020) {
          const endYearShort = endYear.toString().slice(-2)
          return `${startYear}–${endYearShort}`
        }
        return `${start}–${end}`
      }
      // Otherwise, format each part separately
      const startFormatted = formatDate(start)
      const endFormatted = formatDate(end)
      return `${startFormatted}–${endFormatted}`
    }
  }
  
  // Try to parse as date
  const date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${month} ${year}`
  }
  
  // If it's just a year or year-month, return as is
  if (/^\d{4}$/.test(dateString)) {
    return dateString
  }
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    const [year, month] = dateString.split('-')
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' })
    return `${monthName} ${year}`
  }
  
  return dateString
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

/**
 * Extract year from date string for grouping
 */
export function extractYear(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  
  // Try to extract year from various formats
  const yearMatch = dateString.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    return yearMatch[1]
  }
  
  // Handle ranges like "2023-2024"
  if (dateString.includes('–') || dateString.includes('-')) {
    const parts = dateString.split(/[–-]/)
    if (parts.length === 2) {
      const startYear = parts[0].trim().match(/\b(20\d{2})\b/)
      if (startYear) {
        return startYear[1]
      }
    }
  }
  
  return 'Unknown'
}

/**
 * Get year period for timeline grouping
 * Groups deals into: 2020-2023, 2024, 2025, or Other
 * 
 * Handles:
 * - Full year ranges: "2021-2024", "2020-2023"
 * - Abbreviated year ranges: "2023-24", "2020-24" (from PDF Table 4)
 * - Single years: "2024", "2025"
 * - Year-month: "2024-05", "2025-01"
 * 
 * For date ranges, places in the period that best represents the range:
 * - Ranges ending in 2024 → 2024
 * - Ranges ending in 2025 → 2025
 * - Ranges entirely within 2020-2023 → 2020-2023
 * - Ranges spanning multiple periods → use the most recent period
 */
export function getYearPeriod(dateString: string | null): string {
  if (!dateString) return 'Other'
  
  // Handle abbreviated year ranges like "2023-24", "2020-24" (from PDF Table 4)
  // Pattern: 4-digit year, dash, 2-digit year (must be at start or after space, not part of year-month)
  const abbreviatedRangePattern = /^(\d{4})[–-](\d{2})(?:\s|$|[^0-9])/
  const abbreviatedMatch = dateString.match(abbreviatedRangePattern)
  
  if (abbreviatedMatch) {
    const startYear = parseInt(abbreviatedMatch[1])
    const endYearShort = parseInt(abbreviatedMatch[2])
    // Convert 2-digit year to 4-digit (assume 2000s)
    const endYear = endYearShort < 50 ? 2000 + endYearShort : 1900 + endYearShort
    
    // Validate these are reasonable years
    if (startYear >= 2000 && startYear <= 2099 && endYear >= 2000 && endYear <= 2099 && endYear >= startYear) {
      // For ranges, use the end year to determine period
      if (endYear >= 2025) {
        return '2025'
      }
      if (endYear === 2024) {
        return '2024'
      }
      // If range is entirely within 2020-2023, put it there
      if (startYear >= 2020 && endYear <= 2023) {
        return '2020-2023'
      }
      // If range starts before 2020 but ends in 2020-2023, put in 2020-2023
      if (endYear >= 2020 && endYear <= 2023) {
        return '2020-2023'
      }
    }
  }
  
  // Handle full year ranges (e.g., "2021-2024", "2020-2023")
  // Must be two 4-digit years separated by dash/en-dash, and NOT followed by more digits (to exclude year-month like "2024-05")
  const yearRangePattern = /^(\d{4})[–-](\d{4})(?:\s|$|[^0-9])/
  const yearRangeMatch = dateString.match(yearRangePattern)
  
  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1])
    const endYear = parseInt(yearRangeMatch[2])
    
    // Validate these are reasonable years (2000-2099)
    if (startYear >= 2000 && startYear <= 2099 && endYear >= 2000 && endYear <= 2099 && endYear >= startYear) {
      // For ranges, use the end year to determine period
      if (endYear >= 2025) {
        return '2025'
      }
      if (endYear === 2024) {
        return '2024'
      }
      // If range is entirely within 2020-2023, put it there
      if (startYear >= 2020 && endYear <= 2023) {
        return '2020-2023'
      }
      // If range starts before 2020 but ends in 2020-2023, put in 2020-2023
      if (endYear >= 2020 && endYear <= 2023) {
        return '2020-2023'
      }
    }
  }
  
  // Extract year from date string (handles formats like "2024-05-22", "2024-05", "2024", "2025 H1")
  // Use word boundary to avoid matching years in the middle of other numbers
  const yearMatch = dateString.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    const year = parseInt(yearMatch[1])
    if (year >= 2020 && year <= 2023) {
      return '2020-2023'
    }
    if (year === 2024) {
      return '2024'
    }
    if (year === 2025) {
      return '2025'
    }
  }
  
  return 'Other'
}

