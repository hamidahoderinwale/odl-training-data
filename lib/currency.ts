/**
 * Currency conversion utilities
 * Server-side currency conversion using exchange rate API
 */

export interface CurrencyConversionResult {
  from: string
  to: string
  amount: number
  rate: number
  convertedAmount: number
  date: string
  timestamp: string
}

// Cache for exchange rates (in-memory, could be moved to Redis in production)
const rateCache = new Map<string, { rate: number; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface ExchangeRateResponse {
  success?: boolean
  rates?: Record<string, number>
  base?: string
  date?: string
  error?: string
}

async function getExchangeRateInternal(
  fromCurrency: string,
  toCurrency: string,
  date?: string
): Promise<number | null> {
  // If same currency, return 1
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1
  }

  // Check cache first
  const cacheKey = `${fromCurrency}-${toCurrency}-${date || 'latest'}`
  const cached = rateCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rate
  }

  try {
    // Use exchangerate-api.io (free tier supports historical rates)
    // Format: https://api.exchangerate-api.com/v4/historical/{base}/{date}
    // Format: https://api.exchangerate-api.com/v4/latest/{base}
    let url: string
    if (date) {
      // Historical rate - format date as YYYY-MM-DD
      url = `https://api.exchangerate-api.com/v4/historical/${fromCurrency.toUpperCase()}/${date}`
    } else {
      // Latest rate
      url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
    }

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Revalidate every hour
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      // Try alternative free API: exchangerate.host
      const altUrl = date
        ? `https://api.exchangerate.host/${date}?base=${fromCurrency.toUpperCase()}&symbols=${toCurrency.toUpperCase()}`
        : `https://api.exchangerate.host/latest?base=${fromCurrency.toUpperCase()}&symbols=${toCurrency.toUpperCase()}`
      
      const altResponse = await fetch(altUrl, {
        next: { revalidate: 3600 },
      })
      
      if (altResponse.ok) {
        const altData: any = await altResponse.json()
        const rate = altData.rates?.[toCurrency.toUpperCase()]
        if (rate) {
          rateCache.set(cacheKey, { rate, timestamp: Date.now() })
          return rate
        }
      }
      
      console.error(`Currency API error: ${response.statusText}`)
      return null
    }

    const data: ExchangeRateResponse = await response.json()
    const rate = data.rates?.[toCurrency.toUpperCase()]

    if (rate) {
      rateCache.set(cacheKey, { rate, timestamp: Date.now() })
      return rate
    }

    return null
  } catch (error) {
    console.error('Error fetching exchange rate:', error)
    return null
  }
}

/**
 * Convert an amount from one currency to another (server-side)
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency (ISO 4217 code, e.g., 'USD', 'EUR')
 * @param toCurrency - Target currency (default: 'USD')
 * @param date - Optional date for historical rates (YYYY-MM-DD format)
 * @returns Converted amount or null if conversion fails
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string = 'USD',
  date?: string
): Promise<number | null> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount
  }

  const rate = await getExchangeRateInternal(fromCurrency, toCurrency, date)
  if (rate === null) {
    return null
  }

  return amount * rate
}

/**
 * Extract date from deal date string for currency conversion
 * @param dateString - Deal date string (various formats)
 * @returns Date string in YYYY-MM-DD format or null
 */
export function extractDateForConversion(dateString: string | null): string | null {
  if (!dateString) return null

  // Try to extract YYYY-MM-DD format
  const dateMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    return dateMatch[0]
  }

  // Try to extract YYYY-MM format and use first day of month
  const yearMonthMatch = dateString.match(/(\d{4})-(\d{2})/)
  if (yearMonthMatch) {
    return `${yearMonthMatch[0]}-01`
  }

  // Try to extract year and use mid-year
  const yearMatch = dateString.match(/(\d{4})/)
  if (yearMatch) {
    return `${yearMatch[0]}-06-15` // Mid-year as fallback
  }

  return null
}

/**
 * Get exchange rate between two currencies (server-side)
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param date - Optional date for historical rates
 * @returns Exchange rate or null
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string = 'USD',
  date?: string
): Promise<number | null> {
  return getExchangeRateInternal(fromCurrency, toCurrency, date)
}

