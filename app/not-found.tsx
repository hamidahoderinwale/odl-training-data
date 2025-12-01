import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">404 - Page Not Found</h2>
        <p className="text-text-muted mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/" className="btn-primary">
          Return Home
        </Link>
      </div>
    </div>
  )
}

