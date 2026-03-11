'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type InternalApiSettings } from './internal-api/config'
import { AuthSection } from './internal-api/AuthSection'
import { EndpointsSection } from './internal-api/EndpointsSection'
import { GeminiModelsSection } from './internal-api/GeminiModelsSection'
import { VideoModelsSection } from './internal-api/VideoModelsSection'
import { apiFetch } from '@/lib/api-fetch'

export default function InternalApiTab() {
  const t = useTranslations('internalApi')
  const [settings, setSettings] = useState<InternalApiSettings>(INTERNAL_API_CONFIG.defaults)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testResults, setTestResults] = useState<{ step: string; status: string; message: string; detail?: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiFetch('/api/internal-api/sync')
      .then(res => res.json())
      .then(data => {
        if (data.configured && data.config) {
          const serverConfig = data.config
          const localRaw = localStorage.getItem('seavideo-internal-api')
          let local: InternalApiSettings | null = null
          try { if (localRaw) local = JSON.parse(localRaw) } catch { /* ignore */ }

          if (local?.apiKey && !local.apiKey.includes('...')) {
            setSettings(local)
          } else {
            setSettings(prev => ({
              ...prev,
              projectCode: serverConfig.projectCode || prev.projectCode,
              activeLlmEndpoint: serverConfig.activeLlmEndpoint || prev.activeLlmEndpoint,
              activeMultimodalEndpoint: serverConfig.activeMultimodalEndpoint || prev.activeMultimodalEndpoint,
              geminiModels: serverConfig.geminiModels || prev.geminiModels,
            }))
          }
        } else {
          const localRaw = localStorage.getItem('seavideo-internal-api')
          if (localRaw) {
            try { setSettings(JSON.parse(localRaw)) } catch { /* ignore */ }
          }
        }
        setLoaded(true)
      })
      .catch(() => {
        const localRaw = localStorage.getItem('seavideo-internal-api')
        if (localRaw) {
          try { setSettings(JSON.parse(localRaw)) } catch { /* ignore */ }
        }
        setLoaded(true)
      })
  }, [])

  const updateSettings = useCallback((patch: Partial<InternalApiSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaveStatus('idle')
  }, [])

  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    localStorage.setItem('seavideo-internal-api', JSON.stringify(settings))

    try {
      const res = await apiFetch('/api/internal-api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [settings])

  const handleTest = useCallback(async () => {
    setTestStatus('testing')
    setTestResults([])

    const endpoint = settings.activeLlmEndpoint === 'dev'
      ? INTERNAL_API_CONFIG.endpoints.llm.dev
      : settings.activeLlmEndpoint === 'prodInternal'
        ? INTERNAL_API_CONFIG.endpoints.llm.prodInternal
        : INTERNAL_API_CONFIG.endpoints.llm.prodExternal

    try {
      const res = await apiFetch('/api/internal-api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          projectCode: settings.projectCode,
          endpoint,
        }),
      })
      const data = await res.json()
      setTestResults(data.results || [])
      setTestStatus(data.success ? 'success' : 'failed')
    } catch {
      setTestResults([{ step: 'network', status: 'fail', message: 'Failed to reach test API' }])
      setTestStatus('failed')
    }
  }, [settings])

  const handleReset = useCallback(async () => {
    const defaults = INTERNAL_API_CONFIG.defaults
    setSettings(defaults)
    localStorage.setItem('seavideo-internal-api', JSON.stringify(defaults))
    try {
      await apiFetch('/api/internal-api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults),
      })
    } catch { /* ignore */ }
    setSaveStatus('saved')
  }, [])

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[var(--glass-text-tertiary)]">
        {t('testing')}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--glass-stroke-base)] px-6 py-4">
        <div className="flex items-center gap-3">
          <AppIcon name="cpu" className="w-5 h-5 text-[var(--glass-accent)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--glass-text-primary)]">{t('title')}</h2>
            <p className="text-xs text-[var(--glass-text-tertiary)]">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleTest} disabled={testStatus === 'testing'} className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">
            {testStatus === 'testing' ? t('testing') : t('testConnection')}
          </button>
          <button onClick={handleReset} className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs">
            {t('reset')}
          </button>
          <button onClick={handleSave} disabled={saveStatus === 'saving'} className="glass-btn-base glass-btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
            {saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('saved') : saveStatus === 'error' ? t('testFailed') : t('save')}
          </button>
        </div>
      </div>

      {/* Test Results Banner */}
      {testResults.length > 0 && (
        <div className={`mx-6 mt-4 rounded-xl border p-3 space-y-2 ${
          testStatus === 'success' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}>
          {testResults.map((r) => (
            <div key={r.step} className="flex items-center gap-2 text-xs">
              {r.status === 'pass' ? (
                <AppIcon name="check" className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <AppIcon name="close" className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              )}
              <span className="font-medium text-[var(--glass-text-primary)]">{r.step}</span>
              <span className="text-[var(--glass-text-secondary)]">{r.message}</span>
              {r.detail && <span className="text-[var(--glass-text-tertiary)] text-[10px] truncate max-w-xs">{r.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <AuthSection settings={settings} onUpdate={updateSettings} t={t} />
          <EndpointsSection settings={settings} onUpdate={updateSettings} t={t} />
          <GeminiModelsSection settings={settings} onUpdate={updateSettings} t={t} />
          <VideoModelsSection t={t} />
        </div>
      </div>
    </div>
  )
}
