import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Bookmark, BookOpen, Download, Eye, Grid3x3, List, LogIn, Search, Star, TrendingUp } from 'lucide-react'
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

  const FACULTIES = [
    { id: 'all', label: 'All Faculties' },
    { id: 'gbs', label: 'GIMPA Business School (GBS)', shortLabel: 'GBS' },
    { id: 'spsg', label: 'Public Service & Governance', shortLabel: 'SPSG' },
    { id: 'law', label: 'Faculty of Law', shortLabel: 'Law' },
    { id: 'sotss', label: 'Technology & Social Sciences', shortLabel: 'SOTSS' },
  ]

  const [activeFaculty, setActiveFaculty] = useState('all')

  const filteredPapers = useMemo(() => {
    if (activeFaculty === 'all') return papers
    const facultyMap: Record<string, string[]> = {
      gbs: ['business', 'management', 'finance', 'accounting', 'marketing', 'gbs'],
      spsg: ['public', 'governance', 'administration', 'policy', 'spsg'],
      law: ['law', 'legal', 'jurisprudence'],
      sotss: ['technology', 'social', 'science', 'computing', 'it', 'sotss'],
    }
    const keywords = facultyMap[activeFaculty] || []
    return papers.filter((p) => {
      const disc = (p.discipline || '').toLowerCase()
      return keywords.some((kw) => disc.includes(kw))
    })
  }, [papers, activeFaculty])

  return (
    <div className="space-y-6">
      {/* ── HERO BANNER ─────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2A528A 0%, #5D6EC7 50%, #9F71DB 100%)',
          borderRadius: '16px',
          padding: '36px 32px 32px',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-50px', right: '200px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'rgba(233,212,152,0.2)',
              borderRadius: '999px',
              border: '1px solid rgba(233,212,152,0.3)',
              marginBottom: '16px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: '#E9D498',
            }}
          >
            🎓 Ghana Institute of Management and Public Administration (GIMPA)
          </div>

          <h1 style={{ fontWeight: 800, fontSize: '28px', lineHeight: 1.25, margin: '0 0 10px', color: '#fff' }}>
            Institutional Thesis & Research Repository
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '14px', lineHeight: 1.65, margin: '0 0 20px', maxWidth: '700px' }}>
            Explore peer-reviewed doctoral dissertations, postgraduate theses, and scholarly research publications across all GIMPA academic faculties and departments.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
            {[
              { icon: '🎓', label: '4 Academic Faculties' },
              { icon: '📄', label: 'PhD & Masters Theses' },
              { icon: '🏛️', label: 'Open Academic Access' },
            ].map((badge) => (
              <div
                key={badge.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SEARCH + VIEW TOGGLE ───────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: 10, padding: '0 14px',
          boxShadow: '0 1px 4px rgba(42,82,138,0.06)',
        }}>
          <Search style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by title, author, keyword, discipline, or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, width: '100%', border: 'none', outline: 'none',
              background: 'transparent', fontSize: 14, color: '#1e293b',
              padding: '12px 0', fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 rounded-md transition-colors"
            style={viewMode === 'grid'
              ? { backgroundColor: '#5D6EC7', color: '#fff' }
              : { backgroundColor: 'transparent', color: '#94a3b8' }}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-2 rounded-md transition-colors"
            style={viewMode === 'list'
              ? { backgroundColor: '#5D6EC7', color: '#fff' }
              : { backgroundColor: 'transparent', color: '#94a3b8' }}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── FACULTY FILTER CHIPS ───────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
          Faculty:
        </span>
        {FACULTIES.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFaculty(f.id)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeFaculty === f.id ? 700 : 500,
              color: activeFaculty === f.id ? '#2A528A' : '#64748b',
              background: activeFaculty === f.id ? '#fff' : 'transparent',
              border: activeFaculty === f.id ? '1.5px solid #5D6EC7' : '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeFaculty === f.id ? '0 1px 4px rgba(93,110,199,0.15)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── TABS + PUBLICATION COUNT ───────────────────── */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} defaultValue="all">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px' }}>
          <TabsList className="flex overflow-x-auto justify-start gap-1 p-1 h-auto min-h-[42px] scrollbar-none" style={{ background: 'transparent', border: 'none' }}>
            {categories.map((cat) => {
              const count = cat.id === 'all' ? categoryCounts.all
                : cat.id === 'trending' ? categoryCounts.trending
                : cat.id === 'highest-rated' ? categoryCounts.highest
                : categoryCounts.downloads
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="shrink-0 py-2 px-3 text-xs sm:text-sm whitespace-nowrap" style={{
                  border: activeCategory === cat.id ? '1.5px solid #5D6EC7' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: activeCategory === cat.id ? '#fff' : 'transparent',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cat.icon && <TrendingUp style={{ width: 14, height: 14 }} />}
                    {cat.label}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: '20px', height: '20px', padding: '0 6px',
                      borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                      background: activeCategory === cat.id ? 'rgba(93,110,199,0.12)' : '#f1f5f9',
                      color: activeCategory === cat.id ? '#2A528A' : '#94a3b8',
                    }}>
                      {count}
                    </span>
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
            Showing {filteredPapers.length} publication{filteredPapers.length !== 1 ? 's' : ''}
          </span>
        </div>

        <TabsContent value={activeCategory} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Loading papers...</CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-center text-destructive">{error}</CardContent>
            </Card>
          ) : filteredPapers.length === 0 ? (
            /* ── ENHANCED EMPTY STATE ─────────────────── */
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(42,82,138,0.08), rgba(93,110,199,0.12))',
                marginBottom: '16px',
              }}>
                <BookOpen style={{ width: 28, height: 28, color: '#5D6EC7' }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b', margin: '0 0 8px' }}>
                Welcome to the GIMPA Research Catalog
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px' }}>
                The GIMPA Thesis Repository hosts approved academic works, doctoral dissertations, and research monographs across our academic faculties.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
                {!isAuthenticated && (
                  <Button
                    className="btn-ta-primary"
                    onClick={() => navigate('/login')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <LogIn style={{ width: 14, height: 14 }} /> Sign In to Submit Theses & Proposals
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveCategory('all')
                    setActiveFaculty('all')
                  }}
                >
                  Refresh Catalog
                </Button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPapers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPapers.map((paper, idx) => (
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

      {/* ── BROWSE BY ACADEMIC FACULTY PORTALS ──────── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '28px' }}>
        <h3 style={{
          textAlign: 'center', fontSize: '12px', fontWeight: 700,
          color: '#2A528A', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          margin: '0 0 20px',
        }}>
          Browse by Academic Faculty Portals
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { code: 'GBS', name: 'GIMPA Business School (GBS)', faculty: 'gbs' },
            { code: 'SPSG', name: 'Public Service & Governance', faculty: 'spsg' },
            { code: 'Law', name: 'Faculty of Law', faculty: 'law' },
            { code: 'SOTSS', name: 'Technology & Social Sciences', faculty: 'sotss' },
          ].map((portal) => (
            <button
              key={portal.code}
              onClick={() => {
                setActiveFaculty(portal.faculty)
                setActiveCategory('all')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '16px 20px', background: '#fff',
                border: activeFaculty === portal.faculty ? '1.5px solid #5D6EC7' : '1px solid #e2e8f0',
                borderRadius: '12px', cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left' as const,
                boxShadow: activeFaculty === portal.faculty ? '0 2px 8px rgba(93,110,199,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(42,82,138,0.08), rgba(93,110,199,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '16px' }}>🏛️</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{portal.code}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>{portal.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

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

