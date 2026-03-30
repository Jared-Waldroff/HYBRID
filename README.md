# HYBRID

> **Out Lift The Runners, Out Run The Lifters**
>
> The all-in-one workout companion for athletes who refuse to specialize.

HYBRID is a mobile fitness application built for the modern athlete who wants it all: strength, endurance, power, and longevity. Whether you're training for HYROX, CrossFit, a marathon, or just want to be strong *and* conditioned — HYBRID has you covered.

## DOWNLOAD ON THE APP STORE HERE: https://apps.apple.com/ca/app/hybrid/id6758261099

---

## Why HYBRID?

Most fitness apps force you to choose: strength OR cardio, bodybuilding OR functional fitness. **HYBRID breaks that mold.**

- **Strength Training** — Log sets, reps, and weights with a clean, intuitive interface
- **Endurance Work** — Track Zone 2 runs, intervals, and conditioning
- **CrossFit & HYROX** — Built-in database of 40+ CrossFit Open workouts with timers and score tracking
- **AI-Powered Coaching** — Get personalized workout plans from an AI coach trained on elite methodologies
- **Train With Friends** — Squad features let you connect, share, and compete with training partners

---

## Core Features

### Smart Workout Planning

Plan your training with an intuitive calendar interface. See your week at a glance, schedule workouts in advance, and never miss a session.

- **Infinite scroll home feed** — Past and future workouts, all in one place
- **Color-coded workout types** — Instantly see what's on the agenda
- **Copy previous workouts** — Repeat successful sessions with one tap
- **Quick-add buttons** — Create workouts in seconds

### Exercise Library

Access a comprehensive database of **60+ exercises** organized by muscle group, or create your own custom movements.

- **Searchable & filterable** — Find any exercise instantly
- **Muscle group categories** — Chest, Back, Shoulders, Arms, Legs, Core, Cardio
- **Custom exercises** — Add your own unique movements
- **Exercise history** — See your progress over time

### AI Fitness Coach

Chat with an intelligent AI coach that understands hybrid athletic training. The coach is trained on methodologies from leading trainers and researchers:

| Methodology | Source |
|-------------|--------|
| **80/20 Polarized Training** | Stephen Seiler, Matt Fitzgerald |
| **VO2 Max Development** | Dr. Peter Attia, Dr. Andy Galpin |
| **Strength Programming** | Renaissance Periodization (Dr. Mike Israetel) |
| **Joint Health & Bulletproofing** | Ben Patrick (ATG / Knees Over Toes) |
| **Longevity Training** | Dr. Peter Attia's 4 Pillars |
| **HYROX & CrossFit Prep** | Competition-specific programming |

**What makes the AI different:**
- Asks about your lifestyle, sleep, stress, and goals before recommending workouts
- Flags poor programming decisions (excessive volume, insufficient recovery)
- Generates structured workout plans you can add to your calendar with one tap
- Prioritizes joint health and longevity over short-term gains

### CrossFit Open Workouts

A complete database of **CrossFit Open workouts from 2017-2025** with:

- **Official workout descriptions** — RX weights for men and women
- **Smart timers** — Automatically configured based on workout format (AMRAP, For Time, intervals)
- **Countdown with audio cues** — 3-2-1-GO with haptic feedback
- **Score logging** — Track your times, reps, and rounds
- **Historical scores** — Compare your performance over time
- **Random workout generator** — Let fate choose your WOD

### Squad System

Fitness is better with friends. Connect with training partners and build your squad.

- **Follow/Follower system** — Build your fitness network
- **Username search** — Find friends easily
- **QR Code invites** — Add squad members in person
- **Shareable invite links** — Grow your community
- **Privacy controls** — Choose who can follow you
- **Real-time notifications** — Stay connected with your squad

### Theming

Make the app yours with extensive customization options:

- **8 Curated Themes** — Midnight, Ocean, Forest, Sunset, Royal, Slate, Rose, Amber
- **Custom Colors** — Set your own primary and secondary accent colors
- **Dark & Light Modes** — Easy on the eyes, day or night
- **Persistent Preferences** — Settings sync across devices

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native + Expo SDK 54 |
| **Language** | TypeScript |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **AI** | Google Gemini 1.5 Flash |
| **Navigation** | React Navigation 7 |
| **Auth** | Supabase Auth (Email/Password + Google OAuth + Apple Sign In) |
| **Payments** | RevenueCat (In-App Subscriptions) |
| **Icons** | Expo Vector Icons (Feather) |

---

## Screenshots

*Coming soon.*

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Google Cloud account (for Gemini API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jared-Waldroff/HYBRID.git
   cd HYBRID
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up database**

   Run the SQL migration files in your Supabase SQL Editor:
   - `supabase-schema.sql` — Core tables and seed data
   - `supabase-athlete-profiles.sql` — Extended profile for AI context
   - `supabase-social.sql` — Squad and notifications

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on your device**
   - Scan the QR code with Expo Go (iOS/Android)
   - Or press `a` for Android emulator / `i` for iOS simulator

---

## Project Structure

```
HYBRID/
├── App.tsx                 # Root component
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/            # Auth & Theme providers
│   ├── data/               # Static data (CrossFit workouts, badges)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Supabase & Gemini clients
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # All app screens
│   └── theme/              # Design system (colors, spacing, typography)
└── supabase-*.sql          # Database migrations
```

---

## Security

- **Row Level Security (RLS)** — All database tables enforce user-level access
- **Secure token storage** — Auth tokens stored in Expo SecureStore
- **No sensitive data in code** — All secrets managed via environment variables

---

## Roadmap

- [ ] Apple Health / Google Fit integration
- [ ] Workout sharing to social media
- [ ] Leaderboards and challenges
- [ ] Apple Watch companion app
- [ ] Offline mode with sync
- [ ] Workout analytics and insights dashboard
- [ ] Export data (CSV/PDF)

---

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License.

---

## Author

**Jared Waldroff**

---

<p align="center">
  <strong>Train Hard. Train Smart. Train HYBRID.</strong>
</p>
