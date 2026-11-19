import { useEffect, useState } from 'react'
import { apiGetPaperStats } from '../../lib/api'
import type { ApiPaperStats } from '../../lib/api'
import { BookOpen, Download, Clock, Eye, ArrowUpRight } from 'lucide-react'

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
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
          Library Statistics
        </h1>
        <p className="text-[14px] text-[#6e766b] mt-1">
          Live institutional repository metrics and publication reach
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="fp-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-medium text-[#1a1d1a]">Total Documents</span>
            <BookOpen className="size-4 text-[#5a6552]" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[28px] font-bold text-[#1a1d1a]">{stats.total_papers}</span>
            <ArrowUpRight className="size-5 text-[#3b7a57]" />
          </div>
          <p className="text-[12px] text-[#8c9489]">in institutional catalog</p>
        </div>

        <div className="fp-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-medium text-[#1a1d1a]">Total Downloads</span>
            <Download className="size-4 text-[#5a6552]" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[28px] font-bold text-[#1a1d1a]">{stats.total_downloads.toLocaleString()}</span>
            <ArrowUpRight className="size-5 text-[#3b7a57]" />
          </div>
          <p className="text-[12px] text-[#8c9489]">full-text PDF downloads</p>
        </div>

        <div className="fp-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-medium text-[#1a1d1a]">Pending Reviews</span>
            <Clock className="size-4 text-[#5a6552]" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[28px] font-bold text-[#1a1d1a]">{stats.pending_reviews}</span>
          </div>
          <p className="text-[12px] text-[#8c9489]">awaiting clearance</p>
        </div>

        <div className="fp-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-medium text-[#1a1d1a]">Total Views</span>
            <Eye className="size-4 text-[#5a6552]" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[28px] font-bold text-[#1a1d1a]">{stats.total_views.toLocaleString()}</span>
            <ArrowUpRight className="size-5 text-[#3b7a57]" />
          </div>
          <p className="text-[12px] text-[#8c9489]">scholarly impressions</p>
        </div>
      </div>
    </div>
  )
}
