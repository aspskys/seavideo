'use client'

import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type InternalApiSettings } from './config'

interface Props {
  settings: InternalApiSettings
  onUpdate: (patch: Partial<InternalApiSettings>) => void
  t: (key: string) => string
}

export function GeminiModelsSection({ settings, onUpdate, t }: Props) {
  const toggleModel = (modelId: string) => {
    onUpdate({
      geminiModels: {
        ...settings.geminiModels,
        [modelId]: !settings.geminiModels[modelId],
      },
    })
  }

  return (
    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AppIcon name="sparkles" className="w-4 h-4 text-[var(--glass-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('section.geminiModels')}</h3>
        <span className="text-xs text-[var(--glass-text-tertiary)]">{t('section.geminiModelsDesc')}</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {INTERNAL_API_CONFIG.geminiModels.map((modelId) => {
          const enabled = settings.geminiModels[modelId] ?? true
          return (
            <div
              key={modelId}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                enabled
                  ? 'border-[var(--glass-accent)]/30 bg-[var(--glass-accent)]/5'
                  : 'border-[var(--glass-stroke-base)] bg-transparent'
              }`}
              onClick={() => toggleModel(modelId)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  enabled ? 'bg-[var(--glass-accent)]/15 text-[var(--glass-accent)]' : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]'
                }`}>
                  G
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--glass-text-primary)] font-mono">{modelId}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  enabled ? 'bg-green-500/10 text-green-500' : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]'
                }`}>
                  {t(enabled ? 'gemini.enabled' : 'gemini.disabled')}
                </span>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${enabled ? 'bg-[var(--glass-accent)]' : 'bg-[var(--glass-bg-muted)]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
