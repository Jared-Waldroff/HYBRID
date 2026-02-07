/**
 * Secure AI Coach Client
 * 
 * Calls the coach-message Edge Function instead of directly calling Gemini API.
 * This keeps the API key server-side and adds user authentication.
 */

import { supabase } from './supabaseClient';

interface CoachMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface CoachResponse {
    response: string;
    usage?: {
        promptTokens: number;
        responseTokens: number;
    };
    error?: string;
}

/**
 * Send a message to the AI coach via secure Edge Function
 */
export async function sendCoachMessage(
    messages: CoachMessage[],
    systemPrompt: string,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<CoachResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('coach-message', {
            body: {
                messages,
                systemPrompt,
                temperature: options?.temperature ?? 0.7,
                maxTokens: options?.maxTokens ?? 4096,
            },
        });

        if (error) {
            console.error('Edge function error:', error);
            return { response: '', error: error.message };
        }

        if (data?.error) {
            console.error('Coach API error:', data.error);
            return { response: '', error: data.error };
        }

        return {
            response: data?.response || '',
            usage: data?.usage,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Coach message failed:', message);
        return { response: '', error: message };
    }
}

/**
 * Stream a message to the AI coach (for future implementation)
 * Currently returns the full response after completion
 */
export async function streamCoachMessage(
    messages: CoachMessage[],
    systemPrompt: string,
    onChunk: (chunk: string) => void,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<void> {
    // For now, just get the full response and call onChunk once
    // Future: implement actual streaming via SSE
    const result = await sendCoachMessage(messages, systemPrompt, options);

    if (result.error) {
        throw new Error(result.error);
    }

    onChunk(result.response);
}
