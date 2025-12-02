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
 * 
 * More systematic approach:
 * 1. Handle special formats first (H1, H2)
 * 2. Handle year ranges (full and abbreviated)
 * 3. Handle ISO date formats (YYYY-MM-DD, YYYY-MM)
 * 4. Handle single years
 * 5. Fallback to parsing as Date object
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  
  const trimmed = dateString.trim()
  
  // 1. Handle special formats like "2025 H1", "2025 H2"
  if (trimmed.includes('H1') || trimmed.includes('H2')) {
    return trimmed
  }
  
  // 2. Handle abbreviated year ranges (e.g., "2023-24", "2020-24")
  // Pattern: 4-digit year, dash/en-dash, 2-digit year (not followed by more digits)
  const abbreviatedRangePattern = /^(\d{4})[–-](\d{2})(?:\s|$|[^0-9])/
  const abbreviatedMatch = trimmed.match(abbreviatedRangePattern)
  if (abbreviatedMatch) {
    const startYear = parseInt(abbreviatedMatch[1])
    const endYearShort = parseInt(abbreviatedMatch[2])
    // Convert 2-digit year to 4-digit (assume 2000s for years 00-99)
    const endYear = endYearShort < 50 ? 2000 + endYearShort : 1900 + endYearShort
    if (startYear >= 2000 && endYear >= 2000 && endYear >= startYear) {
      return `${startYear}–${endYearShort}`
    }
  }
  
  // 3. Handle full year ranges (e.g., "2023-2024", "2020-2023")
  // Must be two 4-digit years separated by dash/en-dash, not followed by more digits
  const yearRangePattern = /^(\d{4})[–-](\d{4})(?:\s|$|[^0-9])/
  const yearRangeMatch = trimmed.match(yearRangePattern)
  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1])
    const endYear = parseInt(yearRangeMatch[2])
    if (startYear >= 2000 && endYear >= 2000 && endYear >= startYear) {
      // Abbreviate short ranges (e.g., "2023-2024" → "2023-24")
      if (endYear - startYear <= 4 && endYear >= 2020) {
        const endYearShort = endYear.toString().slice(-2)
        return `${startYear}–${endYearShort}`
      }
      return `${startYear}–${endYear}`
    }
  }
  
  // 4. Handle ISO date formats: YYYY-MM-DD
  const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
  const isoDateMatch = trimmed.match(isoDatePattern)
  if (isoDateMatch) {
    const year = parseInt(isoDateMatch[1])
    const month = parseInt(isoDateMatch[2])
    const day = parseInt(isoDateMatch[3])
    if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      return `${monthName} ${year}`
    }
  }
  
  // 5. Handle year-month format: YYYY-MM (must be exactly this format, not part of a range)
  const yearMonthPattern = /^(\d{4})-(\d{2})$/
  const yearMonthMatch = trimmed.match(yearMonthPattern)
  if (yearMonthMatch) {
    const year = parseInt(yearMonthMatch[1])
    const month = parseInt(yearMonthMatch[2])
    if (year >= 2000 && month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      return `${monthName} ${year}`
    }
  }
  
  // 6. Handle single year: YYYY
  const singleYearPattern = /^(\d{4})$/
  const singleYearMatch = trimmed.match(singleYearPattern)
  if (singleYearMatch) {
    const year = parseInt(singleYearMatch[1])
    if (year >= 2000 && year <= 2099) {
      return year.toString()
    }
  }
  
  // 7. Handle date ranges with formatted dates (e.g., "Dec 2024–Aug 2025")
  // Split on dash/en-dash and format each part
  if (trimmed.includes('–') || trimmed.includes('-')) {
    const parts = trimmed.split(/[–-]/).map(p => p.trim())
    if (parts.length === 2) {
      const startFormatted = formatDate(parts[0])
      const endFormatted = formatDate(parts[1])
      // Only combine if both parts formatted successfully
      if (startFormatted !== parts[0] || endFormatted !== parts[1]) {
        return `${startFormatted}–${endFormatted}`
      }
    }
  }
  
  // 8. Fallback: Try to parse as Date object (for other formats)
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear()
    // Only use this if it's a reasonable year (2000-2099)
    if (year >= 2000 && year <= 2099) {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      return `${month} ${year}`
    }
  }
  
  // 9. Final fallback: return as-is
  return trimmed
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

