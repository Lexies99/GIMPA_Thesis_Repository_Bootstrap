import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { apiGetPaperStats } from '../../lib/api'
import type { ApiPaperStats } from '../../lib/api'

export function LibraryStats() {
  const [stats, setStats] = useState<ApiPaperStats>({ total_papers: 0, total_views: 0, total_downloads: 0, pending_reviews: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const next = await apiGetPaperStats()
        if (!cancelled) setStats(next)
      } catch {
        if (!cancelled) setStats({ total_papers: 0, total_views: 0, total_downloads: 0, pending_reviews: 0 })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Live library statistics from database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Total Documents</h3>
              <p className="text-2xl font-bold text-primary">{stats.total_papers}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Total Downloads</h3>
              <p className="text-2xl font-bold text-primary">{stats.total_downloads.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Pending Reviews</h3>
              <p className="text-2xl font-bold text-primary">{stats.pending_reviews}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Total Views</h3>
              <p className="text-2xl font-bold text-primary">{stats.total_views.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
