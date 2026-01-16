/**
 * Coach Knowledge Index
 * Exports all knowledge modules and provides intent detection
 */

import { CORE_COACH_PROMPT } from './core';
import { HYROX_KNOWLEDGE } from './hyrox';
import { CROSSFIT_KNOWLEDGE } from './crossfit';
import { RUNNING_KNOWLEDGE } from './running';
import { POWERLIFTING_KNOWLEDGE } from './powerlifting';
import { HYPERTROPHY_KNOWLEDGE } from './hypertrophy';
import { OLYMPIC_LIFTING_KNOWLEDGE } from './olympicLifting';
import { KETTLEBELL_KNOWLEDGE } from './kettlebell';
import { MOBILITY_KNOWLEDGE } from './mobility';
import { TRIATHLON_KNOWLEDGE } from './triathlon';
import { HYBRID_ATHLETE_KNOWLEDGE } from './hybridAthlete';

export type TrainingDomain =
    | 'hyrox'
    | 'crossfit'
    | 'running'
    | 'powerlifting'
    | 'hypertrophy'
    | 'olympic_lifting'
    | 'kettlebell'
    | 'mobility'
    | 'triathlon'
    | 'hybrid';

// Keyword mappings for intent detection
const INTENT_KEYWORDS: Record<TrainingDomain, string[]> = {
    hyrox: ['hyrox', 'skierg', 'sled push', 'sled pull', 'wall balls', 'farmer carry', 'sandbag', 'roxzone'],
    crossfit: ['crossfit', 'wod', 'metcon', 'amrap', 'emom', 'fran', 'grace', 'helen', 'murph', 'chipper', 'rx', 'kipping', 'butterfly pull', 'muscle up', 'comp', 'open'],
    running: ['running', 'run', 'marathon', 'half marathon', '5k', '10k', 'mile', 'tempo', 'intervals', 'mileage', 'pace', 'long run', 'sprint', 'jog', 'couch to'],
    powerlifting: ['powerlifting', 'squat', 'bench', 'deadlift', 'meet', 'total', 'peaking', '1rm', 'one rep max', 'sbd', 'competition lift', 'pause', 'sumo', 'conventional'],
    hypertrophy: ['hypertrophy', 'muscle', 'bodybuilding', 'mass', 'size', 'pump', 'aesthetic', 'bulk', 'gains', 'bicep', 'tricep', 'chest', 'back', 'shoulders', 'legs', 'split', 'ppl', 'bro split', 'arm day'],
    olympic_lifting: ['olympic', 'snatch', 'clean and jerk', 'clean & jerk', 'jerk', 'weightlifting', 'oly', 'c&j', 'overhead squat', 'front squat', 'hang', 'power clean', 'power snatch'],
    kettlebell: ['kettlebell', 'kb', 'swing', 'get up', 'getup', 'tgu', 'turkish', 'goblet', 'simple and sinister', 'rkc', 'strongfirst', 'pavel'],
    mobility: ['mobility', 'stretch', 'flexibility', 'foam roll', 'recovery', 'cars', 'frc', 'pails', 'rails', 'joint', 'range of motion', 'tight', 'stiff', 'deload', 'rest day'],
    triathlon: ['triathlon', 'swim', 'bike', 'cycle', 'cycling', 'brick', 'ironman', 'sprint tri', 'olympic tri', 'ftp', 'watts', 'zwift', 'trainer', 'pool', 'open water'],
    hybrid: ['hybrid', 'multi sport', 'all around', 'general fitness', 'well rounded', 'functional', 'overall', 'endurance and strength', 'strength and cardio', 'balanced']
};

// Map domains to their knowledge content
const KNOWLEDGE_MAP: Record<TrainingDomain, string> = {
    hyrox: HYROX_KNOWLEDGE,
    crossfit: CROSSFIT_KNOWLEDGE,
    running: RUNNING_KNOWLEDGE,
    powerlifting: POWERLIFTING_KNOWLEDGE,
    hypertrophy: HYPERTROPHY_KNOWLEDGE,
    olympic_lifting: OLYMPIC_LIFTING_KNOWLEDGE,
    kettlebell: KETTLEBELL_KNOWLEDGE,
    mobility: MOBILITY_KNOWLEDGE,
    triathlon: TRIATHLON_KNOWLEDGE,
    hybrid: HYBRID_ATHLETE_KNOWLEDGE,
};

/**
 * Detects training domains from user message
 * Returns array of detected domains (can be multiple)
 */
export function detectTrainingIntent(message: string): TrainingDomain[] {
    const lowerMessage = message.toLowerCase();
    const detectedDomains: TrainingDomain[] = [];

    for (const [domain, keywords] of Object.entries(INTENT_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                detectedDomains.push(domain as TrainingDomain);
                break; // Found match for this domain, move to next
            }
        }
    }

    return detectedDomains;
}

/**
 * Gets relevant knowledge sections based on detected intents
 * If no specific intents detected, returns hybrid athlete knowledge as fallback
 */
export function getRelevantKnowledge(intents: TrainingDomain[]): string {
    if (intents.length === 0) {
        // No specific intent - return general hybrid athlete guidance
        return HYBRID_ATHLETE_KNOWLEDGE;
    }

    // Return knowledge for all detected intents
    const knowledgeSections = intents.map(intent => KNOWLEDGE_MAP[intent]);
    return knowledgeSections.join('\n\n');
}

/**
 * Uses Gemini to classify training intent when keyword detection fails
 * This is a lightweight call just for classification
 */
export async function classifyIntentWithLLM(
    message: string,
    apiKey: string
): Promise<TrainingDomain[]> {
    const VALID_DOMAINS: TrainingDomain[] = [
        'hyrox', 'crossfit', 'running', 'powerlifting', 'hypertrophy',
        'olympic_lifting', 'kettlebell', 'mobility', 'triathlon', 'hybrid'
    ];

    const classificationPrompt = `You are a fitness intent classifier. Based on the user's message, identify which training domain(s) they are asking about.

Valid domains: ${VALID_DOMAINS.join(', ')}

Rules:
- Return ONLY a JSON array of matching domains, nothing else
- Return 1-3 most relevant domains
- If unclear or general fitness, return ["hybrid"]
- Examples:
  "I want bigger arms" → ["hypertrophy"]
  "Prepare me for a race" → ["running", "hyrox"]
  "Get stronger legs for skiing" → ["powerlifting", "hypertrophy"]

User message: "${message}"

Response (JSON array only):`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Low temperature for consistent classification
                        maxOutputTokens: 100,
                    }
                })
            }
        );

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '["hybrid"]';

        // Parse the JSON array response
        const parsed = JSON.parse(text.replace(/```json?\n?|\n?```/g, '').trim());

        // Validate domains
        const validDomains = parsed.filter((d: string) => VALID_DOMAINS.includes(d as TrainingDomain));
        return validDomains.length > 0 ? validDomains : ['hybrid'];
    } catch (error) {
        console.log('LLM classification failed, using hybrid fallback:', error);
        return ['hybrid'];
    }
}

/**
 * Builds the complete system prompt with core + relevant knowledge
 * SYNCHRONOUS version - uses keyword detection only (fast, no API call)
 */
export function buildDynamicPrompt(conversationHistory: string): string {
    const intents = detectTrainingIntent(conversationHistory);
    const relevantKnowledge = getRelevantKnowledge(intents);
    return CORE_COACH_PROMPT + '\n\n---\n\n' + relevantKnowledge;
}

/**
 * Builds the complete system prompt with core + relevant knowledge
 * ASYNC version - uses keyword detection first, falls back to LLM if no match
 * This is the recommended function for best intent detection
 */
export async function buildDynamicPromptAsync(
    conversationHistory: string,
    apiKey: string
): Promise<{ prompt: string; detectedIntents: TrainingDomain[]; usedLLM: boolean }> {
    // First, try keyword detection (instant, free)
    let intents = detectTrainingIntent(conversationHistory);
    let usedLLM = false;

    // If no keywords matched, use LLM classification
    if (intents.length === 0 && apiKey) {
        console.log('No keyword match, using LLM classification...');
        intents = await classifyIntentWithLLM(conversationHistory, apiKey);
        usedLLM = true;
    }

    // Fallback to hybrid if still nothing
    if (intents.length === 0) {
        intents = ['hybrid'];
    }

    const relevantKnowledge = getRelevantKnowledge(intents);
    const prompt = CORE_COACH_PROMPT + '\n\n---\n\n' + relevantKnowledge;

    return { prompt, detectedIntents: intents, usedLLM };
}

/**
 * Gets the core prompt (always needed)
 */
export function getCorePrompt(): string {
    return CORE_COACH_PROMPT;
}

/**
 * Gets all knowledge for a specific domain
 */
export function getKnowledgeForDomain(domain: TrainingDomain): string {
    return KNOWLEDGE_MAP[domain] || '';
}

// Re-export individual modules for direct access if needed
export {
    CORE_COACH_PROMPT,
    HYROX_KNOWLEDGE,
    CROSSFIT_KNOWLEDGE,
    RUNNING_KNOWLEDGE,
    POWERLIFTING_KNOWLEDGE,
    HYPERTROPHY_KNOWLEDGE,
    OLYMPIC_LIFTING_KNOWLEDGE,
    KETTLEBELL_KNOWLEDGE,
    MOBILITY_KNOWLEDGE,
    TRIATHLON_KNOWLEDGE,
    HYBRID_ATHLETE_KNOWLEDGE,
};
