-- Add description column to exercises table if it doesn't exist
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;

-- Update default exercises with descriptions
-- This SQL updates the seeded exercises with helpful form tips and notes

-- Chest exercises
UPDATE exercises SET description = 'Start with barbell at chest level, press up while keeping core tight and feet flat on the floor. Lower with control.' WHERE name = 'Bench Press' AND is_default = true;
UPDATE exercises SET description = 'Similar to flat bench but on an incline of 30-45 degrees. Targets upper chest more effectively.' WHERE name = 'Incline Bench Press' AND is_default = true;
UPDATE exercises SET description = 'Works lower chest. Keep controlled movement and avoid going too heavy to protect shoulders.' WHERE name = 'Decline Bench Press' AND is_default = true;
UPDATE exercises SET description = 'Allows greater range of motion than barbell. Keep palms facing each other at the top.' WHERE name = 'Dumbbell Bench Press' AND is_default = true;
UPDATE exercises SET description = 'Lie on bench, extend arms above chest, lower dumbbells in an arc. Great stretch for chest.' WHERE name = 'Dumbbell Fly' AND is_default = true;
UPDATE exercises SET description = 'Adjust the cables to upper position. Step forward and press down in a hugging motion.' WHERE name = 'Cable Crossover' AND is_default = true;
UPDATE exercises SET description = 'Compound movement. Keep elbows at 45 degrees to protect shoulders. Full range of motion.' WHERE name = 'Push-up' AND is_default = true;
UPDATE exercises SET description = 'Lean forward at the bottom for more chest activation. Keep controlled tempo.' WHERE name = 'Dips' AND is_default = true;

-- Back exercises
UPDATE exercises SET description = 'Hinge at hips, pull bar to lower chest. Keep back straight and squeeze shoulder blades.' WHERE name = 'Barbell Row' AND is_default = true;
UPDATE exercises SET description = 'Support one knee on bench. Pull dumbbell to hip while keeping back flat.' WHERE name = 'Dumbbell Row' AND is_default = true;
UPDATE exercises SET description = 'Wide grip for lats, narrow grip for middle back. Pull to chest, not behind neck.' WHERE name = 'Lat Pulldown' AND is_default = true;
UPDATE exercises SET description = 'Grip bar, retract shoulder blades, pull until chin clears bar. Control the descent.' WHERE name = 'Pull-up' AND is_default = true;
UPDATE exercises SET description = 'Underhand grip pull-up. More bicep involvement. Keep core engaged throughout.' WHERE name = 'Chin-up' AND is_default = true;
UPDATE exercises SET description = 'Pull cable attachment to lower sternum. Keep chest up and squeeze at contraction.' WHERE name = 'Seated Cable Row' AND is_default = true;
UPDATE exercises SET description = 'Keep arms straight, pull bar down in an arc. Focus on lat contraction.' WHERE name = 'Straight-Arm Pulldown' AND is_default = true;
UPDATE exercises SET description = 'One of the best overall back builders. Keep bar close to body, maintain neutral spine.' WHERE name = 'Deadlift' AND is_default = true;
UPDATE exercises SET description = 'Chest-supported to reduce lower back strain. Great for isolating upper back.' WHERE name = 'T-Bar Row' AND is_default = true;
UPDATE exercises SET description = 'Set bench to 30-45 degrees, lie face down. Row dumbbells while squeezing shoulder blades.' WHERE name = 'Incline Dumbbell Row' AND is_default = true;

-- Shoulder exercises  
UPDATE exercises SET description = 'Press barbell overhead from front shoulders. Keep core tight and avoid excessive back arch.' WHERE name = 'Overhead Press' AND is_default = true;
UPDATE exercises SET description = 'Seated or standing, press dumbbells overhead. Allows natural rotation of wrists.' WHERE name = 'Dumbbell Shoulder Press' AND is_default = true;
UPDATE exercises SET description = 'Start with dumbbells at thighs, press up while rotating. Full range of motion exercise.' WHERE name = 'Arnold Press' AND is_default = true;
UPDATE exercises SET description = 'Raise dumbbells to sides until arms parallel to floor. Slight bend in elbows, control descent.' WHERE name = 'Lateral Raise' AND is_default = true;
UPDATE exercises SET description = 'Bend forward slightly, raise dumbbells to sides. Targets rear delts.' WHERE name = 'Rear Delt Fly' AND is_default = true;
UPDATE exercises SET description = 'Lift dumbbells in front to shoulder height. Alternate arms or both together.' WHERE name = 'Front Raise' AND is_default = true;
UPDATE exercises SET description = 'Pull bar to chin keeping elbows high. Can irritate shoulders - use moderate weight.' WHERE name = 'Upright Row' AND is_default = true;
UPDATE exercises SET description = 'Sit facing pad, lift arms in arcs. Isolates lateral deltoids effectively.' WHERE name = 'Machine Lateral Raise' AND is_default = true;
UPDATE exercises SET description = 'Pull rope attachment to face height. External rotation at top. Great for shoulder health.' WHERE name = 'Face Pull' AND is_default = true;
UPDATE exercises SET description = 'Circular motion with weight plate or dumbbells. Targets all three delt heads.' WHERE name = 'Plate Front Raise' AND is_default = true;

-- Arms exercises
UPDATE exercises SET description = 'Keep elbows stationary, curl bar up. Squeeze biceps at top, control the negative.' WHERE name = 'Barbell Curl' AND is_default = true;
UPDATE exercises SET description = 'Can supinate (rotate) at top for extra contraction. Alternate or curl together.' WHERE name = 'Dumbbell Curl' AND is_default = true;
UPDATE exercises SET description = 'Neutral grip curl. Targets brachialis for thicker arms. Great forearm builder too.' WHERE name = 'Hammer Curl' AND is_default = true;
UPDATE exercises SET description = 'Arm braced against inner thigh. Strict form, isolates bicep peak.' WHERE name = 'Concentration Curl' AND is_default = true;
UPDATE exercises SET description = 'Arms angled on pad. Emphasizes long head of biceps. Keep controlled tempo.' WHERE name = 'Preacher Curl' AND is_default = true;
UPDATE exercises SET description = 'Keep elbows in, lower bar behind head or to forehead. Great tricep mass builder.' WHERE name = 'Skull Crusher' AND is_default = true;
UPDATE exercises SET description = 'Keep elbows close to sides, press down. Rope allows for wrist rotation at bottom.' WHERE name = 'Tricep Pushdown' AND is_default = true;
UPDATE exercises SET description = 'Upper arm stationary, extend dumbbell overhead. One arm at a time.' WHERE name = 'Tricep Extension' AND is_default = true;
UPDATE exercises SET description = 'Bench behind you, hands on edge. Lower body, then press up. Bodyweight tricep builder.' WHERE name = 'Tricep Dips' AND is_default = true;
UPDATE exercises SET description = 'Excellent arm builder. Close grip emphasizes triceps, normal grip hits all heads.' WHERE name = 'Close-Grip Bench Press' AND is_default = true;
UPDATE exercises SET description = 'Constant cable tension. Great for pumps. Keep elbows slightly in front of body.' WHERE name = 'Cable Curl' AND is_default = true;
UPDATE exercises SET description = 'Upper arm vertical, lower dumbbell behind head. Stretch then extend.' WHERE name = 'Overhead Tricep Extension' AND is_default = true;

-- Legs exercises
UPDATE exercises SET description = 'King of leg exercises. Keep chest up, knees tracking over toes. Depth to parallel or below.' WHERE name = 'Squat' AND is_default = true;
UPDATE exercises SET description = 'Feet higher = more glutes/hams. Feet lower = more quads. Full range of motion.' WHERE name = 'Leg Press' AND is_default = true;
UPDATE exercises SET description = 'Set height low enough for full stretch. Lead with knees, squeeze quads at top.' WHERE name = 'Leg Extension' AND is_default = true;
UPDATE exercises SET description = 'Lie face down or seated. Curl toward glutes. Control the negative phase.' WHERE name = 'Leg Curl' AND is_default = true;
UPDATE exercises SET description = 'Step forward into a lunge position. Keep torso upright, knee tracking over toe.' WHERE name = 'Lunges' AND is_default = true;
UPDATE exercises SET description = 'Hinge at hips with slight knee bend. Great hamstring and glute builder.' WHERE name = 'Romanian Deadlift' AND is_default = true;
UPDATE exercises SET description = 'Stand tall, push hips back against band/cable resistance. Targets glutes.' WHERE name = 'Hip Thrust' AND is_default = true;
UPDATE exercises SET description = 'Rise onto toes, squeeze calves at top. Full stretch at bottom. Can do single leg.' WHERE name = 'Calf Raise' AND is_default = true;
UPDATE exercises SET description = 'Similar to back squat but bar in front. Keeps torso more upright, targets quads.' WHERE name = 'Front Squat' AND is_default = true;
UPDATE exercises SET description = 'Targets adductors. Squeeze inner thighs together against resistance.' WHERE name = 'Adductor Machine' AND is_default = true;
UPDATE exercises SET description = 'Targets abductors/hip muscles. Push legs apart against resistance.' WHERE name = 'Abductor Machine' AND is_default = true;
UPDATE exercises SET description = 'Rear foot elevated on bench. Single leg squat variation. Great for balance.' WHERE name = 'Bulgarian Split Squat' AND is_default = true;
UPDATE exercises SET description = 'Drive through heel to step up. Can add dumbbells or barbell for resistance.' WHERE name = 'Step-ups' AND is_default = true;
UPDATE exercises SET description = 'Legs wider than shoulder width, toes pointed out. Targets inner thighs and glutes.' WHERE name = 'Sumo Squat' AND is_default = true;

-- Core exercises
UPDATE exercises SET description = 'Classic core exercise. Curl up bringing shoulders off ground. Keep neck neutral.' WHERE name = 'Crunches' AND is_default = true;
UPDATE exercises SET description = 'Hold position with forearms and toes on ground. Keep body straight, don''t sag hips.' WHERE name = 'Plank' AND is_default = true;
UPDATE exercises SET description = 'Twist torso side to side with weight. Keep core engaged throughout.' WHERE name = 'Russian Twist' AND is_default = true;
UPDATE exercises SET description = 'Hang from bar, raise legs or knees. More challenging than floor exercises.' WHERE name = 'Hanging Leg Raise' AND is_default = true;
UPDATE exercises SET description = 'Pull rope down while crunching. Keep hips stationary, flex abs.' WHERE name = 'Cable Crunch' AND is_default = true;
UPDATE exercises SET description = 'Alternate knee to elbow while lying down. Great for obliques.' WHERE name = 'Bicycle Crunch' AND is_default = true;
UPDATE exercises SET description = 'Lie on back, alternate lowering straight legs. Keep lower back pressed to floor.' WHERE name = 'Flutter Kicks' AND is_default = true;
UPDATE exercises SET description = 'Stand tall, lean to one side with dumbbell. Returns to center. Targets obliques.' WHERE name = 'Side Bend' AND is_default = true;
UPDATE exercises SET description = 'Extend arms and legs while lying face down. Lift opposite arm/leg simultaneously.' WHERE name = 'Superman' AND is_default = true;
UPDATE exercises SET description = 'Start in squat, push body back while extending legs. Return to squat position.' WHERE name = 'Ab Wheel Rollout' AND is_default = true;
UPDATE exercises SET description = 'Hang from bar, keep legs straight, touch toes to bar. Advanced core movement.' WHERE name = 'Toes to Bar' AND is_default = true;
UPDATE exercises SET description = 'Sit with feet off ground, twist to touch sides. Add weight for more challenge.' WHERE name = 'Seated Russian Twist' AND is_default = true;

-- Cardio exercises
UPDATE exercises SET description = 'Maintain consistent pace or intervals. Great for cardiovascular endurance.' WHERE name = 'Running' AND is_default = true;
UPDATE exercises SET description = 'Low impact cardio. Can do steady state or HIIT intervals.' WHERE name = 'Cycling' AND is_default = true;
UPDATE exercises SET description = 'Full body cardio with upper and lower body involvement. Great for intervals.' WHERE name = 'Rowing Machine' AND is_default = true;
UPDATE exercises SET description = 'Low impact, easy on joints. Simulates running motion without impact.' WHERE name = 'Elliptical' AND is_default = true;
UPDATE exercises SET description = 'Versatile training. Walk incline, sprint intervals, or steady state.' WHERE name = 'Treadmill' AND is_default = true;
UPDATE exercises SET description = 'Excellent cardio and coordination. Can scale from singles to double-unders.' WHERE name = 'Jump Rope' AND is_default = true;
UPDATE exercises SET description = 'Constant pace climbing. Great for legs and cardio simultaneously.' WHERE name = 'Stair Climber' AND is_default = true;
UPDATE exercises SET description = 'Full body, high intensity movement. Squat, push-up, jump sequence.' WHERE name = 'Burpees' AND is_default = true;
UPDATE exercises SET description = 'Run in place bringing knees high. Great for warm-up or HIIT.' WHERE name = 'High Knees' AND is_default = true;
UPDATE exercises SET description = 'Full body assault bike. Arms and legs working together. Very demanding.' WHERE name = 'Assault Bike' AND is_default = true;
