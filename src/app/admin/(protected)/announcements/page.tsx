import { Suspense } from 'react'
import AnnouncementsClient from './AnnouncementsClient'

export default function AnnouncementsPage() {
  return (
    <Suspense>
      <AnnouncementsClient />
    </Suspense>
  )
}
