import { useEffect, useState } from 'react'
import mammoth from 'mammoth'
import { FileText, Loader2, AlertCircle } from 'lucide-react'

interface DocxViewerProps {
  fileUrl: string
  token?: string | null
  filename?: string
}

export function DocxViewer({ fileUrl, token, filename }: DocxViewerProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let active = true

    async function loadDocx() {
      setLoading(true)
      setError('')
      try {
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(fileUrl, { headers })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch file`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (active) {
          setHtml(result.value || '<p class="text-muted-foreground italic">Document contains no text content.</p>')
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not render Word document')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDocx()
    return () => {
      active = false
    }
  }, [fileUrl, token])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>Rendering Word Document ({filename || 'File'})...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Could not render Word document preview inline:</p>
          <p>{error}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Please use the Download button above to view this document in Microsoft Word.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 font-medium">
        <FileText className="size-3.5 text-primary" />
        <span>In-App Word Document Reader — {filename || 'Document'}</span>
      </div>
      <div 
        className="w-full max-h-[75vh] overflow-y-auto p-8 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border shadow-sm prose dark:prose-invert max-w-none text-sm leading-relaxed font-sans"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
