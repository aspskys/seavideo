'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type InternalApiSettings } from './internal-api/config'
import { AuthSection } from './internal-api/AuthSection'
import { EndpointsSection } from './internal-api/EndpointsSection'
import { GeminiModelsSection } from './internal-api/GeminiModelsSection'
import { VideoModelsSection } from './internal-api/VideoModelsSection'

function loadSettings(): InternalApiSettings {
  if (typeof window === 'undefined') return INTERNAL_API_CONFIG.defaults
  try {
    const raw = localStorage.getItem('seavideo-internal-api')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return INTERNAL_API_CONFIG.defaults
}

function saveSettings(settings: InternalApiSettings) {
  localStorage.setItem('seavideo-internal-api', JSON.stringify(settings))
}

export default function InternalApiTab() {
  const t = useTranslations('internalApi')
  const [settings, setSettings] = useState<InternalApiSettings>(loadSettings)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')

  const updateSettings = useCallback((patch: Partial<InternalApiSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaveStatus('idle')
  }, [])

  const handleSave = useCallback(() => {
    setSaveStatus('saving')
    saveSettings(settings)
    setTimeout(() => setSaveStatus('saved'), 300)
  }, [settings])

  const handleTest = useCallback(async () => {
    setTestStatus('testing')
    try {
      const endpoint = settings.activeLlmEndpoint === 'dev'
        ? INTERNAL_API_CONFIG.endpoints.llm.dev
        : settings.activeLlmEndpoint === 'prodInternal'
          ? INTERNAL_API_CONFIG.endpoints.llm.prodInternal
          : INTERNAL_API_CONFIG.endpoints.llm.prodExternal

      const res = await fetch(`${endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'X-Project': settings.projectCode,
        },
        signal: AbortSignal.timeout(10000),
      })
      setTestStatus(res.ok ? 'success' : 'failed')
    } catch {
      setTestStatus('failed')
    }
    setTimeout(() => setTestStatus('idle'), 3000)
  }, [settings])

  const handleReset = useCallback(() => {
    const defaults = INTERNAL_API_CONFIG.defaults
    setSettings(defaults)
    saveSettings(defaults)
    setSaveStatus('saved')
  }, [])

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
          {testStatus !== 'idle' && (
            <span className={`text-xs px-2.5 py-1 rounded-lg ${
              testStatus === 'testing' ? 'bg-blue-500/10 text-blue-500' :
              testStatus === 'success' ? 'bg-green-500/10 text-green-500' :
              'bg-red-500/10 text-red-500'
            }`}>
              {testStatus === 'testing' && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5 align-middle" />}
              {t(testStatus === 'testing' ? 'testing' : testStatus === 'success' ? 'testSuccess' : 'testFailed')}
            </span>
          )}
          <button onClick={handleTest} className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs">
            {t('testConnection')}
          </button>
          <button onClick={handleReset} className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs">
            {t('reset')}
          </button>
          <button onClick={handleSave} className="glass-btn-base glass-btn-primary px-3 py-1.5 text-xs">
            {saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('saved') : t('save')}
          </button>
        </div>
      </div>

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
