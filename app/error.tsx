'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

