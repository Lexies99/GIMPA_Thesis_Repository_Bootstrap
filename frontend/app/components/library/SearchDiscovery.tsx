import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { Search, Filter, Download, Eye, Bookmark, Grid3x3, List, X } from 'lucide-react'
import { apiDownloadPaperFile, apiListPapers } from '../../lib/api'
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
  const resultsPerPage = 6

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
  const years = ['2024', '2023', '2022', '2021', '2020']
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
      const { blob, filename } = await apiDownloadPaperFile(paperId, token)
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search papers, authors, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-2 h-10 text-foreground bg-background border-input"
          />
        </div>

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Saved searches:</span>
            {savedSearches.map((search, idx) => (
              <Button key={idx} size="sm" variant="outline" onClick={() => loadSearch(search)}>
                {search.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                {activeFilterCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearFilters}>
                    <X className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
              {activeFilterCount > 0 && <p className="text-xs text-muted-foreground mt-2">{activeFilterCount} active</p>}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm mb-3">Discipline</h4>
                <div className="space-y-2">
                  {visibleDisciplines.map((d) => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground text-sm">
                      <input
                        type="checkbox"
                        checked={activeFilters.discipline?.includes(d) || false}
                        onChange={() => toggleFilter('discipline', d)}
                        className="w-4 h-4"
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">School</h4>
                <div className="space-y-2">
                  {schools.map((u) => (
                    <label key={u} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground text-sm">
                      <input
                        type="checkbox"
                        checked={activeFilters.university?.includes(u) || false}
                        onChange={() => toggleFilter('university', u)}
                        className="w-4 h-4"
                      />
                      <span>{u}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Year</h4>
                <div className="space-y-2">
                  {years.map((y) => (
                    <label key={y} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground text-sm">
                      <input
                        type="checkbox"
                        checked={activeFilters.year?.includes(y) || false}
                        onChange={() => toggleFilter('year', y)}
                        className="w-4 h-4"
                      />
                      <span>{y}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Found {papers.length} results</p>
              <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
                <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3">
                  Save Search
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Current Search</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Search name (e.g., 'AI Healthcare 2024')"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                    />
                    <Button onClick={saveCurrentSearch} className="w-full">
                      Save Search
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="citations">Most Cited</SelectItem>
                  <SelectItem value="downloads">Most Downloaded</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                  <SelectItem value="highest-rated">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">Loading search results...</CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-center text-destructive">{error}</CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {paginatedPapers.map((paper) => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-2 line-clamp-2 hover:text-primary cursor-pointer" onClick={() => navigate(`/paper/${paper.id}`)}>{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mb-1">by {paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}</p>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{paper.abstract || 'No abstract available.'}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {paper.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" /> {paper.downloads.toLocaleString()}
                          </span>
                          <span>Citations: {paper.citations}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{paper.year}</Badge>
                          <Badge variant="outline" className="text-xs">{paper.discipline || 'General'}</Badge>
                          <Badge variant="outline" className="text-xs">{paper.university || 'Unknown School'}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={bookmarked.has(paper.id) ? 'default' : 'outline'}
                          onClick={() => toggleBookmark(paper.id)}
                          title="Bookmark"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title={isAuthenticated && user?.role !== 'guest' ? 'Download' : 'Login to download'}
                          onClick={() => void handleDownload(paper.id)}
                          disabled={!isAuthenticated || user?.role === 'guest'}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedPapers.map((paper) => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm line-clamp-2 hover:text-primary cursor-pointer" onClick={() => navigate(`/paper/${paper.id}`)}>{paper.title}</CardTitle>
                    <CardDescription className="text-xs">{paper.authors.map((a) => a.name).join(', ') || 'Unknown Author'}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 flex-1 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">{paper.abstract || 'No abstract available.'}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{paper.year}</Badge>
                      <Badge variant="outline" className="text-xs">{paper.discipline || 'General'}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {(paper.views / 1000).toFixed(1)}K
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" /> {paper.downloads}
                      </div>
                      <div>Cite: {paper.citations}</div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant={bookmarked.has(paper.id) ? 'default' : 'outline'}
                        onClick={() => toggleBookmark(paper.id)}
                        className="flex-1"
                      >
                        <Bookmark className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void handleDownload(paper.id)}
                        disabled={!isAuthenticated || user?.role === 'guest'}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                  <Button key={i} size="sm" variant={currentPage === i ? 'default' : 'outline'} onClick={() => setCurrentPage(i)} className="min-w-8">
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
