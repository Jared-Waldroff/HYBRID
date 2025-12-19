// CrossFit Open Workouts Database (2017-2025)
// Each workout contains the official description and format

export const CROSSFIT_OPEN_WORKOUTS = [
    // 2025 Workouts
    {
        id: '25.1',
        year: 2025,
        name: '25.1',
        subtitle: 'Couplet + Lunge',
        format: '15-minute AMRAP',
        description: `3 Lateral Burpees over Dumbbell
3 Dumbbell Hang Clean-to-Overheads (50/35 lb)
30-foot Walking Lunge

Add 3 reps to the Burpees and Clean-to-Overheads each round. Lunges stay at 30 ft.`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '25.2',
        year: 2025,
        name: '25.2',
        subtitle: 'Repeat of 22.3',
        format: 'For Time (12-minute cap)',
        description: `21 Pull-ups
42 Double-unders
21 Thrusters (95/65 lb)

18 Chest-to-bar Pull-ups
36 Double-unders
18 Thrusters (115/75 lb)

15 Bar Muscle-ups
30 Double-unders
15 Thrusters (135/85 lb)`,
        rxWeights: { male: '95/115/135 lb', female: '65/75/85 lb' }
    },
    {
        id: '25.3',
        year: 2025,
        name: '25.3',
        subtitle: 'The Trap',
        format: 'For Time (20-minute cap)',
        description: `5 Wall Walks
50-cal Row
5 Wall Walks
25 Deadlifts (225/155 lb)
5 Wall Walks
25 Cleans (135/85 lb)
5 Wall Walks
25 Snatches (95/65 lb)
5 Wall Walks
50-cal Row`,
        rxWeights: { male: '225/135/95 lb', female: '155/85/65 lb' }
    },

    // 2024 Workouts
    {
        id: '24.1',
        year: 2024,
        name: '24.1',
        subtitle: 'Snatch & Burpee Sprint',
        format: 'For Time (15-minute cap)',
        description: `21 DB Snatches, arm 1 (50/35 lb)
21 Lateral Burpees over DB
21 DB Snatches, arm 2
21 Lateral Burpees over DB
15 DB Snatches, arm 1
15 Lateral Burpees over DB
15 DB Snatches, arm 2
15 Lateral Burpees over DB
9 DB Snatches, arm 1
9 Lateral Burpees over DB
9 DB Snatches, arm 2
9 Lateral Burpees over DB`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '24.2',
        year: 2024,
        name: '24.2',
        subtitle: 'The Grinder',
        format: '20-minute AMRAP',
        description: `300-meter Row
10 Deadlifts (185/125 lb)
50 Double-unders`,
        rxWeights: { male: '185 lb', female: '125 lb' }
    },
    {
        id: '24.3',
        year: 2024,
        name: '24.3',
        subtitle: 'Thruster & Gymnastics Intervals',
        format: 'For Time (15-minute cap)',
        description: `5 Rounds of:
  10 Thrusters (95/65 lb)
  10 Chest-to-bar Pull-ups

Rest 1 minute

5 Rounds of:
  7 Thrusters (135/95 lb)
  7 Bar Muscle-ups`,
        rxWeights: { male: '95/135 lb', female: '65/95 lb' }
    },

    // 2023 Workouts
    {
        id: '23.1',
        year: 2023,
        name: '23.1',
        subtitle: 'Repeat of 14.4',
        format: '14-minute AMRAP',
        description: `60-cal Row
50 Toes-to-bars
40 Wall-ball Shots (20/14 lb)
30 Cleans (135/95 lb)
20 Ring Muscle-ups`,
        rxWeights: { male: '135 lb / 20 lb WB', female: '95 lb / 14 lb WB' }
    },
    {
        id: '23.2',
        year: 2023,
        name: '23.2',
        subtitle: 'Burpee Pull-ups + Max Thruster',
        format: '15-minute AMRAP + 5-minute window',
        description: `PART A (15-minute AMRAP):
5 Burpee Pull-ups
10 Shuttle Runs (1 rep = 50 ft total)
Add 5 Burpee Pull-ups after each round of Shuttle Runs.

PART B (Immediately following):
5 minutes to establish a 1-rep-max Thruster`,
        rxWeights: { male: 'Bodyweight + Max Load', female: 'Bodyweight + Max Load' }
    },
    {
        id: '23.3',
        year: 2023,
        name: '23.3',
        subtitle: 'Wall Walks & Snatch Windows',
        format: 'Intervals (6 min + 3 min extensions)',
        description: `5 Wall Walks
50 Double-unders
15 Snatches (95/65 lb)

5 Wall Walks
50 Double-unders
12 Snatches (135/95 lb)

If completed, time extends. Weights increase to 185/125 and 225/155, reps drop to 9 and 6.`,
        rxWeights: { male: '95/135/185/225 lb', female: '65/95/125/155 lb' }
    },

    // 2022 Workouts
    {
        id: '22.1',
        year: 2022,
        name: '22.1',
        subtitle: 'Wall Walk & Box Jump AMRAP',
        format: '15-minute AMRAP',
        description: `3 Wall Walks
12 Dumbbell Snatches (50/35 lb)
15 Box Jump-overs (24/20 in)`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '22.2',
        year: 2022,
        name: '22.2',
        subtitle: 'Deadlift & Burpee Pyramid',
        format: 'For Time (10-minute cap)',
        description: `1-2-3-4-5-6-7-8-9-10-9-8-7-6-5-4-3-2-1 Reps of:
  Deadlifts (225/155 lb)
  Bar-facing Burpees`,
        rxWeights: { male: '225 lb', female: '155 lb' }
    },
    {
        id: '22.3',
        year: 2022,
        name: '22.3',
        subtitle: 'Ascending Thrusters & Pull-ups',
        format: 'For Time (12-minute cap)',
        description: `21 Pull-ups
42 Double-unders
21 Thrusters (95/65 lb)

18 Chest-to-bar Pull-ups
36 Double-unders
18 Thrusters (115/75 lb)

15 Bar Muscle-ups
30 Double-unders
15 Thrusters (135/85 lb)`,
        rxWeights: { male: '95/115/135 lb', female: '65/75/85 lb' }
    },

    // 2021 Workouts
    {
        id: '21.1',
        year: 2021,
        name: '21.1',
        subtitle: 'Wall Walk Debut',
        format: 'For Time (15-minute cap)',
        description: `1 Wall Walk, 10 Double-unders
3 Wall Walks, 30 Double-unders
6 Wall Walks, 60 Double-unders
9 Wall Walks, 90 Double-unders
15 Wall Walks, 150 Double-unders
21 Wall Walks, 210 Double-unders`,
        rxWeights: { male: 'Bodyweight', female: 'Bodyweight' }
    },
    {
        id: '21.2',
        year: 2021,
        name: '21.2',
        subtitle: 'Repeat of 17.1',
        format: 'For Time (20-minute cap)',
        description: `10 DB Snatches (50/35 lb)
15 Burpee Box Jump-overs (24/20 in)
20 DB Snatches
15 Burpee Box Jump-overs
30 DB Snatches
15 Burpee Box Jump-overs
40 DB Snatches
15 Burpee Box Jump-overs
50 DB Snatches
15 Burpee Box Jump-overs`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '21.3/21.4',
        year: 2021,
        name: '21.3/21.4',
        subtitle: 'Complex Finale',
        format: 'For Time (15-min cap) + 7-minute window',
        description: `PART A - 21.3 (For Time, 15-minute cap):
15 Front Squats (95/65 lb)
30 Toes-to-bars
15 Thrusters (95/65 lb)
Rest 1 minute
15 Front Squats
30 Chest-to-bar Pull-ups
15 Thrusters
Rest 1 minute
15 Front Squats
30 Bar Muscle-ups
15 Thrusters

PART B - 21.4 (Immediately following):
7 minutes to find max load of:
1 Deadlift + 1 Clean + 1 Hang Clean + 1 Jerk`,
        rxWeights: { male: '95 lb + Max Load', female: '65 lb + Max Load' }
    },

    // 2020 Workouts
    {
        id: '20.1',
        year: 2020,
        name: '20.1',
        subtitle: 'Ground to Overhead & Burpees',
        format: '10 Rounds For Time (15-minute cap)',
        description: `8 Ground-to-Overheads (95/65 lb)
10 Bar-facing Burpees`,
        rxWeights: { male: '95 lb', female: '65 lb' }
    },
    {
        id: '20.2',
        year: 2020,
        name: '20.2',
        subtitle: 'Thruster & T2B AMRAP',
        format: '20-minute AMRAP',
        description: `4 Dumbbell Thrusters (50/35 lb)
6 Toes-to-bars
24 Double-unders`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '20.3',
        year: 2020,
        name: '20.3',
        subtitle: 'Diane Plus',
        format: 'For Time (9-minute cap)',
        description: `21 Deadlifts (225/155 lb)
21 Handstand Push-ups
15 Deadlifts
15 Handstand Push-ups
9 Deadlifts
9 Handstand Push-ups

21 Deadlifts (315/205 lb)
50-ft Handstand Walk
15 Deadlifts
50-ft Handstand Walk
9 Deadlifts
50-ft Handstand Walk`,
        rxWeights: { male: '225/315 lb', female: '155/205 lb' }
    },
    {
        id: '20.4',
        year: 2020,
        name: '20.4',
        subtitle: 'The Pistol & Heavy Clean Chipper',
        format: 'For Time (20-minute cap)',
        description: `30 Box Jumps (24/20 in)
15 Clean and Jerks (95/65 lb)
30 Box Jumps
15 Clean and Jerks (135/85 lb)
30 Box Jumps
10 Clean and Jerks (185/115 lb)
30 Pistols
10 Clean and Jerks (225/145 lb)
30 Pistols
5 Clean and Jerks (275/175 lb)
30 Pistols
5 Clean and Jerks (315/205 lb)`,
        rxWeights: { male: '95-315 lb', female: '65-205 lb' }
    },
    {
        id: '20.5',
        year: 2020,
        name: '20.5',
        subtitle: 'Muscle-up & Wall-ball Chipper',
        format: 'For Time (20-minute cap)',
        description: `40 Ring Muscle-ups
80-cal Row
120 Wall-ball Shots (20/14 lb)

Partition any way.`,
        rxWeights: { male: '20 lb WB', female: '14 lb WB' }
    },

    // 2019 Workouts
    {
        id: '19.1',
        year: 2019,
        name: '19.1',
        subtitle: 'The Engine Builder',
        format: '15-minute AMRAP',
        description: `19 Wall-ball Shots (20/14 lb)
19-cal Row`,
        rxWeights: { male: '20 lb WB', female: '14 lb WB' }
    },
    {
        id: '19.2',
        year: 2019,
        name: '19.2',
        subtitle: 'Clean Ladder',
        format: 'Intervals (8 min + 4 min extensions)',
        description: `25 Toes-to-bars
50 Double-unders
15 Squat Cleans (135/85 lb)

25 Toes-to-bars
50 Double-unders
13 Squat Cleans (185/115 lb)

Continue with 225/145, 275/175, 315/205 lb...
Reps decrease: 11, 9, 7`,
        rxWeights: { male: '135-315 lb', female: '85-205 lb' }
    },
    {
        id: '19.3',
        year: 2019,
        name: '19.3',
        subtitle: 'Strict Gymnastics & Lunge',
        format: 'For Time (10-minute cap)',
        description: `200-ft Dumbbell Overhead Lunge (50/35 lb)
50 Dumbbell Box Step-ups (24/20 in)
50 Strict Handstand Push-ups
200-ft Handstand Walk`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '19.4',
        year: 2019,
        name: '19.4',
        subtitle: 'Snatch/Burpee & Bar MU Sprint',
        format: 'For Time (12-minute cap)',
        description: `3 Rounds of:
  10 Snatches (95/65 lb)
  12 Bar-facing Burpees

Rest 3 minutes

3 Rounds of:
  10 Bar Muscle-ups
  12 Bar-facing Burpees`,
        rxWeights: { male: '95 lb', female: '65 lb' }
    },
    {
        id: '19.5',
        year: 2019,
        name: '19.5',
        subtitle: 'Thruster & CTB Burner',
        format: 'For Time (20-minute cap)',
        description: `33-27-21-15-9 Reps of:
  Thrusters (95/65 lb)
  Chest-to-bar Pull-ups`,
        rxWeights: { male: '95 lb', female: '65 lb' }
    },

    // 2018 Workouts
    {
        id: '18.1',
        year: 2018,
        name: '18.1',
        subtitle: 'The Rowing AMRAP',
        format: '20-minute AMRAP',
        description: `8 Toes-to-bars
10 Dumbbell Hang Clean and Jerks (50/35 lb)
14/12-cal Row`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '18.2',
        year: 2018,
        name: '18.2',
        subtitle: 'Squat Sprint',
        format: 'For Time (12-minute cap for both parts)',
        description: `1-2-3-4-5-6-7-8-9-10 Reps of:
  Dumbbell Squats (50/35 lb pairs)
  Bar-facing Burpees

Immediately following:
Establish a 1-rep-max Clean`,
        rxWeights: { male: '50 lb DB pair', female: '35 lb DB pair' }
    },
    {
        id: '18.3',
        year: 2018,
        name: '18.3',
        subtitle: 'Double-Under Gymnastics Chipper',
        format: 'For Time (14-minute cap)',
        description: `2 Rounds of:
  100 Double-unders
  20 Overhead Squats (115/80 lb)
  100 Double-unders
  12 Ring Muscle-ups
  100 Double-unders
  20 Dumbbell Snatches (50/35 lb)
  100 Double-unders
  12 Bar Muscle-ups`,
        rxWeights: { male: '115 lb / 50 lb DB', female: '80 lb / 35 lb DB' }
    },
    {
        id: '18.4',
        year: 2018,
        name: '18.4',
        subtitle: 'Diane & Heavy Walk',
        format: 'For Time (9-minute cap)',
        description: `21-15-9 Reps of:
  Deadlifts (225/155 lb)
  Handstand Push-ups

21-15-9 Reps of:
  Deadlifts (315/205 lb)
  50-ft Handstand Walk`,
        rxWeights: { male: '225/315 lb', female: '155/205 lb' }
    },
    {
        id: '18.5',
        year: 2018,
        name: '18.5',
        subtitle: 'Repeat of 11.6',
        format: '7-minute AMRAP',
        description: `3 Thrusters (100/65 lb)
3 Chest-to-bar Pull-ups
6 Thrusters
6 Chest-to-bar Pull-ups
9 Thrusters
9 Chest-to-bar Pull-ups

Continue adding 3 reps each round.`,
        rxWeights: { male: '100 lb', female: '65 lb' }
    },

    // 2017 Workouts
    {
        id: '17.1',
        year: 2017,
        name: '17.1',
        subtitle: 'Snatches & Burpee Box Jumps',
        format: 'For Time (20-minute cap)',
        description: `10 Dumbbell Snatches (50/35 lb)
15 Burpee Box Jump-overs (24/20 in)
20 Dumbbell Snatches
15 Burpee Box Jump-overs
30 Dumbbell Snatches
15 Burpee Box Jump-overs
40 Dumbbell Snatches
15 Burpee Box Jump-overs
50 Dumbbell Snatches
15 Burpee Box Jump-overs`,
        rxWeights: { male: '50 lb DB', female: '35 lb DB' }
    },
    {
        id: '17.2',
        year: 2017,
        name: '17.2',
        subtitle: 'Lunges & Muscle-ups',
        format: '12-minute AMRAP',
        description: `2 Rounds of:
  50-ft Dumbbell Walking Lunge (50/35 lb pairs)
  16 Toes-to-bars
  8 Power Cleans (50/35 lb pairs)

2 Rounds of:
  50-ft Dumbbell Walking Lunge
  16 Bar Muscle-ups
  8 Power Cleans`,
        rxWeights: { male: '50 lb DB pair', female: '35 lb DB pair' }
    },
    {
        id: '17.3',
        year: 2017,
        name: '17.3',
        subtitle: 'Squat Snatch Ladder',
        format: 'Intervals (8 min + 4 min extensions)',
        description: `3 Rounds: 6 Chest-to-bar Pull-ups, 6 Squat Snatches (95/65 lb)
3 Rounds: 7 Chest-to-bar Pull-ups, 5 Squat Snatches (135/95 lb)
3 Rounds: 8 Chest-to-bar Pull-ups, 4 Squat Snatches (185/135 lb)
3 Rounds: 9 Chest-to-bar Pull-ups, 3 Squat Snatches (225/155 lb)
3 Rounds: 10 Chest-to-bar Pull-ups, 2 Squat Snatches (245/175 lb)
3 Rounds: 11 Chest-to-bar Pull-ups, 1 Squat Snatch (265/185 lb)`,
        rxWeights: { male: '95-265 lb', female: '65-185 lb' }
    },
    {
        id: '17.4',
        year: 2017,
        name: '17.4',
        subtitle: 'Repeat of 16.4',
        format: '13-minute AMRAP',
        description: `55 Deadlifts (225/155 lb)
55 Wall-ball Shots (20/14 lb)
55-cal Row
55 Handstand Push-ups`,
        rxWeights: { male: '225 lb / 20 lb WB', female: '155 lb / 14 lb WB' }
    },
    {
        id: '17.5',
        year: 2017,
        name: '17.5',
        subtitle: 'Thrusters & Double-unders',
        format: '10 Rounds For Time (40-minute cap)',
        description: `9 Thrusters (95/65 lb)
35 Double-unders`,
        rxWeights: { male: '95 lb', female: '65 lb' }
    }
]

// Get a random CrossFit Open workout
export function getRandomCrossFitWorkout() {
    const index = Math.floor(Math.random() * CROSSFIT_OPEN_WORKOUTS.length)
    return CROSSFIT_OPEN_WORKOUTS[index]
}

// Get workouts by year
export function getCrossFitWorkoutsByYear(year) {
    return CROSSFIT_OPEN_WORKOUTS.filter(w => w.year === year)
}
