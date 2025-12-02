import { redirect } from 'next/navigation'

export default function DealsPage() {
  // Redirect to home page since deals explorer is now the main view
  redirect('/')
}
