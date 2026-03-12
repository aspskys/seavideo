import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { encryptApiKey } from '@/lib/crypto-utils'
import {
    SEAART_PROVIDER_ID,
    SEAART_PROVIDER_NAME,
    SEAART_GEMINI_MODELS,
    SEAART_IMAGE_MODELS,
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

    // Add image models
    for (const im of SEAART_IMAGE_MODELS) {
        models.push({
            modelId: im.modelId,
            modelKey: composeModelKey(SEAART_PROVIDER_ID, im.modelId),
            name: im.name,
            type: im.type,
            provider: SEAART_PROVIDER_ID,
            price: 0,
        })
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

    // Resolve default model keys for the entire workflow
    const firstEnabledGemini = SEAART_GEMINI_MODELS.find(gm => config.geminiModels[gm.modelId] !== false)
    const defaultLlmKey = firstEnabledGemini
        ? composeModelKey(SEAART_PROVIDER_ID, firstEnabledGemini.modelId)
        : null
    const defaultImageKey = SEAART_IMAGE_MODELS.length > 0
        ? composeModelKey(SEAART_PROVIDER_ID, SEAART_IMAGE_MODELS[0].modelId)
        : null
    const defaultVideoKey = SEAART_VIDEO_MODELS.length > 0
        ? composeModelKey(SEAART_PROVIDER_ID, SEAART_VIDEO_MODELS[0].modelId)
        : null

    // Build the default model preferences update
    const modelDefaults: Record<string, string | null> = {}
    if (defaultLlmKey) {
        modelDefaults.analysisModel = defaultLlmKey
    }
    if (defaultImageKey) {
        modelDefaults.characterModel = defaultImageKey
        modelDefaults.locationModel = defaultImageKey
        modelDefaults.storyboardModel = defaultImageKey
        modelDefaults.editModel = defaultImageKey
    }
    if (defaultVideoKey) {
        modelDefaults.videoModel = defaultVideoKey
    }

    // Save everything including default model selections
    await prisma.userPreference.upsert({
        where: { userId },
        create: {
            userId,
            customProviders: JSON.stringify(providers),
            customModels: JSON.stringify(models),
            internalApiConfig: JSON.stringify(config),
            ...modelDefaults,
        },
        update: {
            customProviders: JSON.stringify(providers),
            customModels: JSON.stringify(models),
            internalApiConfig: JSON.stringify(config),
            ...modelDefaults,
        },
    })

    // Sync all models into ALL user's existing projects
    const projectModelUpdate: Record<string, string | null> = {}
    if (defaultLlmKey) projectModelUpdate.analysisModel = defaultLlmKey
    if (defaultImageKey) {
        projectModelUpdate.characterModel = defaultImageKey
        projectModelUpdate.locationModel = defaultImageKey
        projectModelUpdate.storyboardModel = defaultImageKey
        projectModelUpdate.editModel = defaultImageKey
    }
    if (defaultVideoKey) projectModelUpdate.videoModel = defaultVideoKey

    if (Object.keys(projectModelUpdate).length > 0) {
        const userProjects = await prisma.project.findMany({
            where: { userId },
            select: { id: true },
        })
        if (userProjects.length > 0) {
            await prisma.novelPromotionProject.updateMany({
                where: { projectId: { in: userProjects.map(p => p.id) } },
                data: projectModelUpdate,
            })
        }
    }

    return NextResponse.json({
        success: true,
        syncedModels: models.filter(m => (m as { provider?: string }).provider === SEAART_PROVIDER_ID).length,
        syncedProvider: SEAART_PROVIDER_ID,
        defaultModels: modelDefaults,
        projectsSynced: true,
    })
})
