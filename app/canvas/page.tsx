// Prevent server-side rendering of the canvas page
export const dynamic = "force-dynamic"

// Use dynamic import with SSR disabled for the canvas component
const CanvasPageClient = dynamic(() => import("@/components/canvas-page-client"), { ssr: false })

export default function CanvasPage() {
  return <CanvasPageClient />
}
