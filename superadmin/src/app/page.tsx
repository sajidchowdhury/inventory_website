// PUBLIC ROOT SITE — inventoryos.xyz "/"
// Renders the controllable Bangla landing page from GET /api/landing/root.
// No auth. Editing the root project's Landing Page tab (in /SuperAdmin)
// updates this within the cache TTL. This is the deployment target for the
// "website" the user uploads to the VPS.
import { SiteView } from "@/components/superadmin/views/SiteView"

export default function Home() {
  return <SiteView />
}
