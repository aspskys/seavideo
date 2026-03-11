import OpenAI from 'openai'
import type { SeaArtConfig } from './config'
import { getSeaArtLlmEndpoint } from './config'

export async function completeSeaArtLlm(input: {
    modelId: string
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
    config: SeaArtConfig
    temperature?: number
}): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const { modelId, messages, config, temperature = 0.7 } = input
    const endpoint = getSeaArtLlmEndpoint(config)

    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: `${endpoint}/v1`,
        defaultHeaders: {
            'X-Project': config.projectCode,
        },
    })

    return client.chat.completions.create({
        model: modelId,
        messages,
        temperature,
    }) as Promise<OpenAI.Chat.Completions.ChatCompletion>
}

export async function streamSeaArtLlm(input: {
    modelId: string
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
    config: SeaArtConfig
    temperature?: number
}): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { modelId, messages, config, temperature = 0.7 } = input
    const endpoint = getSeaArtLlmEndpoint(config)

    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: `${endpoint}/v1`,
        defaultHeaders: {
            'X-Project': config.projectCode,
        },
    })

    return client.chat.completions.create({
        model: modelId,
        messages,
        temperature,
        stream: true,
    }) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
}
