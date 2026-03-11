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

interface Sora2GenerateParams {
    prompt: string
    size?: string
    seconds?: number
    input_reference?: string
}

interface Wanx26GenerateParams {
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

    const url = `${gateway}${modelSpec.apiPath}`
    const headers = buildSeaArtHeaders(config, crypto.randomUUID())

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(60000),
        })

        const data = await res.json()

        if (data.error && data.error.code) {
            return {
                status: 'failed',
                error: { code: String(data.error.code), message: data.error.error_message || data.error.message || 'Generation failed' },
            }
        }

        const output = data.output
        if (output?.content?.[0]?.url) {
            return {
                status: 'done',
                videoUrl: output.content[0].url,
                taskId: output.content[0].jobId,
                usage: data.usage,
                metadata: output.metadata,
            }
        }

        if (output?.status === 'in_queue' || output?.status === 'processing') {
            return {
                status: output.status,
                taskId: output.content?.[0]?.jobId,
                usage: data.usage,
            }
        }

        return {
            status: 'done',
            taskId: data.output?.content?.[0]?.jobId,
            videoUrl: data.output?.content?.[0]?.url,
            usage: data.usage,
            metadata: data.output?.metadata,
        }
    } catch (err) {
        return {
            status: 'failed',
            error: { code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : 'Network error' },
        }
    }
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

        const data = await res.json()

        if (data.error?.code) {
            return {
                status: 'failed',
                error: { code: String(data.error.code), message: data.error.message || 'Task query failed' },
            }
        }

        const output = data.output
        if (output?.status === 'done' && output?.content?.[0]?.url) {
            return {
                status: 'done',
                videoUrl: output.content[0].url,
                taskId: output.content[0].jobId || taskId,
                usage: data.usage,
                metadata: output.metadata,
            }
        }

        return {
            status: output?.status || 'processing',
            taskId,
            usage: data.usage,
        }
    } catch (err) {
        return {
            status: 'failed',
            error: { code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : 'Poll failed' },
        }
    }
}
