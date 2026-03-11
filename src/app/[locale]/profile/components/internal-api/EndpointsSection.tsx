'use client'

import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type InternalApiSettings, type EndpointEnv } from './config'

interface Props {
  settings: InternalApiSettings
  onUpdate: (patch: Partial<InternalApiSettings>) => void
  t: (key: string) => string
}

const ENV_OPTIONS: { value: EndpointEnv; labelKey: string }[] = [
  { value: 'dev', labelKey: 'endpoints.dev' },
  { value: 'prodInternal', labelKey: 'endpoints.prodInternal' },
  { value: 'prodExternal', labelKey: 'endpoints.prodExternal' },
]

function EndpointRow({ label, url, active }: { label: string; url: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-[var(--glass-accent)]/8' : ''}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-green-500' : 'bg-[var(--glass-text-tertiary)]'}`} />
      <span className="text-xs font-medium text-[var(--glass-text-primary)] w-36 flex-shrink-0">{label}</span>
      <code className="text-[11px] text-[var(--glass-text-secondary)] font-mono break-all flex-1">{url}</code>
    </div>
  )
}

export function EndpointsSection({ settings, onUpdate, t }: Props) {
  const { endpoints } = INTERNAL_API_CONFIG

  return (
    <div className="space-y-4">
      {/* LLM Endpoints */}
      <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AppIcon name="brain" className="w-4 h-4 text-[var(--glass-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('section.llmEndpoints')}</h3>
            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('section.llmEndpointsDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('endpoints.activeEndpoint')}:</span>
            <select
              value={settings.activeLlmEndpoint}
              onChange={(e) => onUpdate({ activeLlmEndpoint: e.target.value as EndpointEnv })}
              className="glass-select-base text-xs px-2 py-1 cursor-pointer"
            >
              {ENV_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <EndpointRow label={t('endpoints.llmDev')} url={endpoints.llm.dev} active={settings.activeLlmEndpoint === 'dev'} />
          <EndpointRow label={t('endpoints.llmProdInternal')} url={endpoints.llm.prodInternal} active={settings.activeLlmEndpoint === 'prodInternal'} />
          <EndpointRow label={t('endpoints.llmProdExternal')} url={endpoints.llm.prodExternal} active={settings.activeLlmEndpoint === 'prodExternal'} />
        </div>
      </div>

      {/* Multimodal Endpoints */}
      <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AppIcon name="video" className="w-4 h-4 text-[var(--glass-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('section.multimodalEndpoints')}</h3>
            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('section.multimodalEndpointsDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--glass-text-tertiary)]">{t('endpoints.activeEndpoint')}:</span>
            <select
              value={settings.activeMultimodalEndpoint}
              onChange={(e) => onUpdate({ activeMultimodalEndpoint: e.target.value as EndpointEnv })}
              className="glass-select-base text-xs px-2 py-1 cursor-pointer"
            >
              {ENV_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          {/* Gateway bases */}
          <EndpointRow label={t('endpoints.dev')} url={endpoints.multimodal.dev} active={settings.activeMultimodalEndpoint === 'dev'} />
          <EndpointRow label={t('endpoints.multimodalProdInternal')} url={endpoints.multimodal.prodInternal} active={settings.activeMultimodalEndpoint === 'prodInternal'} />
          <EndpointRow label={t('endpoints.multimodalProdExternal')} url={endpoints.multimodal.prodExternal} active={settings.activeMultimodalEndpoint === 'prodExternal'} />

          {/* Task paths */}
          <div className="mt-3 pt-3 border-t border-[var(--glass-stroke-base)] space-y-1">
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="text-xs font-medium text-[var(--glass-text-primary)] w-36 flex-shrink-0">{t('endpoints.multimodalCreate')}</span>
              <code className="text-[11px] text-[var(--glass-text-secondary)] font-mono">{endpoints.multimodalTaskCreate}</code>
            </div>
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="text-xs font-medium text-[var(--glass-text-primary)] w-36 flex-shrink-0">{t('endpoints.multimodalQuery')}</span>
              <code className="text-[11px] text-[var(--glass-text-secondary)] font-mono">{endpoints.multimodalTaskQuery}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
