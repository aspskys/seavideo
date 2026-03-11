'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type InternalApiSettings } from './config'

interface Props {
  settings: InternalApiSettings
  onUpdate: (patch: Partial<InternalApiSettings>) => void
  t: (key: string) => string
}

export function AuthSection({ settings, onUpdate, t }: Props) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AppIcon name="lock" className="w-4 h-4 text-[var(--glass-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('section.auth')}</h3>
        <span className="text-xs text-[var(--glass-text-tertiary)]">{t('section.authDesc')}</span>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--glass-text-primary)]">
            {t('auth.apiKey')}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => onUpdate({ apiKey: e.target.value })}
              placeholder={t('auth.apiKeyPlaceholder')}
              className="glass-input-base w-full px-3 py-2.5 pr-10 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] cursor-pointer"
            >
              <AppIcon name={showKey ? 'eyeOff' : 'eye'} className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[var(--glass-text-tertiary)]">{t('auth.apiKeyHint')}</p>
        </div>

        {/* Project Code */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--glass-text-primary)]">
            {t('auth.projectCode')}
          </label>
          <input
            type="text"
            value={settings.projectCode}
            onChange={(e) => onUpdate({ projectCode: e.target.value })}
            placeholder={t('auth.projectCodePlaceholder')}
            className="glass-input-base w-full px-3 py-2.5 text-sm font-mono"
          />
          <p className="mt-1 text-[11px] text-[var(--glass-text-tertiary)]">{t('auth.projectCodeHint')}</p>
        </div>

        {/* Header Format Reference */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--glass-text-primary)]">
            {t('auth.headerFormat')}
          </label>
          <div className="glass-surface-elevated rounded-xl border border-[var(--glass-stroke-base)] overflow-hidden">
            <div className="px-3 py-2 bg-[var(--glass-bg-muted)] border-b border-[var(--glass-stroke-base)]">
              <span className="text-[11px] font-medium text-[var(--glass-text-tertiary)]">{t('auth.headerExample')}</span>
            </div>
            <div className="p-3 font-mono text-xs leading-relaxed text-[var(--glass-text-secondary)]">
              {INTERNAL_API_CONFIG.auth.headerFormat.map((h) => (
                <div key={h.header} className="flex gap-2">
                  <span className="text-[var(--glass-accent)]">--header</span>
                  <span>&apos;{h.header}: {
                    h.value
                      .replace('{API_KEY}', settings.apiKey || 'sa-xxxxx')
                      .replace('{PROJECT_CODE}', settings.projectCode || 'SeaLuca')
                      .replace('{REQUEST_ID}', 'auto-generated')
                  }&apos;</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
