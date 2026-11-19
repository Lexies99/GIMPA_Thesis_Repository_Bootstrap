import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Download, Eye } from 'lucide-react'
import { apiDownloadPaperFile, apiGetPaper, apiTrackPaperView } from '../lib/api'
import type { ApiPaper } from '../lib/api'

export const meta = ({ params }: { params: { id?: string } }) => {
  const id = Number(params.id)
  const title = Number.isFinite(id)
    ? `Paper ${id} - GIMPA Thesis Repository`
    : 'Paper - GIMPA Thesis Repository'
  const description = 'Research paper details on GIMPA Thesis Repository'
  return [{ title }, { name: 'description', content: description }]
}

export default function PaperDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const paperId = Number(id)
  const [paper, setPaper] = useState<ApiPaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string>('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!Number.isFinite(paperId)) {
        setError('Invalid paper id')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const data = await apiGetPaper(paperId)
        if (cancelled) return
        setPaper(data)
        await apiTrackPaperView(paperId)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load paper')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [paperId])

  const isGuest = !isAuthenticated || user?.role === 'guest'

  const handleDownload = () => {
    if (!paper) return
    if (isGuest) {
      navigate('/login')
      return
    }
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken) {
      navigate('/login')
      return
    }
    void apiDownloadPaperFile(paper.id, accessToken)
      .then(({ blob, filename }) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setPaper((prev) => (prev ? { ...prev, downloads: prev.downloads + 1 } : prev))
        setToast(`Downloading: ${paper.title}`)
      })
      .catch((err) => {
        setToast(err instanceof Error ? err.message : 'Download failed')
      })
  }

  const handleRead = () => {
    if (!paper) return
    if (isGuest) {
      navigate('/login')
      return
    }
    setToast(`Opening reader for: ${paper.title}`)
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1d1a]">
      {/* FinPlanner Top Full-Width Soft Sage Header Bar */}
      <header className="h-[60px] w-full bg-[#d8e5c7] border-b border-[#c9d8b6] px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-[#1a1d1a] text-[#d8e5c7] flex items-center justify-center font-bold text-xs">
            G
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[#1a1d1a]">
            GIMPA Thesis Repository
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1a1d1a] hover:opacity-75 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to Catalog
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#5a6552] text-white rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-md">
            {toast}
          </div>
        )}

        {loading ? (
          <div className="fp-card py-12 text-center text-[#6e746b] text-[14px]">
            Loading paper details...
          </div>
        ) : !paper ? (
          <div className="fp-card space-y-4">
            <h2 className="text-[20px] font-bold text-[#1a1d1a]">Paper not found</h2>
            <p className="text-[14px] text-[#6e746b]">
              {error || "We couldn't find the paper you are looking for."}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go back to Catalog
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="fp-card space-y-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="default">{paper.year}</Badge>
                    <Badge variant="secondary">{paper.discipline}</Badge>
                    <Badge variant="outline">{paper.university}</Badge>
                  </div>
                  <h1 className="text-[24px] font-bold text-[#1a1d1a] leading-snug mb-1.5">
                    {paper.title}
                  </h1>
                  <p className="text-[14px] text-[#6e746b] m-0">
                    {paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-[12px] text-[#6e746b] py-3 border-y border-[#eaece4]">
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-3.5 text-[#5a6552]" /> {paper.views.toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Download className="size-3.5 text-[#5a6552]" />{' '}
                    {paper.downloads.toLocaleString()} downloads
                  </span>
                  <span>Citations: {paper.citations}</span>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-[#1a1d1a] mb-2">Abstract</h3>
                  <p className="text-[14px] text-[#1a1d1a] leading-relaxed whitespace-pre-wrap m-0">
                    {paper.abstract || 'No abstract available.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={handleRead} disabled={isGuest}>
                    Read Paper
                  </Button>
                  <Button variant="outline" onClick={handleDownload} disabled={isGuest}>
                    <Download className="size-4 mr-1.5" /> Download PDF
                  </Button>
                </div>

                {isGuest && (
                  <div className="p-3.5 bg-[#ffffff] border border-[#eaece4] rounded-lg text-[13px] text-[#6e746b] flex items-center justify-between">
                    <span>Sign in to read the full paper and download PDF copies.</span>
                    <Button size="sm" onClick={() => navigate('/login')}>
                      Log in
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Metadata Card */}
            <div className="space-y-6">
              <div className="fp-card space-y-4">
                <h3 className="text-[16px] font-bold text-[#1a1d1a]">Repository Metadata</h3>
                <div className="space-y-3 text-[13px]">
                  <div className="flex justify-between py-2 border-b border-[#eaece4]">
                    <span className="text-[#6e746b]">Discipline</span>
                    <span className="font-bold text-[#1a1d1a] text-right">{paper.discipline}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#eaece4]">
                    <span className="text-[#6e746b]">School</span>
                    <span className="font-bold text-[#1a1d1a] text-right">{paper.university}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#eaece4]">
                    <span className="text-[#6e746b]">Year</span>
                    <span className="font-bold text-[#1a1d1a]">{paper.year}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#6e746b]">Citations</span>
                    <span className="font-bold text-[#3b7a57]">{paper.citations}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
