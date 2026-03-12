import { logInfo, logError, logWarn } from '@/lib/logging/core'
import type { SeaArtConfig } from './config'
import { getSeaArtMultimodalEndpoint, buildSeaArtHeaders, SEAART_VIDEO_MODELS } from './config'

export interface SeaArtVideoResult {
    status: 'in_queue' | 'processing' | 'done' | 'failed'
    taskId?: string
    videoUrl?: string
    error?: { code: string; message: string }
    usage?: Record<string, unknown>
    metadata?: Record<string, unknown>
}

interface SeaArtVideoTaskResponse {
    id?: string
    status?: string
    error?: { code?: string | number; message?: string; error_message?: string }
    output?: Array<{
        content?: Array<{ url?: string; jobId?: string; type?: string }>
        metadata?: Record<string, unknown>
    }>
    usage?: Record<string, unknown>
}

export interface Sora2GenerateParams {
    prompt: string
    size?: string
    seconds?: number
    input_reference?: string
}

export interface Wanx26GenerateParams {
    input: {
        prompt?: string
        img_url: string
        audio_url?: string
    }
    parameters?: {
        resolution?: string
        duration?: number
        prompt_extend?: boolean
        watermark?: boolean
        audio?: boolean
        shot_type?: string
        negative_prompt?: string
        seed?: number
    }
}

const VALID_SORA2_SECONDS = new Set([4, 8, 12])

function normalizeSora2Seconds(seconds?: number): number {
    if (seconds && VALID_SORA2_SECONDS.has(seconds)) return seconds
    if (seconds && seconds <= 6) return 4
    if (seconds && seconds <= 10) return 8
    return 4
}

/**
 * SeaArt 视频生成 — 通过通用多模态网关 /model/v1/generation
 *
 * 请求格式（已验证可用）：
 *   { moderation: true, model: "xxx", input: [{ params: { ...模型原生参数 } }] }
 */
export async function generateSeaArtVideo(input: {
    config: SeaArtConfig
    modelId: string
    params: Sora2GenerateParams | Wanx26GenerateParams
}): Promise<SeaArtVideoResult> {
    const { config, modelId, params } = input
    const gateway = getSeaArtMultimodalEndpoint(config)
    const modelSpec = SEAART_VIDEO_MODELS.find(m => m.modelId === modelId)

    if (!modelSpec) {
        return { status: 'failed', error: { code: 'MODEL_NOT_FOUND', message: `Unknown video model: ${modelId}` } }
    }

    let innerParams = params
    if ('prompt' in params && 'seconds' in params) {
        innerParams = { ...params, seconds: normalizeSora2Seconds(params.seconds) }
    }

    const url = `${gateway}/model/v1/generation`
    const headers = buildSeaArtHeaders(config, crypto.randomUUID())

    const body = {
        moderation: true,
        model: modelId,
        input: [{ params: innerParams }],
    }

    logInfo(`[SeaArt Video] POST ${url} model=${modelId}`)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            logError(`[SeaArt Video] HTTP ${res.status}: ${text.slice(0, 300)}`)
            return { status: 'failed', error: { code: `HTTP_${res.status}`, message: text.slice(0, 200) } }
        }

        let data: Record<string, unknown>
        try {
            data = await res.json()
        } catch {
            logError('[SeaArt Video] Non-JSON response')
            return { status: 'failed', error: { code: 'PARSE_ERROR', message: 'Non-JSON response' } }
        }

        const taskData = data as SeaArtVideoTaskResponse
        const taskId = taskData.id

        if (taskData.error && taskData.status === 'failed') {
            return {
                status: 'failed',
                error: {
                    code: String(taskData.error.code || 'UNKNOWN'),
                    message: taskData.error.error_message || taskData.error.message || 'Task error',
                },
            }
        }

        logInfo(`[SeaArt Video] Task created: ${taskId || 'unknown'}, status=${taskData.status}`)

        // 快速任务：POST 响应已包含完成结果
        if (taskData.status === 'completed' || taskData.status === 'done') {
            const videoUrl = extractVideoUrl(taskData)
            if (videoUrl) {
                logInfo(`[SeaArt Video] Instant result: ${videoUrl.slice(0, 80)}...`)
                return { status: 'done', taskId, videoUrl, usage: taskData.usage }
            }
        }

        if (taskId) {
            return { status: 'in_queue', taskId }
        }

        return extractVideoResult(taskData)
    } catch (err) {
        return {
            status: 'failed',
            error: { code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : 'Network error' },
        }
    }
}

function extractVideoUrl(data: SeaArtVideoTaskResponse): string | null {
    if (!data.output?.length) return null
    for (const item of data.output) {
        if (!item.content?.length) continue
        const videoItem = item.content.find(c => c.type === 'video' && c.url)
        if (videoItem?.url) return videoItem.url
    }
    return null
}

function extractVideoResult(data: SeaArtVideoTaskResponse): SeaArtVideoResult {
    const videoUrl = extractVideoUrl(data)
    if (videoUrl) {
        return {
            status: 'done',
            videoUrl,
            taskId: data.id,
            usage: data.usage,
        }
    }
    if (data.id) {
        return { status: 'in_queue', taskId: data.id }
    }
    return { status: 'failed', error: { code: 'NO_OUTPUT', message: 'No video in response' } }
}

export async function pollSeaArtVideoTask(input: {
    config: SeaArtConfig
    taskId: string
}): Promise<SeaArtVideoResult> {
    const { config, taskId } = input
    const gateway = getSeaArtMultimodalEndpoint(config)
    const url = `${gateway}/model/v1/generation/task/${taskId}`
    const headers = buildSeaArtHeaders(config, crypto.randomUUID())

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(30000),
        })

        if (!res.ok) {
            const errBody = await res.text().catch(() => '')
            logWarn(`[SeaArt Video] Poll HTTP ${res.status} for task ${taskId}: ${errBody.slice(0, 200)}`)
            return {
                status: (res.status >= 500) ? 'processing' : 'failed',
                taskId,
                error: { code: `HTTP_${res.status}`, message: errBody.slice(0, 200) },
            }
        }

        let data: SeaArtVideoTaskResponse
        try {
            data = await res.json()
        } catch {
            logWarn(`[SeaArt Video] Poll non-JSON for task ${taskId}`)
            return { status: 'processing', taskId }
        }

        logInfo(`[SeaArt Video] Poll task=${taskId} status=${data.status}`)

        if (data.status === 'failed') {
            return {
                status: 'failed',
                error: {
                    code: String(data.error?.code || 'UNKNOWN'),
                    message: data.error?.message || data.error?.error_message || 'Task failed',
                },
            }
        }

        if (data.status === 'completed' || data.status === 'done') {
            const videoUrl = extractVideoUrl(data)
            if (videoUrl) {
                logInfo(`[SeaArt Video] Task ${taskId} completed: ${videoUrl.slice(0, 80)}...`)
                return { status: 'done', videoUrl, taskId, usage: data.usage }
            }
            return { status: 'done', taskId, usage: data.usage }
        }

        return {
            status: (data.status === 'in_progress' || data.status === 'processing') ? 'processing' : 'in_queue',
            taskId,
            usage: data.usage,
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Poll failed'
        logWarn(`[SeaArt Video] Poll error for task ${taskId}: ${msg}`)
        return {
            status: 'failed',
            error: { code: 'NETWORK_ERROR', message: msg },
        }
    }
}
