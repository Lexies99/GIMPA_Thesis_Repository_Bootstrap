import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Search, Filter, Download, Eye, Bookmark, Grid3x3, List, X } from 'lucide-react'
import { apiDownloadPaperFile, apiListPapers } from '../../lib/api'
import { convertTextOrTopicToPdf } from '../../lib/pdfGenerator'
import type { ApiPaper } from '../../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'

export function SearchDiscovery() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
  const [sortBy, setSortBy] = useState('relevance')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set())
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; query: string; filters: Record<string, string[]>; sortBy: string }>>([])
  const [showSaveSearch, setShowSaveSearch] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [papers, setPapers] = useState<ApiPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const resultsPerPage = 10

  const SCHOOL_DISCIPLINE_MAP: Record<string, string[]> = {
    'Business School': [
      'Business Administration',
      'Accounting and Finance',
    ],
    'School of Public Service and Governance': [
      'Public Service and Governance',
    ],
    'Faculty of Law': [
      'Law',
    ],
    'School of Technology and Social Sciences (SOTSS)': [
      'Computer Science and Information Systems',
      'Information Systems and Innovation',
      'Economics and Hospitality Studies',
      'Liberal Arts and Communication Studies',
    ],
  }
  const disciplines = Array.from(new Set(Object.values(SCHOOL_DISCIPLINE_MAP).flat()))
  const years = ['2026', '2025', '2024', '2023', '2022', '2021', '2020']
  const schools = [
    'Business School',
    'School of Public Service and Governance',
    'Faculty of Law',
    'School of Technology and Social Sciences (SOTSS)',
  ]
  const selectedSchool = activeFilters.university?.[0]
  const visibleDisciplines = selectedSchool ? (SCHOOL_DISCIPLINE_MAP[selectedSchool] || []) : disciplines

  useEffect(() => {
    const selectedDiscipline = activeFilters.discipline?.[0]
    if (!selectedSchool || !selectedDiscipline) return
    if (visibleDisciplines.includes(selectedDiscipline)) return
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next.discipline
      return next
    })
  }, [selectedSchool, activeFilters.discipline, visibleDisciplines])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const results = await apiListPapers({
          q: searchQuery || undefined,
          discipline: activeFilters.discipline?.[0],
          university: activeFilters.university?.[0],
          year: activeFilters.year?.[0] ? Number(activeFilters.year[0]) : undefined,
          sort: sortBy,
          catalog: true,
          limit: 200,
        })
        if (!cancelled) setPapers(results)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to search papers')
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
  }, [searchQuery, activeFilters, sortBy])

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

  const paginatedPapers = useMemo(
    () => papers.slice(currentPage * resultsPerPage, (currentPage + 1) * resultsPerPage),
    [papers, currentPage],
  )
  const totalPages = Math.ceil(papers.length / resultsPerPage)

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[category] || []
      return {
        ...prev,
        [category]: current.includes(value) ? current.filter((v) => v !== value) : [value],
      }
    })
    setCurrentPage(0)
  }

  const toggleBookmark = (id: number) => {
    const next = new Set(bookmarked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setBookmarked(next)
  }

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return
    setSavedSearches((prev) => [...prev, { name: searchName.trim(), query: searchQuery, filters: activeFilters, sortBy }])
    setSearchName('')
    setShowSaveSearch(false)
  }

  const loadSearch = (search: (typeof savedSearches)[number]) => {
    setSearchQuery(search.query)
    setActiveFilters(search.filters)
    setSortBy(search.sortBy)
    setCurrentPage(0)
  }

  const clearFilters = () => {
    setActiveFilters({})
    setSearchQuery('')
    setCurrentPage(0)
  }

  const activeFilterCount = Object.values(activeFilters).flat().length

  return (
    <div className="space-y-8">
      {/* ── PAGE TITLE & ACTION BAR (Matches FinPlanner Image 3 & 8) ── */}
      <div className="space-y-5">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
          Search & Discovery
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle (Matches Image 8 left chart/grid toggle) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#5a6552] text-white'
                  : 'bg-[#e6eedc] text-[#1a1d1a] hover:bg-[#dce7d0]'
              }`}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#5a6552] text-white'
                  : 'bg-[#e6eedc] text-[#1a1d1a] hover:bg-[#dce7d0]'
              }`}
            >
              <Grid3x3 className="size-4" />
            </button>
          </div>

          {/* Rounded pill search bar */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder="Search papers, authors, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-4 pr-10 rounded-full border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552]"
            />
            <Search className="size-4 text-[#6e766b] absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Sort dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs w-44 rounded-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Sort: Relevance</SelectItem>
              <SelectItem value="newest">Sort: Newest</SelectItem>
              <SelectItem value="citations">Sort: Most Cited</SelectItem>
              <SelectItem value="downloads">Sort: Most Downloaded</SelectItem>
              <SelectItem value="views">Sort: Most Viewed</SelectItem>
              <SelectItem value="highest-rated">Sort: Highest Rated</SelectItem>
            </SelectContent>
          </Select>

          {/* Save Search Button */}
          <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
            <DialogTrigger className="h-9 px-4 rounded-lg bg-[#dce7d0] hover:bg-[#ceddc0] text-[#1a1d1a] text-[12px] font-bold transition-colors cursor-pointer">
              + Save search
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save current search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Search name (e.g., 'Public Policy 2026')"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <Button onClick={saveCurrentSearch} className="w-full">
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-4 rounded-lg bg-[#5a6552] text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="size-3.5" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[#6e766b]">Saved searches:</span>
            {savedSearches.map((search, idx) => (
              <Button key={idx} size="sm" variant="outline" onClick={() => loadSearch(search)}>
                {search.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT: LEFT FILTER CARD + RIGHT RESULTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Facet Card */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="fp-card space-y-6">
            <div className="flex items-center justify-between border-b border-[#eaece4] pb-3.5">
              <div className="text-[15px] font-bold text-[#1a1d1a] flex items-center gap-2">
                <Filter className="size-4 text-[#5a6552]" />
                <span>Filters</span>
              </div>
              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[#e6eedc] text-[#263021]">
                {papers.length} found
              </span>
            </div>

            {/* School Filter */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-[#6e766b] uppercase tracking-wider px-1">
                School
              </div>
              <div className="flex flex-col gap-1.5">
                {schools.map((u) => {
                  const isChecked = activeFilters.university?.includes(u) || false
                  return (
                    <label
                      key={u}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-[13px] leading-snug ${
                        isChecked
                          ? 'bg-[#e6eedc]/70 border-[#c9d8b6] text-[#1a1d1a] font-semibold'
                          : 'bg-[#ffffff] border-[#eaece4] text-[#1a1d1a] hover:bg-[#f4f6f0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFilter('university', u)}
                        className="mt-0.5 size-4 shrink-0 rounded border-[#c5c9be] accent-[#5a6552] cursor-pointer"
                      />
                      <span className="flex-1">{u}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Discipline Filter */}
            <div className="space-y-2.5 pt-4 border-t border-[#eaece4]">
              <div className="text-[11px] font-bold text-[#6e766b] uppercase tracking-wider px-1">
                Discipline
              </div>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                {visibleDisciplines.map((d) => {
                  const isChecked = activeFilters.discipline?.includes(d) || false
                  return (
                    <label
                      key={d}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-[13px] leading-snug ${
                        isChecked
                          ? 'bg-[#e6eedc]/70 border-[#c9d8b6] text-[#1a1d1a] font-semibold'
                          : 'bg-[#ffffff] border-[#eaece4] text-[#1a1d1a] hover:bg-[#f4f6f0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFilter('discipline', d)}
                        className="mt-0.5 size-4 shrink-0 rounded border-[#c5c9be] accent-[#5a6552] cursor-pointer"
                      />
                      <span className="flex-1">{d}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Year Filter */}
            <div className="space-y-2.5 pt-4 border-t border-[#eaece4]">
              <div className="text-[11px] font-bold text-[#6e766b] uppercase tracking-wider px-1">
                Year
              </div>
              <div className="grid grid-cols-2 gap-2">
                {years.map((y) => {
                  const isChecked = activeFilters.year?.includes(y) || false
                  return (
                    <label
                      key={y}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-[13px] ${
                        isChecked
                          ? 'bg-[#e6eedc]/70 border-[#c9d8b6] text-[#1a1d1a] font-semibold'
                          : 'bg-[#ffffff] border-[#eaece4] text-[#1a1d1a] hover:bg-[#f4f6f0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFilter('year', y)}
                        className="size-4 shrink-0 rounded border-[#c5c9be] accent-[#5a6552] cursor-pointer"
                      />
                      <span>{y}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Results Area */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {loading ? (
            <div className="fp-card py-16 text-center text-[#6e766b]">
              Loading search results...
            </div>
          ) : error ? (
            <div className="fp-card py-12 text-center text-[#c93b2b]">
              {error}
            </div>
          ) : paginatedPapers.length === 0 ? (
            <div className="fp-card py-16 text-center text-[#6e766b]">
              No matching theses found. Try adjusting your search query or filters.
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Metrics</th>
                    <th>Thesis Title</th>
                    <th>Author</th>
                    <th>Discipline</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPapers.map((paper, idx) => (
                    <tr key={paper.id} className="cursor-pointer" onClick={() => navigate(`/paper/${paper.id}`)}>
                      <td>{paper.year}</td>
                      <td className="font-semibold text-[#3b7a57]">
                        +{paper.views} views
                      </td>
                      <td className="max-w-sm">
                        <div className="font-semibold text-[#1a1d1a] truncate">{paper.title}</div>
                        <div className="text-[12px] text-[#6e766b] truncate">{paper.abstract}</div>
                      </td>
                      <td>{paper.authors.map((a) => a.name).join(', ') || 'Scholar'}</td>
                      <td>
                        <Badge variant={idx % 2 === 1 ? 'secondary' : 'default'}>
                          {paper.discipline || 'General'}
                        </Badge>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={bookmarked.has(paper.id) ? 'olive' : 'outline'}
                            onClick={() => toggleBookmark(paper.id)}
                          >
                            <Bookmark className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleDownload(paper.id)}
                            disabled={!isAuthenticated || user?.role === 'guest'}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedPapers.map((paper) => (
                <div key={paper.id} className="fp-card flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="default">{paper.discipline || 'General'}</Badge>
                      <span className="text-[12px] font-semibold text-[#6e766b]">{paper.year}</span>
                    </div>
                    <h3
                      className="text-[16px] font-bold text-[#1a1d1a] line-clamp-2 hover:underline cursor-pointer"
                      onClick={() => navigate(`/paper/${paper.id}`)}
                    >
                      {paper.title}
                    </h3>
                    <p className="text-[13px] text-[#6e766b]">
                      {paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
                    </p>
                    <p className="text-[13px] text-[#6e766b] line-clamp-2">
                      {paper.abstract || 'No abstract available.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#eaece4] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[12px] text-[#6e766b]">
                      <span className="font-semibold text-[#3b7a57] flex items-center gap-1">
                        <Eye className="size-3.5" /> {paper.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="size-3.5" /> {paper.downloads}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={bookmarked.has(paper.id) ? 'olive' : 'outline'}
                        onClick={() => toggleBookmark(paper.id)}
                      >
                        <Bookmark className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleDownload(paper.id)}
                        disabled={!isAuthenticated || user?.role === 'guest'}
                      >
                        <Download className="size-3.5 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button size="sm" variant="outline" onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))} disabled={currentPage === 0}>
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button key={i} size="sm" variant={currentPage === i ? 'olive' : 'outline'} onClick={() => setCurrentPage(i)} className="min-w-8">
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={currentPage === totalPages - 1}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
