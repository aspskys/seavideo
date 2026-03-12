import { prisma } from '@/lib/prisma'

export const SEAART_PROVIDER_ID = 'seaart'
export const SEAART_PROVIDER_NAME = 'SeaArt Internal'

export type EndpointEnv = 'dev' | 'prodInternal' | 'prodExternal'

export interface SeaArtConfig {
    apiKey: string
    projectCode: string
    activeLlmEndpoint: EndpointEnv
    activeMultimodalEndpoint: EndpointEnv
    geminiModels: Record<string, boolean>
}

const LLM_ENDPOINTS: Record<EndpointEnv, string> = {
    dev: 'https://openresty-gateway.gpu-service.dev.seaart.dev/llm',
    prodInternal: 'http://openresty-gateway.api.production.private.seaart.dev/llm',
    prodExternal: 'https://openresty-gateway.api.seaart.ai/llm',
}

const MULTIMODAL_ENDPOINTS: Record<EndpointEnv, string> = {
    dev: 'https://openresty-gateway.gpu-service.dev.seaart.dev',
    prodInternal: 'http://openresty-gateway.api.production.private.seaart.dev',
    prodExternal: 'https://openresty-gateway.api.seaart.ai',
}

export const SEAART_GEMINI_MODELS = [
    { modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', type: 'llm' as const },
    { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', type: 'llm' as const },
    { modelId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', type: 'llm' as const },
    { modelId: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', type: 'llm' as const },
    { modelId: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', type: 'llm' as const },
]

export const SEAART_IMAGE_MODELS = [
    {
        modelId: 'google_gemini3_pro_image',
        name: 'Gemini 3 Pro Image',
        type: 'image' as const,
        apiPath: '/api/v1/google_gemini3_pro_image/generate',
    },
]

export const SEAART_VIDEO_MODELS = [
    { modelId: 'microsoft_sora2', name: 'Microsoft Sora2', type: 'video' as const, apiPath: '/api/v1/microsoft_sora2/generate' },
    { modelId: 'alibaba_wanx26_i2v', name: 'Alibaba Wanx2.6 I2V', type: 'video' as const, apiPath: '/api/v1/alibaba/alibaba_wanx26_i2v/generate' },
    { modelId: 'alibaba_wanx26_i2v_flash', name: 'Alibaba Wanx2.6 I2V Flash', type: 'video' as const, apiPath: '/api/v1/alibaba/alibaba_wanx26_i2v_flash/generate' },
]

const DEFAULT_CONFIG: SeaArtConfig = {
    apiKey: 'sa-WvAkejBEsAt86s7ARgV6CaB7i5RShK9njIMQWS00SXw',
    projectCode: 'SeaLuca',
    activeLlmEndpoint: 'dev',
    activeMultimodalEndpoint: 'dev',
    geminiModels: {
        'gemini-2.5-flash': true,
        'gemini-2.5-pro': true,
        'gemini-3-flash-preview': true,
        'gemini-3-pro-preview': true,
        'gemini-3.1-pro-preview': true,
    },
}

export async function getSeaArtConfig(userId: string): Promise<SeaArtConfig> {
    const pref = await prisma.userPreference.findUnique({
        where: { userId },
        select: { internalApiConfig: true },
    })

    if (!pref?.internalApiConfig) return DEFAULT_CONFIG

    try {
        const parsed = JSON.parse(pref.internalApiConfig) as Partial<SeaArtConfig>
        return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
        return DEFAULT_CONFIG
    }
}

export function getSeaArtLlmEndpoint(config: SeaArtConfig): string {
    return LLM_ENDPOINTS[config.activeLlmEndpoint] || LLM_ENDPOINTS.dev
}

export function getSeaArtMultimodalEndpoint(config: SeaArtConfig): string {
    return MULTIMODAL_ENDPOINTS[config.activeMultimodalEndpoint] || MULTIMODAL_ENDPOINTS.dev
}

export function buildSeaArtHeaders(config: SeaArtConfig, requestId?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Project': config.projectCode,
        'Content-Type': 'application/json',
    }
    if (requestId) {
        headers['X-Request-Id'] = requestId
    }
    return headers
}
