import { useState, useCallback, useRef } from 'react'
import { model, HYBRID_COACH_SYSTEM_PROMPT } from '../lib/geminiClient'

export function useGoalChat() {
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [workoutPlan, setWorkoutPlan] = useState(null)
    const [pendingCommands, setPendingCommands] = useState([])
    const chatRef = useRef(null)
    const contextRef = useRef({ workouts: [], profile: null })

    // Update context with current workouts and profile
    const updateContext = useCallback((workouts, profile) => {
        contextRef.current = { workouts, profile }
    }, [])

    // Build context string for AI
    const buildContextString = useCallback(() => {
        const { workouts, profile } = contextRef.current
        const lines = []

        // Add profile context
        if (profile) {
            lines.push('=== ATHLETE PROFILE ===')
            if (profile.primary_goal) lines.push(`Goal: ${profile.primary_goal}`)
            if (profile.fitness_level) lines.push(`Level: ${profile.fitness_level}`)
            if (profile.sleep_hours_avg) lines.push(`Sleep: ${profile.sleep_hours_avg}h (${profile.sleep_quality || 'unknown'})`)
            if (profile.work_physical_demand) lines.push(`Work demand: ${profile.work_physical_demand}`)
            if (profile.stress_level) lines.push(`Stress: ${profile.stress_level}`)
            lines.push('')
        }

        // Add current week's workouts
        if (workouts && workouts.length > 0) {
            lines.push('=== CURRENT SCHEDULE ===')
            workouts.forEach(w => {
                const exerciseNames = w.workout_exercises?.map(we => we.exercise?.name).filter(Boolean).join(', ') || 'No exercises'
                const status = w.is_completed ? '✓' : '○'
                lines.push(`${status} ${w.scheduled_date} - ${w.name} (${exerciseNames})`)
                lines.push(`  ID: ${w.id}`)
            })
            lines.push('')
        } else {
            lines.push('=== CURRENT SCHEDULE ===')
            lines.push('No workouts scheduled.')
            lines.push('')
        }

        return lines.join('\n')
    }, [])

    // Initialize chat session with context
    const initializeChat = useCallback(() => {
        const contextString = buildContextString()

        chatRef.current = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: `${HYBRID_COACH_SYSTEM_PROMPT}\n\nHere is my current training context:\n${contextString}` }]
                },
                {
                    role: 'model',
                    parts: [{ text: "I understand my role as your Hybrid Athlete Coach. I have access to your current schedule and profile, and I'm ready to help you optimize your training. Let me know what you'd like to work on." }]
                }
            ]
        })
    }, [buildContextString])

    // Parse JSON commands from AI response
    const parseCommands = (text) => {
        const commands = []

        // Find all JSON blocks
        const jsonMatches = text.matchAll(/```json\s*([\s\S]*?)\s*```/g)

        for (const match of jsonMatches) {
            try {
                const parsed = JSON.parse(match[1])

                // Check for various command types
                if (parsed.action) {
                    commands.push(parsed)
                } else if (parsed.plan_ready && parsed.workouts) {
                    // Legacy workout plan format
                    commands.push({ action: 'CREATE_PLAN', ...parsed })
                }
            } catch (e) {
                console.error('Failed to parse JSON command:', e)
            }
        }

        return commands
    }

    // Parse workout plan from AI response (legacy support)
    const parseWorkoutPlan = (text) => {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
            try {
                const plan = JSON.parse(jsonMatch[1])
                if (plan.plan_ready && plan.workouts) {
                    return plan
                }
            } catch (e) {
                console.error('Failed to parse workout plan JSON:', e)
            }
        }
        return null
    }

    // Clean response text for display
    const cleanResponseText = (text, hasCommands) => {
        // Remove JSON blocks from display
        let displayText = text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim()

        // If only JSON was in response, provide confirmation
        if (!displayText && hasCommands) {
            displayText = "I've prepared changes based on our discussion. You can review them below."
        }

        return displayText
    }

    // Send message to AI
    const sendMessage = useCallback(async (userMessage) => {
        if (!userMessage.trim()) return

        // Initialize chat on first message
        if (!chatRef.current) {
            initializeChat()
        }

        // Add user message to state
        const newUserMessage = { role: 'user', content: userMessage }
        setMessages(prev => [...prev, newUserMessage])
        setIsLoading(true)
        setError(null)

        try {
            const result = await chatRef.current.sendMessage(userMessage)
            const responseText = result.response.text()

            // Parse commands from response
            const commands = parseCommands(responseText)

            // Check for legacy workout plan
            const plan = parseWorkoutPlan(responseText)
            if (plan) {
                setWorkoutPlan(plan)
            }

            // Store pending commands for execution
            if (commands.length > 0) {
                setPendingCommands(commands)
            }

            // Clean response for display
            const displayText = cleanResponseText(responseText, commands.length > 0 || plan)

            // Add AI response to state
            if (displayText) {
                const aiMessage = { role: 'assistant', content: displayText }
                setMessages(prev => [...prev, aiMessage])
            }

        } catch (err) {
            console.error('Error sending message:', err)
            setError(err.message || 'Failed to get response from AI')
            // Remove the user message if we failed
            setMessages(prev => prev.slice(0, -1))
        } finally {
            setIsLoading(false)
        }
    }, [initializeChat])

    // Start a new conversation
    const startNewChat = useCallback(() => {
        chatRef.current = null
        setMessages([])
        setWorkoutPlan(null)
        setPendingCommands([])
        setError(null)
    }, [])

    // Get the initial greeting with context
    const getInitialGreeting = useCallback(async () => {
        if (messages.length > 0) return

        initializeChat()
        setIsLoading(true)

        try {
            const { workouts, profile } = contextRef.current
            const hasSchedule = workouts && workouts.length > 0
            const hasProfile = profile && profile.primary_goal

            let greeting
            if (hasSchedule && hasProfile) {
                greeting = `Looking at your schedule, I can see you have ${workouts.length} workouts planned. As your hybrid coach, I'll help you optimize your training for ${profile.primary_goal}. What would you like to work on today?`
            } else if (hasSchedule) {
                greeting = `I can see you have ${workouts.length} workouts on your schedule. Before I can give you the best coaching, I'd like to learn more about you. What's your primary training goal right now?`
            } else if (hasProfile) {
                greeting = `Welcome back! I remember you're working towards ${profile.primary_goal}. Your schedule looks empty - ready to build out your training plan?`
            } else {
                greeting = `Hey! I'm your Hybrid Athlete Coach - I specialize in helping athletes who train both strength and endurance. Before we start programming, I need to understand your goals. What are you training for?`
            }

            setMessages([
                { role: 'assistant', content: greeting }
            ])
        } catch (err) {
            console.error('Error getting greeting:', err)
            setError(err.message || 'Failed to start conversation')
        } finally {
            setIsLoading(false)
        }
    }, [messages.length, initializeChat])

    // Clear pending commands after execution
    const clearCommands = useCallback(() => {
        setPendingCommands([])
    }, [])

    return {
        messages: messages.filter(m => !m.hidden),
        isLoading,
        error,
        workoutPlan,
        pendingCommands,
        sendMessage,
        startNewChat,
        getInitialGreeting,
        updateContext,
        clearPlan: () => setWorkoutPlan(null),
        clearCommands
    }
}
