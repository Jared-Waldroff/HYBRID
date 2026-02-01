// Badge definitions for achievements
// Badges can be automatic (detected by app) or manual (user adds)

export const BADGE_DEFINITIONS = {
    // ==========================================
    // AUTOMATIC BADGES - Detected from workouts
    // ==========================================

    // Strength achievements
    '1000lb_club': {
        id: '1000lb_club',
        name: '1000lb Club',
        emoji: '🏆',
        description: 'Squat + Bench + Deadlift totals 1000lbs or more',
        category: 'strength',
        automatic: true,
        checkFn: (stats) => {
            const total = (stats.squat1RM || 0) + (stats.bench1RM || 0) + (stats.deadlift1RM || 0)
            return total >= 1000
        }
    },
    '1500lb_club': {
        id: '1500lb_club',
        name: '1500lb Club',
        emoji: '💎',
        description: 'Squat + Bench + Deadlift totals 1500lbs or more',
        category: 'strength',
        automatic: true,
        checkFn: (stats) => {
            const total = (stats.squat1RM || 0) + (stats.bench1RM || 0) + (stats.deadlift1RM || 0)
            return total >= 1500
        }
    },
    'bodyweight_bench': {
        id: 'bodyweight_bench',
        name: 'Bodyweight Bench',
        emoji: '💪',
        description: 'Bench press your bodyweight',
        category: 'strength',
        automatic: true,
        checkFn: (stats) => stats.bench1RM >= (stats.bodyweight || 999)
    },
    'double_bodyweight_squat': {
        id: 'double_bodyweight_squat',
        name: '2x BW Squat',
        emoji: '🦵',
        description: 'Squat double your bodyweight',
        category: 'strength',
        automatic: true,
        checkFn: (stats) => stats.squat1RM >= (stats.bodyweight || 999) * 2
    },

    // Workout milestones
    'first_workout': {
        id: 'first_workout',
        name: 'First Steps',
        emoji: '👟',
        description: 'Complete your first workout',
        category: 'milestone',
        automatic: true,
        checkFn: (stats) => stats.totalWorkouts >= 1
    },
    '10_workouts': {
        id: '10_workouts',
        name: 'Getting Started',
        emoji: '🔟',
        description: 'Complete 10 workouts',
        category: 'milestone',
        automatic: true,
        checkFn: (stats) => stats.totalWorkouts >= 10
    },
    '50_workouts': {
        id: '50_workouts',
        name: 'Dedicated',
        emoji: '⭐',
        description: 'Complete 50 workouts',
        category: 'milestone',
        automatic: true,
        checkFn: (stats) => stats.totalWorkouts >= 50
    },
    '100_workouts': {
        id: '100_workouts',
        name: 'Century',
        emoji: '💯',
        description: 'Complete 100 workouts',
        category: 'milestone',
        automatic: true,
        checkFn: (stats) => stats.totalWorkouts >= 100
    },
    '365_workouts': {
        id: '365_workouts',
        name: 'Year of Iron',
        emoji: '🔥',
        description: 'Complete 365 workouts',
        category: 'milestone',
        automatic: true,
        checkFn: (stats) => stats.totalWorkouts >= 365
    },

    // ==========================================
    // RACE COMPLETION BADGES - Auto-detected from workout names
    // ==========================================
    'marathon_finisher': {
        id: 'marathon_finisher',
        name: 'Marathon Finisher',
        emoji: '🏃',
        description: 'Completed a marathon (26.2 miles)',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('marathon') && !name.includes('half') && workout.is_completed
        }
    },
    'half_marathon_finisher': {
        id: 'half_marathon_finisher',
        name: 'Half Marathon',
        emoji: '🏅',
        description: 'Completed a half marathon (13.1 miles)',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('half marathon') && workout.is_completed
        }
    },
    'hyrox_finisher': {
        id: 'hyrox_finisher',
        name: 'Hyrox Finisher',
        emoji: '🦾',
        description: 'Completed a Hyrox competition',
        category: 'competition',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('hyrox') && (name.includes('race') || name.includes('comp') || name.includes('event') || name.includes('finish')) && workout.is_completed
        }
    },
    'crossfit_comp': {
        id: 'crossfit_comp',
        name: 'CrossFit Competitor',
        emoji: '🏋️',
        description: 'Completed a CrossFit competition',
        category: 'competition',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('crossfit') && (name.includes('comp') || name.includes('open') || name.includes('games') || name.includes('throwdown')) && workout.is_completed
        }
    },
    'triathlon_finisher': {
        id: 'triathlon_finisher',
        name: 'Triathlete',
        emoji: '🏊',
        description: 'Completed a triathlon',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('triathlon') && workout.is_completed
        }
    },
    'ironman_finisher': {
        id: 'ironman_finisher',
        name: 'Ironman',
        emoji: '🦸',
        description: 'Completed an Ironman triathlon',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('ironman') && workout.is_completed
        }
    },
    'century_ride': {
        id: 'century_ride',
        name: 'Century Rider',
        emoji: '🚴',
        description: 'Completed a 100-mile bike ride',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return (name.includes('century') || name.includes('100 mile') || name.includes('100mi')) && workout.is_completed
        }
    },
    '5k_finisher': {
        id: '5k_finisher',
        name: '5K Runner',
        emoji: '🏃‍♂️',
        description: 'Completed a 5K race',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('5k') && (name.includes('race') || name.includes('run')) && workout.is_completed
        }
    },
    '10k_finisher': {
        id: '10k_finisher',
        name: '10K Runner',
        emoji: '🏃‍♀️',
        description: 'Completed a 10K race',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('10k') && workout.is_completed
        }
    },
    'ultra_finisher': {
        id: 'ultra_finisher',
        name: 'Ultra Runner',
        emoji: '🏔️',
        description: 'Completed an ultramarathon (50K+)',
        category: 'endurance',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return (name.includes('ultra') || name.includes('50k') || name.includes('100k') || name.includes('50 mile') || name.includes('100 mile')) && workout.is_completed
        }
    },
    'spartan_finisher': {
        id: 'spartan_finisher',
        name: 'Spartan Warrior',
        emoji: '⚔️',
        description: 'Completed a Spartan Race',
        category: 'competition',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('spartan') && workout.is_completed
        }
    },
    'tough_mudder': {
        id: 'tough_mudder',
        name: 'Tough Mudder',
        emoji: '💪',
        description: 'Completed a Tough Mudder',
        category: 'competition',
        automatic: true,
        detectFromWorkout: (workout) => {
            const name = workout.name?.toLowerCase() || ''
            return name.includes('tough mudder') && workout.is_completed
        }
    },

    // ==========================================
    // MANUAL BADGES - User adds these
    // ==========================================
    'powerlifting_meet': {
        id: 'powerlifting_meet',
        name: 'Powerlifter',
        emoji: '🏋️‍♂️',
        description: 'Competed in a powerlifting meet',
        category: 'competition',
        automatic: false
    },
    'weightlifting_meet': {
        id: 'weightlifting_meet',
        name: 'Weightlifter',
        emoji: '🏋️‍♀️',
        description: 'Competed in an Olympic weightlifting meet',
        category: 'competition',
        automatic: false
    },
    'bodybuilding_show': {
        id: 'bodybuilding_show',
        name: 'Bodybuilder',
        emoji: '💪',
        description: 'Competed in a bodybuilding show',
        category: 'competition',
        automatic: false
    },
    'swim_race': {
        id: 'swim_race',
        name: 'Open Water Swimmer',
        emoji: '🏊‍♂️',
        description: 'Completed an open water swim race',
        category: 'endurance',
        automatic: false
    },
    'rowing_race': {
        id: 'rowing_race',
        name: 'Rower',
        emoji: '🚣',
        description: 'Competed in a rowing event',
        category: 'competition',
        automatic: false
    },
    'personal_best': {
        id: 'personal_best',
        name: 'PR Crusher',
        emoji: '📈',
        description: 'Set a new personal record',
        category: 'milestone',
        automatic: false
    },
    'injury_comeback': {
        id: 'injury_comeback',
        name: 'Comeback Kid',
        emoji: '🦴',
        description: 'Returned from injury stronger',
        category: 'milestone',
        automatic: false
    },
    'morning_warrior': {
        id: 'morning_warrior',
        name: 'Morning Warrior',
        emoji: '🌅',
        description: 'Early bird who gets the workout in before dawn',
        category: 'milestone',
        automatic: false
    }
}

// Get all badges organized by category
export function getBadgesByCategory() {
    const categories = {}
    Object.values(BADGE_DEFINITIONS).forEach(badge => {
        if (!categories[badge.category]) {
            categories[badge.category] = []
        }
        categories[badge.category].push(badge)
    })
    return categories
}

// Get only manual (user-addable) badges
export function getManualBadges() {
    return Object.values(BADGE_DEFINITIONS).filter(b => !b.automatic)
}

// Get only automatic badges
export function getAutomaticBadges() {
    return Object.values(BADGE_DEFINITIONS).filter(b => b.automatic)
}

// Check if a workout triggers any race badges
export function checkWorkoutForBadges(workout) {
    const earnedBadges = []

    Object.values(BADGE_DEFINITIONS).forEach(badge => {
        const b = badge as any
        if (b.detectFromWorkout && b.detectFromWorkout(workout)) {
            earnedBadges.push(b.id)
        }
    })

    return earnedBadges
}

// Check milestone badges based on stats
export function checkStatBadges(stats) {
    const earnedBadges = []

    Object.values(BADGE_DEFINITIONS).forEach(badge => {
        const b = badge as any
        if (b.checkFn && b.checkFn(stats)) {
            earnedBadges.push(b.id)
        }
    })

    return earnedBadges
}

