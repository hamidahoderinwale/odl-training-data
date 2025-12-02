import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRate } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from') || 'USD'
  const to = searchParams.get('to') || 'USD'
  const amount = parseFloat(searchParams.get('amount') || '1')
  const date = searchParams.get('date') || undefined

  // Validate currencies (ISO 4217 codes)
  const validCurrencyRegex = /^[A-Z]{3}$/
  if (!validCurrencyRegex.test(from.toUpperCase()) || !validCurrencyRegex.test(to.toUpperCase())) {
    return NextResponse.json(
      { error: 'Invalid currency code. Use ISO 4217 format (e.g., USD, EUR, GBP)' },
      { status: 400 }
    )
  }

  // Validate date format if provided (YYYY-MM-DD)
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    )
  }

  try {
    const rate = await getExchangeRate(from, to, date)

    if (rate === null) {
      return NextResponse.json(
        { error: 'Unable to fetch exchange rate. Please try again later.' },
        { status: 503 }
      )
    }

    const convertedAmount = amount * rate

    return NextResponse.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      rate,
      convertedAmount,
      date: date || 'latest',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Currency conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error during currency conversion' },
      { status: 500 }
    )
  }
}

