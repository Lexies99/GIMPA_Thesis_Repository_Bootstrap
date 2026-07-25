import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../context/AuthContext'
import { Download, Eye } from 'lucide-react'
import { apiDownloadPaperFile, apiGetPaper, apiTrackPaperView } from '../lib/api'
import type { ApiPaper } from '../lib/api'

export const meta = ({ params }: { params: { id?: string } }) => {
  const id = Number(params.id)
  const title = Number.isFinite(id) ? `Paper ${id} - GIMPA Thesis Repository` : 'Paper - GIMPA Thesis Repository'
  const description = 'Research paper details on GIMPA Thesis Repository'
  return [
    { title },
    { name: 'description', content: description },
  ]
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

  if (loading) {
    return (
      <main className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">Loading paper...</CardContent>
        </Card>
      </main>
    )
  }

  if (!paper) {
    return (
      <main className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Paper not found</CardTitle>
            <CardDescription>{error || "We couldn't find the paper you are looking for."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline">Go back to Catalog</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const isGuest = !isAuthenticated || user?.role === 'guest'

  const handleDownload = () => {
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
    if (isGuest) {
      navigate('/login')
      return
    }
    // In a real app, open a reader or PDF viewer
    setToast(`Opening reader for: ${paper.title}`)
  }

  return (
    <main className="container mx-auto p-4">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border shadow-lg rounded px-4 py-2 text-sm">
          {toast}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{paper.title}</CardTitle>
              <CardDescription className="text-sm">{paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{paper.year}</Badge>
                <Badge variant="outline" className="text-xs">{paper.discipline}</Badge>
                <Badge variant="secondary" className="text-xs">{paper.university}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {paper.views.toLocaleString()} views</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {paper.downloads.toLocaleString()} downloads</span>
                <span>Citations: {paper.citations}</span>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Abstract</h3>
                <p className="text-sm text-muted-foreground">{paper.abstract || 'No abstract available.'}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRead} disabled={isGuest}>Read Paper</Button>
                <Button variant="outline" onClick={handleDownload} disabled={isGuest}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
              {isGuest && (
                <div className="p-3 bg-muted rounded text-sm">
                  Sign in to read the full paper and download. <Button variant="ghost" className="px-1 h-auto" onClick={() => navigate('/login')}>Login</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {!isGuest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reader (Demo)</CardTitle>
                <CardDescription>Simulated reader area for demonstration purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-muted rounded flex items-center justify-center text-muted-foreground">
                  Full paper content would be displayed here.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About this paper</CardTitle>
              <CardDescription>Metadata and quick actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Discipline: </span>{paper.discipline}</div>
              <div><span className="text-muted-foreground">University: </span>{paper.university}</div>
              <div><span className="text-muted-foreground">Year: </span>{paper.year}</div>
              <div><span className="text-muted-foreground">Citations: </span>{paper.citations}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
