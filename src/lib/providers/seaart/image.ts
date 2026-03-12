import { logInfo, logError, logWarn } from '@/lib/logging/core'
import type { SeaArtConfig } from './config'
import { getSeaArtMultimodalEndpoint, buildSeaArtHeaders, SEAART_IMAGE_MODELS } from './config'
import type { GenerateResult } from '@/lib/generators/base'

const MAX_POLL_ATTEMPTS = 90
const POLL_INTERVAL_MS = 3000
const CREATE_TIMEOUT_MS = 60_000
const POLL_TIMEOUT_MS = 15_000

interface SeaArtTaskResponse {
    id: string
    status: string
    error?: { code?: string | number; message?: string }
    output?: Array<{
        content?: Array<{ type?: string; url?: string; jobId?: string }>
        metadata?: Record<string, unknown>
    }>
    metadata?: {
        completed_at?: number
        in_queue_at?: number
        upload_at?: number
    }
    usage?: Record<string, unknown>
}

/**
 * SeaArt 图片生成 — 通过通用多模态网关 /model/v1/generation
 *
 * 请求格式（已验证可用）：
 *   { moderation: true, model: "xxx", input: [{ params: { ...模型原生参数 } }] }
 *
 * 工作流：
 *   1. POST /model/v1/generation 创建任务
 *   2. 如果 POST 响应已含 output → 直接返回（快速任务）
 *   3. 否则 GET /model/v1/generation/task/{id} 轮询直到完成
 */
export async function generateSeaArtImage(input: {
    config: SeaArtConfig
    modelId: string
    prompt: string
    referenceImages?: string[]
    options?: {
        aspectRatio?: string
        resolution?: string
        size?: string
    }
}): Promise<GenerateResult> {
    const { config, modelId, prompt, referenceImages, options } = input

    const modelSpec = SEAART_IMAGE_MODELS.find(m => m.modelId === modelId)
    if (!modelSpec) {
        return { success: false, error: `Unknown SeaArt image model: ${modelId}` }
    }

    const gateway = getSeaArtMultimodalEndpoint(config)
    const aspectRatio = options?.aspectRatio || sizeToAspectRatio(options?.size)
    const resolution = normalizeResolution(options?.resolution)

    return await createTaskAndPoll(gateway, config, modelId, prompt, referenceImages, aspectRatio, resolution)
}

function extractImageUrl(data: SeaArtTaskResponse): string | null {
    if (!data.output?.length) return null
    for (const output of data.output) {
        if (!output.content) continue
        for (const item of output.content) {
            if ((item.type === 'image' || !item.type) && item.url) {
                return item.url
            }
        }
    }
    return null
}

async function createTaskAndPoll(
    gateway: string,
    config: SeaArtConfig,
    modelId: string,
    prompt: string,
    referenceImages?: string[],
    aspectRatio?: string,
    resolution?: string,
): Promise<GenerateResult> {
    const url = `${gateway}/model/v1/generation`
    const headers = buildSeaArtHeaders(config, crypto.randomUUID())

    const innerParams: Record<string, unknown> = {
        prompt: prompt.slice(0, 2500),
        response_modalities: 'Image',
    }

    if (referenceImages?.length) {
        innerParams.image_urls = referenceImages.slice(0, 4)
    }
    if (aspectRatio && VALID_ASPECT_RATIOS.has(aspectRatio)) {
        innerParams.aspect_ratio = aspectRatio
    }
    if (resolution) {
        innerParams.resolution = resolution
    }

    const body = {
        moderation: true,
        model: modelId,
        input: [{ params: innerParams }],
    }

    logInfo(`[SeaArt Image] POST ${url} model=${modelId} ratio=${aspectRatio || 'default'} res=${resolution || 'default'}`)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            logError(`[SeaArt Image] HTTP ${res.status}: ${text.slice(0, 300)}`)
            return { success: false, error: `SeaArt image API returned ${res.status}: ${text.slice(0, 200)}` }
        }

        let data: SeaArtTaskResponse
        try {
            data = await res.json()
        } catch {
            logError('[SeaArt Image] Non-JSON response')
            return { success: false, error: 'SeaArt image API returned non-JSON response' }
        }

        const taskId = data.id
        if (!taskId) {
            logError('[SeaArt Image] No task ID in response', data)
            return { success: false, error: 'SeaArt returned no task ID' }
        }

        logInfo(`[SeaArt Image] Task created: ${taskId}, status=${data.status}`)

        if (data.error && data.status === 'failed') {
            return { success: false, error: `SeaArt task error: ${data.error.message || data.error.code}` }
        }

        // 快速任务：POST 响应已包含完成结果
        if (data.status === 'completed' || data.status === 'done') {
            const imageUrl = extractImageUrl(data)
            if (imageUrl) {
                logInfo(`[SeaArt Image] Instant result: ${imageUrl.slice(0, 80)}...`)
                return { success: true, imageUrl }
            }
        }

        return await pollTaskResult(gateway, config, taskId)
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        logError(`[SeaArt Image] Request failed: ${msg}`)
        return { success: false, error: `SeaArt image request failed: ${msg}` }
    }
}

async function pollTaskResult(
    gateway: string,
    config: SeaArtConfig,
    taskId: string,
): Promise<GenerateResult> {
    const url = `${gateway}/model/v1/generation/task/${taskId}`

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS)

        try {
            const headers = buildSeaArtHeaders(config, crypto.randomUUID())
            const res = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
            })

            if (!res.ok) {
                const errBody = await res.text().catch(() => '')
                logWarn(`[SeaArt Image] Poll HTTP ${res.status} for task ${taskId}: ${errBody.slice(0, 200)}`)
                continue
            }

            let data: SeaArtTaskResponse
            try {
                data = await res.json()
            } catch {
                logWarn(`[SeaArt Image] Poll ${attempt + 1}: non-JSON response`)
                continue
            }

            logInfo(`[SeaArt Image] Poll ${attempt + 1}/${MAX_POLL_ATTEMPTS}: task=${taskId} status=${data.status}`)

            if (data.status === 'failed') {
                const errMsg = data.error?.message || 'Task failed'
                const errCode = data.error?.code || 'UNKNOWN'
                logError(`[SeaArt Image] Task ${taskId} failed: ${errCode} ${errMsg}`)
                return { success: false, error: `SeaArt image task failed (${errCode}): ${errMsg}` }
            }

            if (data.status === 'completed' || data.status === 'done') {
                const imageUrl = extractImageUrl(data)
                if (imageUrl) {
                    logInfo(`[SeaArt Image] Task ${taskId} completed: ${imageUrl.slice(0, 80)}...`)
                    return { success: true, imageUrl }
                }
                logError(`[SeaArt Image] Task ${taskId} completed but output has no image URL`, JSON.stringify(data.output).slice(0, 300))
                return { success: false, error: 'SeaArt task completed but returned no image' }
            }

            // 其他状态 (pending, in_progress, queued 等) 继续轮询
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logWarn(`[SeaArt Image] Poll error (attempt ${attempt + 1}): ${msg}`)
        }
    }

    return { success: false, error: `SeaArt image task ${taskId} timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s` }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const VALID_ASPECT_RATIOS = new Set([
    '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9',
])

function sizeToAspectRatio(size?: string): string | undefined {
    if (!size) return undefined
    const mapping: Record<string, string> = {
        '1024x1024': '1:1',
        '1792x1024': '16:9',
        '1024x1792': '9:16',
        '1536x1024': '3:2',
        '1024x1536': '2:3',
        '1365x1024': '4:3',
        '1024x1365': '3:4',
    }
    return mapping[size.trim()]
}

function normalizeResolution(res?: string): string | undefined {
    if (!res) return undefined
    const upper = res.toUpperCase().replace(/\s/g, '')
    if (['1K', '2K', '4K'].includes(upper)) return upper
    if (upper === '720P' || upper === '1080P') return '1K'
    if (upper === '2160P' || upper === '4K') return '4K'
    return '1K'
}
