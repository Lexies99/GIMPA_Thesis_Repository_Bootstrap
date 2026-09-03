import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  apiGetDeanResultsExcelEditorConfig,
  apiGetDepartmentResultsExcelEditorConfig,
  apiGetExaminerResultsExcelEditorConfig,
  apiGetPaperEditorConfig,
  apiGetStepEditorConfig,
  apiNotifyFeedbackSaved,
} from '../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void
      }
    }
  }
}

function OnlyOfficeEditor({
  documentServerUrl,
  config,
  paperId,
  docType,
  onError,
}: {
  documentServerUrl: string
  config: Record<string, unknown>
  paperId?: number
  docType?: string
  onError: (msg: string) => void
}) {
  const rid = useId()
  const containerId = `onlyoffice-editor-${rid.replace(/[:]/g, '')}`
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleDone = async () => {
    setIsSaving(true)
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      if (token && paperId && Number.isFinite(paperId) && paperId > 0) {
        await apiNotifyFeedbackSaved(paperId, docType || 'comments', token)
        setSaveSuccess(true)
      }
    } catch (err) {
      console.error('Failed to notify student:', err)
    } finally {
      setIsSaving(false)
      window.onbeforeunload = null
      setTimeout(() => {
        if (window.opener) {
          window.close()
        } else {
          window.location.href = '/approval-workflow'
        }
      }, 600)
    }
  }

  useEffect(() => {
    let cancelled = false
    const scriptId = 'onlyoffice-api-script'
    const scriptSrc = `${documentServerUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`

    const initEditor = () => {
      if (cancelled) return
      if (!window.DocsAPI?.DocEditor) {
        onError('OnlyOffice Docs API script loaded but DocEditor is not defined.')
        return
      }
      editorRef.current?.destroyEditor?.()
      editorRef.current = new window.DocsAPI.DocEditor(containerId, config)
    }

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) {
      if (window.DocsAPI?.DocEditor) {
        initEditor()
      } else {
        existing.addEventListener('load', initEditor, { once: true })
        existing.addEventListener('error', () => {
          if (!cancelled) onError('Failed to load OnlyOffice Docs API script from existing tag.')
        }, { once: true })
      }
    } else {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = scriptSrc
      script.async = true
      script.onload = initEditor
      script.onerror = () => {
        if (!cancelled) onError('OnlyOffice Document Server is offline or unreachable. Please make sure the OnlyOffice Docker container is started.')
      }
      document.body.appendChild(script)
    }

    return () => {
      cancelled = true
      editorRef.current?.destroyEditor?.()
      editorRef.current = null
    }
  }, [containerId, config, documentServerUrl, onError])

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-white">
      <header className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-400">GIMPA ONLYOFFICE Editor</span>
          <span className="text-xs text-slate-400 hidden sm:inline">• Document updates auto-save automatically as you edit</span>
        </div>
        <button
          type="button"
          onClick={handleDone}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          {isSaving ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              Saving & Notifying Student...
            </>
          ) : saveSuccess ? (
            <>✓ Saved & Student Notified!</>
          ) : (
            <>✓ Done (Save & Notify Student)</>
          )}
        </button>
      </header>
      <div className="flex-1 relative">
        <div id={containerId} className="absolute inset-0 bg-white" />
      </div>
    </div>
  )
}

export default function EditorRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [documentServerUrl, setDocumentServerUrl] = useState('')
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      if (!token) {
        navigate('/login')
        return
      }
      const paperId = Number(searchParams.get('paperId') || '')
      const stepId = Number(searchParams.get('stepId') || '')
      const docType = searchParams.get('type') || 'paper'

      if (!Number.isFinite(paperId) && !Number.isFinite(stepId) && !['examiner_results_excel', 'dept_results_excel', 'dean_results_excel'].includes(docType)) {
        setError('Invalid parameters. Provide paperId, stepId, or valid excel result type.')
        setLoading(false)
        return
      }

      try {
        let editorData
        if (docType === 'examiner_results_excel') {
          editorData = await apiGetExaminerResultsExcelEditorConfig(token)
        } else if (docType === 'dept_results_excel') {
          editorData = await apiGetDepartmentResultsExcelEditorConfig(token)
        } else if (docType === 'dean_results_excel') {
          editorData = await apiGetDeanResultsExcelEditorConfig(token)
        } else if (Number.isFinite(stepId) && stepId > 0) {
          editorData = await apiGetStepEditorConfig(stepId, token)
        } else if (Number.isFinite(paperId) && paperId > 0) {
          editorData = await apiGetPaperEditorConfig(paperId, token, docType)
        } else {
          throw new Error('Invalid parameter provided.')
        }

        if (cancelled) return
        setDocumentServerUrl(editorData.document_server_url)
        setConfig(editorData.config)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load editor')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [navigate, searchParams])

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground">
        <p>Loading editor...</p>
      </main>
    )
  }

  if (error || !config || !documentServerUrl) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="max-w-xl text-center space-y-3">
          <h1 className="text-xl font-semibold">Editor Error</h1>
          <p className="text-sm text-muted-foreground">{error || 'Unable to load editor.'}</p>
        </div>
      </main>
    )
  }

  const paperId = Number(searchParams.get('paperId') || '')
  const docType = searchParams.get('type') || 'paper'

  return (
    <OnlyOfficeEditor
      documentServerUrl={documentServerUrl}
      config={config}
      paperId={Number.isFinite(paperId) ? paperId : undefined}
      docType={docType}
      onError={setError}
    />
  )
}
