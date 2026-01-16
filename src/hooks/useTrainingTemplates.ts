import { useState, useEffect } from 'react';
import { TRAINING_TEMPLATES } from '../data/trainingTemplates';
// import { supabase } from '../lib/supabaseClient'; // No longer needed for templates

export interface TrainingTemplate {
    id: string;
    name: string;
    sport: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    duration_weeks: number;
    days_per_week: number;
    description: string;
    target_event: string | null;
    equipment_needed: string[];
    phases: {
        phases: Array<{
            name: string;
            weeks: number[];
            focus: string;
        }>;
    };
    weekly_template: {
        days: Array<{
            day: string;
            type: string;
            focus: string;
            duration_min: number;
        }>;
    };
    instructions: string | null;
}

interface UseTrainingTemplatesReturn {
    templates: TrainingTemplate[];
    isLoading: boolean;
    error: string | null;
    getTemplatesBySport: (sport: string) => TrainingTemplate[];
    getTemplatesByDifficulty: (difficulty: string) => TrainingTemplate[];
    getTemplateForContext: (sport?: string, difficulty?: string) => TrainingTemplate | null;
    formatTemplatesForAI: (limit?: number) => string;
}

export const useTrainingTemplates = (): UseTrainingTemplatesReturn => {
    const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load local templates immediately
        setTemplates(TRAINING_TEMPLATES);
        setIsLoading(false);
    }, []);

    // Kept for interface compatibility but no longer fetches from DB
    const fetchTemplates = async () => {
        setTemplates(TRAINING_TEMPLATES);
        setIsLoading(false);
    };

    const getTemplatesBySport = (sport: string): TrainingTemplate[] => {
        return templates.filter(t => t.sport.toLowerCase() === sport.toLowerCase());
    };

    const getTemplatesByDifficulty = (difficulty: string): TrainingTemplate[] => {
        return templates.filter(t => t.difficulty.toLowerCase() === difficulty.toLowerCase());
    };

    const getTemplateForContext = (sport?: string, difficulty?: string): TrainingTemplate | null => {
        let filtered = templates;

        if (sport) {
            filtered = filtered.filter(t => t.sport.toLowerCase() === sport.toLowerCase());
        }

        if (difficulty) {
            filtered = filtered.filter(t => t.difficulty.toLowerCase() === difficulty.toLowerCase());
        }

        return filtered[0] || null;
    };

    /**
     * Formats templates into a string for AI context injection
     * Returns a concise summary that fits within token limits
     */
    const formatTemplatesForAI = (limit: number = 5): string => {
        if (templates.length === 0) {
            return 'No training templates available in database.';
        }

        const selectedTemplates = templates.slice(0, limit);

        const formatted = selectedTemplates.map(t => {
            const weeklyDays = t.weekly_template?.days?.map(d => d.day).join(', ') || 'Varies';
            return `- **${t.name}** (${t.sport}, ${t.difficulty}, ${t.duration_weeks} weeks)
  ${t.description}
  Days: ${weeklyDays}
  ${t.target_event ? `Target: ${t.target_event}` : ''}`;
        }).join('\n');

        return `**Available Training Templates (reference these for structure):**\n${formatted}`;
    };

    return {
        templates,
        isLoading,
        error,
        getTemplatesBySport,
        getTemplatesByDifficulty,
        getTemplateForContext,
        formatTemplatesForAI,
    };
};
