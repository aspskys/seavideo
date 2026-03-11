import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'

export const POST = apiHandler(async (request: NextRequest) => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json().catch(() => ({}))
    const { apiKey, projectCode, endpoint } = body as {
        apiKey?: string
        projectCode?: string
        endpoint?: string
    }

    if (!apiKey || !projectCode || !endpoint) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const results: { step: string; status: 'pass' | 'fail'; message: string; detail?: string }[] = []

    // Step 1: Test LLM endpoint - list models
    try {
        const llmRes = await fetch(`${endpoint}/v1/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Project': projectCode,
            },
            signal: AbortSignal.timeout(15000),
        })

        if (llmRes.ok) {
            const data = await llmRes.json().catch(() => ({}))
            const modelCount = Array.isArray(data?.data) ? data.data.length : 0
            results.push({ step: 'llm_models', status: 'pass', message: `${modelCount} models available` })
        } else {
            const text = await llmRes.text().catch(() => '')
            results.push({ step: 'llm_models', status: 'fail', message: `HTTP ${llmRes.status}`, detail: text.slice(0, 200) })
        }
    } catch (err) {
        results.push({ step: 'llm_models', status: 'fail', message: err instanceof Error ? err.message : 'Connection failed' })
    }

    // Step 2: Test LLM chat completion with a simple prompt
    try {
        const chatRes = await fetch(`${endpoint}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Project': projectCode,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                messages: [{ role: 'user', content: 'Hello, respond with just "ok"' }],
                max_tokens: 10,
            }),
            signal: AbortSignal.timeout(30000),
        })

        if (chatRes.ok) {
            const data = await chatRes.json().catch(() => ({}))
            const content = data?.choices?.[0]?.message?.content || ''
            results.push({ step: 'llm_chat', status: 'pass', message: `Response: ${content.slice(0, 50)}` })
        } else {
            const text = await chatRes.text().catch(() => '')
            results.push({ step: 'llm_chat', status: 'fail', message: `HTTP ${chatRes.status}`, detail: text.slice(0, 200) })
        }
    } catch (err) {
        results.push({ step: 'llm_chat', status: 'fail', message: err instanceof Error ? err.message : 'Chat test failed' })
    }

    const allPassed = results.every(r => r.status === 'pass')

    return NextResponse.json({
        success: allPassed,
        results,
    })
})
