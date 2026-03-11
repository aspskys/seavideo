import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { encryptApiKey } from '@/lib/crypto-utils'
import {
    SEAART_PROVIDER_ID,
    SEAART_PROVIDER_NAME,
    SEAART_GEMINI_MODELS,
    SEAART_VIDEO_MODELS,
    type SeaArtConfig,
} from '@/lib/providers/seaart/config'

function composeModelKey(provider: string, modelId: string): string {
    return `${provider}::${modelId}`
}

/**
 * GET - Read internal API config
 */
export const GET = apiHandler(async () => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const userId = authResult.session.user.id

    const pref = await prisma.userPreference.findUnique({
        where: { userId },
        select: { internalApiConfig: true },
    })

    if (!pref?.internalApiConfig) {
        return NextResponse.json({ configured: false, config: null })
    }

    try {
        const config = JSON.parse(pref.internalApiConfig) as SeaArtConfig
        return NextResponse.json({
            configured: true,
            config: {
                ...config,
                apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : '',
            },
        })
    } catch {
        return NextResponse.json({ configured: false, config: null })
    }
})

/**
 * PUT - Save internal API config and sync to user providers/models
 */
export const PUT = apiHandler(async (request: NextRequest) => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const userId = authResult.session.user.id

    const body = await request.json().catch(() => ({})) as Partial<SeaArtConfig>

    if (!body.apiKey || !body.projectCode) {
        return NextResponse.json({ success: false, error: 'apiKey and projectCode are required' }, { status: 400 })
    }

    const config: SeaArtConfig = {
        apiKey: body.apiKey,
        projectCode: body.projectCode,
        activeLlmEndpoint: body.activeLlmEndpoint || 'dev',
        activeMultimodalEndpoint: body.activeMultimodalEndpoint || 'dev',
        geminiModels: body.geminiModels || {},
    }

    // Read current user preferences
    const pref = await prisma.userPreference.findUnique({
        where: { userId },
        select: { customProviders: true, customModels: true },
    })

    // Parse existing providers and models
    let providers: Record<string, unknown>[] = []
    let models: Record<string, unknown>[] = []
    try { providers = pref?.customProviders ? JSON.parse(pref.customProviders) : [] } catch { providers = [] }
    try { models = pref?.customModels ? JSON.parse(pref.customModels) : [] } catch { models = [] }
    if (!Array.isArray(providers)) providers = []
    if (!Array.isArray(models)) models = []

    // Remove existing seaart provider/models
    providers = providers.filter(p => (p as { id?: string }).id !== SEAART_PROVIDER_ID)
    models = models.filter(m => (m as { provider?: string }).provider !== SEAART_PROVIDER_ID)

    // Add seaart provider
    providers.push({
        id: SEAART_PROVIDER_ID,
        name: SEAART_PROVIDER_NAME,
        apiKey: encryptApiKey(config.apiKey),
        baseUrl: undefined,
        hidden: false,
    })

    // Add enabled Gemini LLM models
    for (const gm of SEAART_GEMINI_MODELS) {
        if (config.geminiModels[gm.modelId] !== false) {
            models.push({
                modelId: gm.modelId,
                modelKey: composeModelKey(SEAART_PROVIDER_ID, gm.modelId),
                name: gm.name,
                type: gm.type,
                provider: SEAART_PROVIDER_ID,
                price: 0,
            })
        }
    }

    // Add video models
    for (const vm of SEAART_VIDEO_MODELS) {
        models.push({
            modelId: vm.modelId,
            modelKey: composeModelKey(SEAART_PROVIDER_ID, vm.modelId),
            name: vm.name,
            type: vm.type,
            provider: SEAART_PROVIDER_ID,
            price: 0,
        })
    }

    // Save everything
    await prisma.userPreference.upsert({
        where: { userId },
        create: {
            userId,
            customProviders: JSON.stringify(providers),
            customModels: JSON.stringify(models),
            internalApiConfig: JSON.stringify(config),
        },
        update: {
            customProviders: JSON.stringify(providers),
            customModels: JSON.stringify(models),
            internalApiConfig: JSON.stringify(config),
        },
    })

    return NextResponse.json({
        success: true,
        syncedModels: models.filter(m => (m as { provider?: string }).provider === SEAART_PROVIDER_ID).length,
        syncedProvider: SEAART_PROVIDER_ID,
    })
})
