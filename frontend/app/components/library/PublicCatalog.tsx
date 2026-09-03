import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Bookmark, Download, Eye, Grid3x3, List, Search, Star, TrendingUp } from 'lucide-react'
import { apiDownloadPaperFile, apiListPapers, apiTrackPaperView } from '../../lib/api'
import { convertTextOrTopicToPdf } from '../../lib/pdfGenerator'
import type { ApiPaper } from '../../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'

const formatViewCount = (value: number): string => {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(1)}K`
}

const categories = [
  { id: 'all', label: 'All Papers' },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'highest-rated', label: 'Highest Rated' },
  { id: 'most-downloaded', label: 'Most Downloaded' },
]

const sortByCategory: Record<string, string> = {
  all: 'relevance',
  trending: 'trending',
  'highest-rated': 'highest-rated',
  'most-downloaded': 'downloads',
}

export function PublicCatalog() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [papers, setPapers] = useState<ApiPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPaper, setSelectedPaper] = useState<ApiPaper | null>(null)
  const [abstractOpen, setAbstractOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const results = await apiListPapers({
          q: searchQuery || undefined,
          sort: sortByCategory[activeCategory] || 'relevance',
          catalog: true,
          limit: 200,
        })
        if (!cancelled) setPapers(results)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load papers')
          setPapers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [searchQuery, activeCategory])

  const handleDownload = async (paperId: number) => {
    if (!isAuthenticated || user?.role === 'guest') {
      navigate('/login')
      return
    }
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      navigate('/login')
      return
    }
    try {
      const { blob: rawBlob, filename: rawFilename } = await apiDownloadPaperFile(paperId, token)
      const currentPaper = papers.find((p) => p.id === paperId)
      const { blob, filename } = await convertTextOrTopicToPdf(rawBlob, rawFilename, {
        title: currentPaper?.title,
        abstract: currentPaper?.abstract,
        author: currentPaper?.authors?.map((a) => a.name).join(', ') || 'Student',
        department: currentPaper?.discipline,
        discipline: currentPaper?.discipline,
        id: currentPaper?.id,
        created_at: currentPaper?.created_at,
        document_type: currentPaper?.document_type,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, downloads: p.downloads + 1 } : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
    }
  }

  const toggleBookmark = (id: number) => {
    const next = new Set(bookmarked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setBookmarked(next)
  }

  const openAbstract = (paper: ApiPaper) => {
    void apiTrackPaperView(paper.id)
      .then((updated) => {
        setPapers((prev) => prev.map((p) => (p.id === updated.id ? { ...p, views: updated.views } : p)))
      })
      .catch(() => {
        // Keep UI responsive even if analytics tracking fails.
      })
    setSelectedPaper(paper)
    setAbstractOpen(true)
  }

  const categoryCounts = useMemo(() => {
    const all = papers.length
    const trending = papers.filter((p) => p.views > 2500).length
    const highest = Math.min(4, papers.length)
    const downloads = Math.min(5, papers.length)
    return { all, trending, highest, downloads }
  }, [papers])

  const PaperCard = ({ paper }: { paper: ApiPaper }) => (
    <Card className="ta-card transition-all hover:scale-[1.01] cursor-pointer" onClick={() => openAbstract(paper)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-bold line-clamp-2 hover:text-purple-400 transition-colors m-0">{paper.title}</CardTitle>
            <CardDescription className="text-xs mt-1 font-medium">{paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-amber-400 shrink-0 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span className="text-xs font-bold font-mono">{(paper.rating ?? 0).toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs line-clamp-3 leading-relaxed opacity-90">{paper.abstract || 'No abstract available.'}</p>

        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border" style={{color:'#a78bfa',backgroundColor:'rgba(139,92,246,0.1)',borderColor:'rgba(139,92,246,0.2)'}}>{paper.year}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border" style={{color:'var(--text-sub)',backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>{paper.discipline || 'General'}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border" style={{color:'var(--text-muted)',backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>{paper.university || 'Unknown'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs border-t pt-3" style={{borderColor:'var(--border-color)'}}>
          <button
            className="flex items-center gap-1 hover:text-purple-400 transition-colors text-left"
            style={{color:'var(--text-muted)',background:'none',border:'none',padding:0,cursor:'pointer'}}
            onClick={(e) => { e.stopPropagation(); openAbstract(paper) }}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span>{formatViewCount(paper.views)}</span>
          </button>
          <div className="flex items-center gap-1" style={{color:'var(--text-muted)'}}>
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>{paper.downloads}</span>
          </div>
          <div style={{color:'var(--text-muted)'}}>
            Cite: {paper.citations}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="btn-ta-purple flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              void handleDownload(paper.id)
            }}
            disabled={!isAuthenticated || user?.role === 'guest'}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
          <Button
            size="sm"
            className={`px-3 text-xs ${bookmarked.has(paper.id) ? 'btn-ta-purple' : 'btn-ta-glass'}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleBookmark(paper.id)
            }}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Public Catalog</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse and discover research papers</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-0.5" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 rounded-md transition-colors"
            style={viewMode === 'grid'
              ? {backgroundColor:'#8b5cf6',color:'#fff'}
              : {backgroundColor:'transparent',color:'var(--text-muted)'}}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-2 rounded-md transition-colors"
            style={viewMode === 'list'
              ? {backgroundColor:'#8b5cf6',color:'#fff'}
              : {backgroundColor:'transparent',color:'var(--text-muted)'}}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="content-search-bar" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
        <Search className="content-search-icon" style={{color:'var(--text-muted)'}} />
        <input
          type="text"
          placeholder="Search papers, authors, disciplines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="content-search-input"
          style={{background:'transparent',border:'none',outline:'none',color:'var(--text-main)'}}
        />
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              <span className="text-xs sm:text-sm">
                {cat.label}
                {cat.id === 'all' && ` (${categoryCounts.all})`}
                {cat.id === 'trending' && ` (${categoryCounts.trending})`}
                {cat.id === 'highest-rated' && ` (${categoryCounts.highest})`}
                {cat.id === 'most-downloaded' && ` (${categoryCounts.downloads})`}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Loading papers...</CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-center text-destructive">{error}</CardContent>
            </Card>
          ) : papers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No papers found matching your criteria</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {papers.map((paper, idx) => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openAbstract(paper)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                          <h3 className="font-semibold hover:text-primary">{paper.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}</p>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{paper.abstract || 'No abstract available.'}</p>
                        <div className="flex gap-2 items-center flex-wrap">
                          <Badge variant="outline" className="text-xs">{paper.year}</Badge>
                          <Badge variant="outline" className="text-xs">{paper.discipline || 'General'}</Badge>
                          <Badge variant="secondary" className="text-xs">{paper.university || 'Unknown'}</Badge>
                          <div className="flex items-center gap-1 text-yellow-500 ml-auto">
                            <Star className="h-3 w-3 fill-yellow-500" />
                            <span className="text-xs font-semibold">{(paper.rating ?? 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <div className="text-right text-xs text-muted-foreground space-y-1 hidden sm:block">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0 justify-end text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              openAbstract(paper)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {paper.views}
                          </Button>
                          <div className="flex items-center gap-1 justify-end">
                            <Download className="h-3 w-3" />
                            {paper.downloads}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDownload(paper.id)
                          }}
                          disabled={!isAuthenticated || user?.role === 'guest'}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={bookmarked.has(paper.id) ? 'default' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBookmark(paper.id)
                          }}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={abstractOpen} onOpenChange={setAbstractOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title || 'Paper Abstract'}</DialogTitle>
            <DialogDescription>
              {selectedPaper?.authors.map((a) => a.name).join(', ') || 'Unknown Author'} • {selectedPaper?.discipline || 'General'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{selectedPaper?.year || '-'}</Badge>
              <Badge variant="outline">{selectedPaper?.document_type || 'Research Paper'}</Badge>
              <Badge variant="secondary">{selectedPaper?.university || 'Unknown'}</Badge>
            </div>
            <div className="rounded-md border p-3 text-sm leading-6 text-muted-foreground max-h-[50vh] overflow-auto">
              {selectedPaper?.abstract || 'No abstract available.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

