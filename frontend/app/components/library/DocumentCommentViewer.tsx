import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { MessageSquare, Plus, Trash2, FileText, CornerDownRight } from 'lucide-react'
import type { ApiPaper, ApiPaperAnnotation } from '../../lib/api'

interface DocumentCommentViewerProps {
  paper: ApiPaper
  annotations: ApiPaperAnnotation[]
  isSupervisor: boolean
  onAddAnnotation?: (text: string, location?: string) => Promise<void>
  onDeleteAnnotation?: (annotationId: number) => Promise<void>
}

export function DocumentCommentViewer({
  paper,
  annotations,
  isSupervisor,
  onAddAnnotation,
  onDeleteAnnotation,
}: DocumentCommentViewerProps) {
  const [selectedText, setSelectedText] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null)

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim())
      if (isSupervisor) {
        setIsAdding(true)
      }
    }
  }

  const handleCreateComment = async () => {
    if (!commentInput.trim() || !onAddAnnotation) return
    setSubmitting(true)
    try {
      await onAddAnnotation(commentInput.trim(), selectedText || undefined)
      setCommentInput('')
      setSelectedText('')
      setIsAdding(false)
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const defaultParagraphs = paper.abstract
    ? paper.abstract.split('\n\n').filter(Boolean)
    : [
        'Statement of Intent',
        'As a Ghanaian, I have seen how technology can be both a boon and a bane to humanity. Data can contribute to ending gaps in society, but can also be used unwisely to expand gaps in society. Having a few of my colleagues have inspired me to join the academic research repository. I want to work on building tools that can work to heal and reduce these injustices, not add to them.',
        'I began in information systems and academic administration "in the weeds". Learning points that permeated through my experiences: Institutions don\'t lack data. This data is frequently available, but it is in silos. The absence of intelligent interpretation and timely action can prevent anyone. The conviction that decision-making was slow and reactive prompted me to take a step towards building scalable AI.',
      ]

  return (
    <div className="space-y-4">
      {/* Abstract Project Summary Banner at top */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <FileText className="size-4 text-blue-600" />
              Project Abstract Summary
            </CardTitle>
            <Badge variant="outline" className="text-xs uppercase bg-blue-100 dark:bg-blue-900 border-blue-300">
              {paper.document_type || 'Research'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed italic">
            "{paper.abstract || 'No abstract summary provided for this project.'}"
          </p>
        </CardContent>
      </Card>

      {/* Main Document + Supervisor Comment Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Document Panel */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="shadow-sm border">
            <CardHeader className="border-b bg-muted/30 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">{paper.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Document Review Mode • Highlight text to attach supervisor comment
                  </p>
                </div>
                {isSupervisor && (
                  <Button
                    size="sm"
                    variant={isAdding ? 'default' : 'outline'}
                    onClick={() => setIsAdding(!isAdding)}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add Comment
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4 text-sm leading-relaxed" onMouseUp={handleTextSelection}>
              {defaultParagraphs.map((para, pIdx) => {
                const matchingAnnotations = annotations.filter(
                  (a) => a.location && para.toLowerCase().includes(a.location.toLowerCase())
                )

                if (matchingAnnotations.length === 0) {
                  return (
                    <p key={pIdx} className="text-foreground/90 font-serif text-base leading-7">
                      {para}
                    </p>
                  )
                }

                return (
                  <div key={pIdx} className="relative group">
                    <p className="text-foreground/90 font-serif text-base leading-7">
                      {matchingAnnotations.map((anno) => {
                        const loc = anno.location || ''
                        const parts = para.split(loc)
                        if (parts.length > 1) {
                          return (
                            <span key={anno.id}>
                              {parts[0]}
                              <span
                                className={`px-1 py-0.5 rounded cursor-pointer transition-colors ${
                                  activeAnnotationId === anno.id
                                    ? 'bg-rose-300 dark:bg-rose-900 ring-2 ring-rose-500'
                                    : 'bg-rose-100 dark:bg-rose-950/60 border-b-2 border-rose-400'
                                }`}
                                onClick={() => setActiveAnnotationId(anno.id)}
                              >
                                {loc}
                              </span>
                              {parts.slice(1).join(loc)}
                            </span>
                          )
                        }
                        return para
                      })}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: MS Word-Style Supervisor Comments Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border shadow-sm h-full">
            <CardHeader className="py-3 border-b bg-muted/40">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="size-4 text-rose-600" />
                  Supervisor Comments
                </span>
                <Badge variant="secondary" className="text-xs">
                  {annotations.length}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {/* Form to add comment */}
              {isSupervisor && isAdding && (
                <div className="p-3 border-2 border-rose-300 dark:border-rose-800 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 space-y-2">
                  <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                    New Correction Comment
                  </p>
                  {selectedText && (
                    <div className="text-xs bg-white dark:bg-card p-1.5 rounded border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 italic truncate">
                      "{selectedText}"
                    </div>
                  )}
                  <Textarea
                    placeholder="Enter supervisor comment or correction note..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    rows={3}
                    className="text-xs bg-white dark:bg-card"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setIsAdding(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      disabled={!commentInput.trim() || submitting}
                      onClick={() => void handleCreateComment()}
                    >
                      {submitting ? 'Saving...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* List of Supervisor Comments (Word Sidebar visual format) */}
              {annotations.length === 0 && !isAdding && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
                  No supervisor comments attached yet.
                </div>
              )}

              {annotations.map((anno) => {
                const authorName = anno.author_name || 'Supervisor'
                const initials = anno.author_initials || 'DT'
                const isActive = activeAnnotationId === anno.id

                return (
                  <div
                    key={anno.id}
                    className={`relative p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 shadow-sm ring-1 ring-rose-400'
                        : 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-card hover:border-rose-300'
                    }`}
                    onClick={() => setActiveAnnotationId(anno.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Supervisor Avatar Initials */}
                      <div className="size-8 rounded-full bg-rose-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground truncate">
                            {authorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {anno.created_at
                              ? new Date(anno.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Just now'}
                          </span>
                        </div>

                        {anno.location && (
                          <div className="text-[11px] text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 truncate">
                            <CornerDownRight className="size-3 inline mr-1 text-rose-500" />
                            "{anno.location}"
                          </div>
                        )}

                        <p className="text-xs text-foreground/90 leading-relaxed font-normal pt-0.5">
                          {anno.text}
                        </p>

                        {isSupervisor && onDeleteAnnotation && (
                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                void onDeleteAnnotation(anno.id)
                              }}
                            >
                              <Trash2 className="size-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
