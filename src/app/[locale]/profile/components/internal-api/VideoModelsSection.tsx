'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { INTERNAL_API_CONFIG, type VideoModelSpec, type Sora2Param, type Wanx26Param } from './config'

interface Props {
  t: (key: string) => string
}

function isWanx26Param(p: Sora2Param | Wanx26Param): p is Wanx26Param {
  return 'nested' in p
}

function ParamTable({ params, t }: { params: (Sora2Param | Wanx26Param)[]; t: Props['t'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--glass-stroke-base)]">
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.paramName')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.paramType')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.paramRequired')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.paramDefault')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.paramDesc')}</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <ParamRow key={p.name} param={p} t={t} depth={0} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ParamRow({ param, t, depth }: { param: Sora2Param | Wanx26Param; t: Props['t']; depth: number }) {
  const nested = isWanx26Param(param) ? param.nested : undefined

  return (
    <>
      <tr className="border-b border-[var(--glass-stroke-base)]/50 hover:bg-[var(--glass-bg-muted)]/50">
        <td className="px-3 py-2 font-mono text-[var(--glass-text-primary)]" style={{ paddingLeft: `${12 + depth * 16}px` }}>
          {nested && <span className="text-[var(--glass-text-tertiary)] mr-1">-</span>}
          {param.name}
        </td>
        <td className="px-3 py-2 text-[var(--glass-accent)] font-mono">{param.type}</td>
        <td className="px-3 py-2">
          <span className={param.required ? 'text-red-400' : 'text-[var(--glass-text-tertiary)]'}>
            {param.required ? t('video.yes') : t('video.no')}
          </span>
        </td>
        <td className="px-3 py-2 text-[var(--glass-text-secondary)] font-mono">{param.default || '-'}</td>
        <td className="px-3 py-2 text-[var(--glass-text-secondary)] max-w-xs">
          <span className="line-clamp-2">{param.description}</span>
          {param.enum && (
            <div className="flex flex-wrap gap-1 mt-1">
              {param.enum.map((v) => (
                <span key={v} className="inline-block px-1.5 py-0.5 rounded bg-[var(--glass-bg-muted)] text-[10px] font-mono text-[var(--glass-text-tertiary)]">
                  {v}
                </span>
              ))}
            </div>
          )}
        </td>
      </tr>
      {nested?.map((child) => (
        <ParamRow key={`${param.name}.${child.name}`} param={child} t={t} depth={depth + 1} />
      ))}
    </>
  )
}

function ResponseTable({ fields, t }: { fields: { name: string; type: string; description: string }[]; t: Props['t'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--glass-stroke-base)]">
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.respName')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.respType')}</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--glass-text-tertiary)]">{t('video.respDesc')}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-b border-[var(--glass-stroke-base)]/50 hover:bg-[var(--glass-bg-muted)]/50">
              <td className="px-3 py-2 font-mono text-[var(--glass-text-primary)]">{f.name}</td>
              <td className="px-3 py-2 text-[var(--glass-accent)] font-mono">{f.type}</td>
              <td className="px-3 py-2 text-[var(--glass-text-secondary)] max-w-sm"><span className="line-clamp-2">{f.description}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VideoModelCard({ model, t, defaultOpen }: {
  model: VideoModelSpec
  t: Props['t']
  defaultOpen?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false)

  return (
    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--glass-bg-muted)]/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--glass-accent)]/10 flex items-center justify-center">
            <AppIcon name="film" className="w-4 h-4 text-[var(--glass-accent)]" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-[var(--glass-text-primary)]">{model.name}</h4>
            <p className="text-[11px] text-[var(--glass-text-tertiary)] mt-0.5">{model.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500">{model.method}</span>
          <AppIcon name={expanded ? 'chevronUp' : 'chevronDown'} className="w-4 h-4 text-[var(--glass-text-tertiary)]" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--glass-stroke-base)]">
          {/* API Path */}
          <div className="px-5 py-3 flex items-center gap-3 bg-[var(--glass-bg-muted)]/30">
            <span className="text-xs font-medium text-[var(--glass-text-tertiary)]">{t('video.apiPath')}:</span>
            <code className="text-xs font-mono text-[var(--glass-text-primary)]">{model.path}</code>
          </div>

          {/* Params */}
          <div className="px-5 py-3">
            <h5 className="text-xs font-semibold text-[var(--glass-text-primary)] mb-2">{t('video.params')}</h5>
            <ParamTable params={model.params} t={t} />
          </div>

          {/* Response */}
          <div className="px-5 py-3 border-t border-[var(--glass-stroke-base)]">
            <h5 className="text-xs font-semibold text-[var(--glass-text-primary)] mb-2">{t('video.response')}</h5>
            <ResponseTable fields={model.responseFields} t={t} />
          </div>
        </div>
      )}
    </div>
  )
}

export function VideoModelsSection({ t }: Props) {
  const { videoModels } = INTERNAL_API_CONFIG

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <AppIcon name="clapperboard" className="w-4 h-4 text-[var(--glass-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('section.videoModels')}</h3>
        <span className="text-xs text-[var(--glass-text-tertiary)]">{t('section.videoModelsDesc')}</span>
      </div>

      <VideoModelCard model={videoModels.sora2} t={t} defaultOpen />
      <VideoModelCard model={videoModels.wanx26} t={t} />
    </div>
  )
}
