import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { apiGetPaperEditorConfig, apiGetStepEditorConfig } from '../lib/api'

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
  onError,
}: {
  documentServerUrl: string
  config: Record<string, unknown>
  onError: (msg: string) => void
}) {
  const rid = useId()
  const containerId = `onlyoffice-editor-${rid.replace(/[:]/g, '')}`
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null)

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

  return <div id={containerId} className="fixed inset-0 bg-white" />
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

      if (!Number.isFinite(paperId) && !Number.isFinite(stepId)) {
        setError('Invalid parameters. Provide paperId or stepId.')
        setLoading(false)
        return
      }

      try {
        let editorData
        if (Number.isFinite(stepId) && stepId > 0) {
          editorData = await apiGetStepEditorConfig(stepId, token)
        } else if (Number.isFinite(paperId) && paperId > 0) {
          editorData = await apiGetPaperEditorConfig(paperId, token)
        } else {
          throw new Error('Invalid ID parameter.')
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

  return <OnlyOfficeEditor documentServerUrl={documentServerUrl} config={config} onError={setError} />
}
