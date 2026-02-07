import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

// CORS headers for mobile app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoachMessageRequest {
    messages: Array<{ role: string; content: string }>
    systemPrompt: string
    temperature?: number
    maxTokens?: number
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify user is authenticated
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client to verify the user
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Verify the user's JWT token
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Validate API key is configured
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured in Edge Function secrets')
            return new Response(
                JSON.stringify({ error: 'AI service not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const body: CoachMessageRequest = await req.json()
        const { messages, systemPrompt, temperature = 0.7, maxTokens = 4096 } = body

        if (!messages || !systemPrompt) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: messages, systemPrompt' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Build the Gemini request
        const geminiMessages = messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }))

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: geminiMessages,
                    generationConfig: {
                        temperature,
                        maxOutputTokens: maxTokens,
                    }
                })
            }
        )

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            console.error('Gemini API error:', errorText)
            return new Response(
                JSON.stringify({ error: 'AI service error', details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiData = await geminiResponse.json()

        // Extract the response text
        const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

        // Log usage for monitoring (optional)
        console.log(`Coach message for user ${user.id}: ${messages.length} messages, response: ${responseText.length} chars`)

        return new Response(
            JSON.stringify({
                response: responseText,
                usage: {
                    promptTokens: geminiData?.usageMetadata?.promptTokenCount || 0,
                    responseTokens: geminiData?.usageMetadata?.candidatesTokenCount || 0
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
