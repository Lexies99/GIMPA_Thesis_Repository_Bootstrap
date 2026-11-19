import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Bookmark, BookOpen, Download, Eye, Grid3x3, List, LogIn, Search, Star, Building2 } from 'lucide-react'
import { apiDownloadPaperFile, apiListPapers, apiTrackPaperView } from '../../lib/api'
import { convertTextOrTopicToPdf } from '../../lib/pdfGenerator'
import type { ApiPaper } from '../../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'

const formatViewCount = (value: number): string => {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(1)}K`
}

const categories = [
  { id: 'all', label: 'All time' },
  { id: 'trending', label: 'Trending' },
  { id: 'highest-rated', label: 'Highest rated' },
  { id: 'most-downloaded', label: 'Most downloaded' },
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [papers, setPapers] = useState<ApiPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPaper, setSelectedPaper] = useState<ApiPaper | null>(null)
  const [abstractOpen, setAbstractOpen] = useState(false)
  const [activeFaculty, setActiveFaculty] = useState('all')

  const FACULTIES = [
    { id: 'all', label: 'All Faculties' },
    { id: 'gbs', label: 'Business School (GBS)' },
    { id: 'spsg', label: 'Public Service & Governance' },
    { id: 'law', label: 'Faculty of Law' },
    { id: 'sotss', label: 'Technology & Social Sciences' },
  ]

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
      .catch(() => {})
    setSelectedPaper(paper)
    setAbstractOpen(true)
  }

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
    <div className="space-y-8">
      {/* ── PAGE TITLE & SUB-NAVIGATION PILLS (Matches FinPlanner Images 3 & 7) ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
            Public Catalog
          </h1>
          <span className="text-[13px] font-medium text-[#6e766b]">
            Showing {filteredPapers.length} publication{filteredPapers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Faculty Filter Sub-Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {FACULTIES.map((f) => {
            const isActive = activeFaculty === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFaculty(f.id)}
                className={`fp-subnav-pill ${isActive ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
              >
                <Building2 className="size-3.5" />
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Action & Search Bar (Matches FinPlanner Image 3 "Transactions") */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Dark olive category selector pill */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="h-9 px-4 rounded-full bg-[#5a6552] text-white text-[12px] font-semibold cursor-pointer focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-white text-[#1a1d1a]">
                {cat.label}
              </option>
            ))}
          </select>

          {/* Rounded pill search input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder="Search theses, authors, and keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-4 pr-10 rounded-full border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552]"
            />
            <Search className="size-4 text-[#6e766b] absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Soft Sage Action Buttons */}
          {isAuthenticated && user?.role !== 'guest' ? (
            <button
              type="button"
              onClick={() => navigate('/submit-proposal')}
              className="h-9 px-4 rounded-lg bg-[#dce7d0] hover:bg-[#ceddc0] text-[#1a1d1a] text-[12px] font-bold transition-colors cursor-pointer"
            >
              + Submit thesis
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-9 px-4 rounded-lg bg-[#dce7d0] hover:bg-[#ceddc0] text-[#1a1d1a] text-[12px] font-bold transition-colors cursor-pointer"
            >
              + Sign in to submit
            </button>
          )}

          {/* View Mode Toggle (Matches Image 8 chart/grid toggle) */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#5a6552] text-white'
                  : 'bg-[#e6eedc] text-[#1a1d1a] hover:bg-[#dce7d0]'
              }`}
              title="Table view"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#5a6552] text-white'
                  : 'bg-[#e6eedc] text-[#1a1d1a] hover:bg-[#dce7d0]'
              }`}
              title="Bento card view"
            >
              <Grid3x3 className="size-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: TABLE OR BENTO CARDS ── */}
      {loading ? (
        <div className="fp-card py-16 text-center text-[#6e766b] text-[14px]">
          Loading publications...
        </div>
      ) : error ? (
        <div className="fp-card py-12 text-center text-[#c93b2b] text-[14px]">
          {error}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="fp-card py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#dce7d0] flex items-center justify-center mx-auto text-[#1a1d1a]">
            <BookOpen className="size-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-[18px] font-bold text-[#1a1d1a]">
              Welcome to the GIMPA Thesis Repository
            </h3>
            <p className="text-[13px] text-[#6e766b] leading-relaxed">
              Approved doctoral dissertations, postgraduate theses, and scholarly research works across GIMPA faculties appear here.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {!isAuthenticated && (
              <Button onClick={() => navigate('/login')}>
                <LogIn className="size-4 mr-1.5" /> Log in to Submit
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
              Reset Filters
            </Button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* Minimalist Table View matching FinPlanner Image 1 & 3 */
        <div className="overflow-x-auto">
          <table className="fp-table">
            <thead>
              <tr>
                <th className="w-10">
                  <span className="inline-block w-4 h-4 rounded border border-[#c5c9be]" />
                </th>
                <th>Year</th>
                <th>Impact</th>
                <th>Title & Abstract</th>
                <th>Author</th>
                <th>Discipline</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.map((paper, idx) => (
                <tr
                  key={paper.id}
                  onClick={() => openAbstract(paper)}
                  className="cursor-pointer"
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={bookmarked.has(paper.id)}
                      onChange={() => toggleBookmark(paper.id)}
                      className="w-4 h-4 rounded border-[#c5c9be] text-[#5a6552] focus:ring-[#5a6552]"
                    />
                  </td>
                  <td className="text-[#1a1d1a]">{paper.year || '2026'}</td>
                  <td className="font-semibold text-[#3b7a57]">
                    +{formatViewCount(paper.views)} views
                  </td>
                  <td className="max-w-md">
                    <div className="font-semibold text-[#1a1d1a] truncate">{paper.title}</div>
                    <div className="text-[12px] text-[#6e766b] truncate">{paper.abstract || 'Click to inspect abstract'}</div>
                  </td>
                  <td className="text-[#1a1d1a]">
                    {paper.authors.map((a) => a.name).join(', ') || 'Scholar'}
                  </td>
                  <td>
                    <Badge variant={idx % 3 === 1 ? 'secondary' : 'default'}>
                      {paper.discipline || 'General'}
                    </Badge>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAbstract(paper)}
                      >
                        <Eye className="size-3.5 mr-1" /> Read
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleDownload(paper.id)}
                        disabled={!isAuthenticated || user?.role === 'guest'}
                      >
                        <Download className="size-3.5 mr-1" /> PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Spacious Bento Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              onClick={() => openAbstract(paper)}
              className="fp-card flex flex-col justify-between cursor-pointer hover:border-[#c5d4b2] transition-all space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="default">{paper.discipline || 'Academic Thesis'}</Badge>
                  <span className="text-[12px] font-semibold text-[#6e766b]">{paper.year}</span>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-[#1a1d1a] line-clamp-2 leading-snug">
                    {paper.title}
                  </h3>
                  <p className="text-[13px] text-[#6e766b] mt-1 font-medium">
                    {paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
                  </p>
                </div>

                <p className="text-[13px] text-[#6e766b] line-clamp-3 leading-relaxed">
                  {paper.abstract || 'No abstract available.'}
                </p>
              </div>

              <div className="space-y-4 pt-3 border-t border-[#eaece4]">
                <div className="flex items-center justify-between text-[12px] text-[#6e766b]">
                  <span className="font-semibold text-[#3b7a57]">+{formatViewCount(paper.views)} views</span>
                  <span>{paper.downloads} downloads</span>
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 fill-[#5a6552] text-[#5a6552]" />
                    {(paper.rating ?? 0).toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => void handleDownload(paper.id)}
                    disabled={!isAuthenticated || user?.role === 'guest'}
                  >
                    <Download className="size-3.5 mr-1.5" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant={bookmarked.has(paper.id) ? 'olive' : 'outline'}
                    onClick={() => toggleBookmark(paper.id)}
                  >
                    <Bookmark className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clean White FinPlanner Modal for Abstract Inspection */}
      <Dialog open={abstractOpen} onOpenChange={setAbstractOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title || 'Thesis Abstract'}</DialogTitle>
            <DialogDescription>
              {selectedPaper?.authors.map((a) => a.name).join(', ') || 'Unknown Author'} · {selectedPaper?.discipline || 'General'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">{selectedPaper?.year || '2026'}</Badge>
              <Badge variant="secondary">{selectedPaper?.document_type || 'Thesis'}</Badge>
              <Badge variant="outline">{selectedPaper?.university || 'GIMPA'}</Badge>
            </div>
            <div className="rounded-xl bg-[#fafbf8] border border-[#eaece4] p-5 text-[14px] leading-relaxed text-[#1a1d1a] max-h-[50vh] overflow-auto">
              {selectedPaper?.abstract || 'No abstract available.'}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {selectedPaper && (
                <Button
                  onClick={() => void handleDownload(selectedPaper.id)}
                  disabled={!isAuthenticated || user?.role === 'guest'}
                >
                  <Download className="size-4 mr-1.5" /> Download Full PDF
                </Button>
              )}
              <Button variant="outline" onClick={() => setAbstractOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
