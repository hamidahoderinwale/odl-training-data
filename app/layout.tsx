import type { Metadata } from 'next'
import { Roboto_Mono } from 'next/font/google'
import Sidebar from './components/Sidebar'
import './globals.css'

const robotoMono = Roboto_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Training Data Deals Dashboard',
  description: 'Global licensing, acquisition, and commissioning deals for AI training data (2020–2025)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={robotoMono.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
        <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
      </body>
    </html>
  )
}

