/**
 * Date validation and normalization utilities
 * Based on formats from: Open_Problems_in_AI_Data_Economics-33.pdf (Table 4)
 * 
 * Supported formats from the research paper:
 * - Full dates: "2024-05-22", "2025-09-05"
 * - Year-month: "2024-05", "2025-08", "2024-11"
 * - Year only: "2023", "2024", "2025"
 * - Full year ranges: "2021-2024", "2020-2023", "2022-2025"
 * - Abbreviated year ranges: "2023-24", "2020-24" (from PDF Table 4)
 * - Half-year: "2025 H1", "2025 H2"
 */

export type DateFormat = 
  | 'YYYY-MM-DD'      // Full date
  | 'YYYY-MM'         // Year-month
  | 'YYYY'            // Year only
  | 'YYYY-YYYY'       // Full year range
  | 'YYYY-YY'         // Abbreviated year range
  | 'YYYY H1'         // Half-year (first half)
  | 'YYYY H2'         // Half-year (second half)
  | 'invalid'         // Invalid format

export interface DateValidationResult {
  isValid: boolean
  normalized: string | null
  format: DateFormat
  error?: string
}

/**
 * Validate and normalize a date string according to research paper formats
 */
export function validateAndNormalizeDate(dateString: string | null | undefined): DateValidationResult {
  if (!dateString || typeof dateString !== 'string') {
    return {
      isValid: false,
      normalized: null,
      format: 'invalid',
      error: 'Date string is required'
    }
  }

  const trimmed = dateString.trim()

  // 1. Half-year format: "2025 H1", "2025 H2"
  const halfYearPattern = /^(\d{4})\s+(H[12])$/i
  const halfYearMatch = trimmed.match(halfYearPattern)
  if (halfYearMatch) {
    const year = parseInt(halfYearMatch[1])
    const half = halfYearMatch[2].toUpperCase()
    if (year >= 2000 && year <= 2099) {
      return {
        isValid: true,
        normalized: `${year} ${half}`,
        format: half === 'H1' ? 'YYYY H1' : 'YYYY H2'
      }
    }
  }

  // 2. Abbreviated year range: "2023-24", "2020-24"
  const abbreviatedRangePattern = /^(\d{4})[–-](\d{2})(?:\s|$|[^0-9])/
  const abbreviatedMatch = trimmed.match(abbreviatedRangePattern)
  if (abbreviatedMatch) {
    const startYear = parseInt(abbreviatedMatch[1])
    const endYearShort = parseInt(abbreviatedMatch[2])
    // Convert 2-digit year to 4-digit (assume 2000s for years 00-99)
    const endYear = endYearShort < 50 ? 2000 + endYearShort : 1900 + endYearShort
    
    if (startYear >= 2000 && startYear <= 2099 && 
        endYear >= 2000 && endYear <= 2099 && 
        endYear >= startYear) {
      return {
        isValid: true,
        normalized: `${startYear}-${endYearShort.toString().padStart(2, '0')}`,
        format: 'YYYY-YY'
      }
    }
  }

  // 3. Full year range: "2021-2024", "2020-2023"
  const yearRangePattern = /^(\d{4})[–-](\d{4})(?:\s|$|[^0-9])/
  const yearRangeMatch = trimmed.match(yearRangePattern)
  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1])
    const endYear = parseInt(yearRangeMatch[2])
    
    if (startYear >= 2000 && startYear <= 2099 && 
        endYear >= 2000 && endYear <= 2099 && 
        endYear >= startYear) {
      return {
        isValid: true,
        normalized: `${startYear}-${endYear}`,
        format: 'YYYY-YYYY'
      }
    }
  }

  // 4. ISO date format: "2024-05-22", "2025-09-05"
  const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
  const isoDateMatch = trimmed.match(isoDatePattern)
  if (isoDateMatch) {
    const year = parseInt(isoDateMatch[1])
    const month = parseInt(isoDateMatch[2])
    const day = parseInt(isoDateMatch[3])
    
    if (year >= 2000 && year <= 2099 && 
        month >= 1 && month <= 12 && 
        day >= 1 && day <= 31) {
      // Validate actual date
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day) {
        return {
          isValid: true,
          normalized: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
          format: 'YYYY-MM-DD'
        }
      }
    }
  }

  // 5. Year-month format: "2024-05", "2025-08"
  const yearMonthPattern = /^(\d{4})-(\d{2})$/
  const yearMonthMatch = trimmed.match(yearMonthPattern)
  if (yearMonthMatch) {
    const year = parseInt(yearMonthMatch[1])
    const month = parseInt(yearMonthMatch[2])
    
    if (year >= 2000 && year <= 2099 && month >= 1 && month <= 12) {
      return {
        isValid: true,
        normalized: `${year}-${month.toString().padStart(2, '0')}`,
        format: 'YYYY-MM'
      }
    }
  }

  // 6. Single year: "2023", "2024", "2025"
  const singleYearPattern = /^(\d{4})$/
  const singleYearMatch = trimmed.match(singleYearPattern)
  if (singleYearMatch) {
    const year = parseInt(singleYearMatch[1])
    if (year >= 2000 && year <= 2099) {
      return {
        isValid: true,
        normalized: year.toString(),
        format: 'YYYY'
      }
    }
  }

  // Invalid format
  return {
    isValid: false,
    normalized: null,
    format: 'invalid',
    error: `Invalid date format: "${trimmed}". Expected formats: YYYY-MM-DD, YYYY-MM, YYYY, YYYY-YYYY, YYYY-YY, or YYYY H1/H2`
  }
}

/**
 * Validate a date string (returns boolean)
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  return validateAndNormalizeDate(dateString).isValid
}

/**
 * Normalize a date string to standard format
 */
export function normalizeDate(dateString: string | null | undefined): string | null {
  const result = validateAndNormalizeDate(dateString)
  return result.normalized
}


