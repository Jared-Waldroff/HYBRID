# Push Notification System — Design Spec

## Overview

Add a complete push notification system to HYBRID with 8 notification types, a grouped notifications screen with inline actions, real-time badge count on the bell icon, and per-type user control. iOS-only for now (APNs already configured), with Android support easy to add later.

## Notification Types

| Type | Trigger | Push Content Example |
|------|---------|---------------------|
| `squad_request` | `squad_members` INSERT (status='pending') | "Jake Wilson sent you a squad request" |
| `squad_accept` | `squad_members` UPDATE (status='accepted') | "Jake Wilson accepted your squad request" |
| `comment` | `feed_comments` INSERT | "Mike S. commented on your post: 'great session!'" |
| `lfg` | `feed_reactions` INSERT | "Alex J. reacted LFG to your post" |
| `event_invite` | `event_participants` INSERT | "Mike S. invited you to CrossFit Open" |
| `squad_post` | `activity_feed` INSERT | "Jake Wilson posted a new workout" |
| `workout_reminder` | Local scheduling (on-device) | "Workout tomorrow: Leg Day for CrossFit Open" |
| `event_soon` | Local scheduling (on-device) | "CrossFit Open starts in 2 days" |

The first 6 types are server-side (database triggers + Edge Function). The last 2 are client-side local notifications scheduled by `expo-notifications`.

## Database Schema

### `notifications` table

```sql
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}',
    read boolean DEFAULT false,
    acted boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, read, created_at DESC);

CREATE INDEX idx_notifications_cleanup
    ON notifications (created_at);
```

### RLS Policies

- Users can SELECT their own notifications (`user_id = auth.uid()`)
- Users can UPDATE their own notifications (mark read, mark acted)
- Users cannot INSERT or DELETE directly — only triggers and cron create/remove rows

### Retention Policy

A pg_cron job runs daily:
- Delete read notifications older than 30 days
- Delete all notifications older than 60 days regardless of read status

```sql
SELECT cron.schedule(
    'cleanup-old-notifications',
    '0 3 * * *',
    $$DELETE FROM notifications WHERE
        (read = true AND created_at < now() - interval '30 days')
        OR (created_at < now() - interval '60 days')$$
);
```

## Database Triggers

Each trigger calls a shared `create_notification()` Postgres function that:
1. Inserts a row into `notifications`
2. Looks up the target user's `push_token` and `notification_preferences` from `athlete_profiles`
3. If the notification type is enabled in preferences AND a push token exists, calls `net.http_post` to invoke the `send-push` Edge Function

### Trigger: Squad Request Sent

- Table: `squad_members`
- Event: AFTER INSERT when `status = 'pending'`
- Notifies: `receiver_id`
- Type: `squad_request`
- Data: `{ userId: requester_id }`

### Trigger: Squad Request Accepted

- Table: `squad_members`
- Event: AFTER UPDATE when `status` changes to `'accepted'`
- Notifies: `requester_id`
- Type: `squad_accept`
- Data: `{ userId: receiver_id }`

### Trigger: Comment on Post

- Table: `feed_comments`
- Event: AFTER INSERT
- Notifies: post author (looked up from `activity_feed`)
- Skip if: commenter is the post author (no self-notification)
- Type: `comment`
- Data: `{ postId, userId: commenter_id }`

### Trigger: LFG Reaction

- Table: `feed_reactions`
- Event: AFTER INSERT
- Notifies: post author (looked up from `activity_feed`)
- Skip if: reactor is the post author
- Type: `lfg`
- Data: `{ postId, userId: reactor_id }`

### Trigger: Event Invite

- Table: `event_participants`
- Event: AFTER INSERT
- Notifies: the invited user
- Skip if: user invited themselves (joined voluntarily)
- Type: `event_invite`
- Data: `{ eventId }`

### Trigger: Squad Post

- Table: `activity_feed`
- Event: AFTER INSERT
- Notifies: all accepted squad members of the poster
- Looked up via `squad_members` where status='accepted'
- Type: `squad_post`
- Data: `{ postId: new_post_id, userId: poster_id }`

## Supabase Edge Function: `send-push`

Single Edge Function that delivers push notifications via the Expo Push API.

### Input

```typescript
{
    pushToken: string;       // ExponentPushToken[xxx]
    title: string;
    body: string;
    data?: Record<string, any>;
    sound: 'notification.wav' | 'default';
}
```

### Behavior

1. POST to `https://exp.host/--/api/v2/push/send` with the payload
2. On success: return 200
3. On `DeviceNotRegistered` error: clear `push_token` from `athlete_profiles` for that token
4. On other errors: log and return error status

### Authentication

The Edge Function is called by the database trigger via `net.http_post` with the `SUPABASE_SERVICE_ROLE_KEY` in the Authorization header. It is not publicly accessible.

## Client-Side Architecture

### Dependencies

Add `expo-notifications` to `package.json`. This is a native module requiring a new EAS build.

### app.json Changes

```json
{
    "plugins": [
        [
            "expo-notifications",
            {
                "sounds": ["./assets/sounds/notification.wav"]
            }
        ]
    ]
}
```

### notificationService.ts — Replace Mocks

Remove the mock `Notifications` object. Import real `expo-notifications`. Implement:

- `registerForPushNotificationsAsync()` — request permissions, get Expo push token using project ID `ae4e3783-a643-4a7e-95d4-eb3108c0184a`, return token string
- `savePushToken(userId, token)` — save to `athlete_profiles.push_token` (already implemented)
- `clearPushToken(userId)` — set `push_token = null` on sign-out
- `addNotificationListeners()` — real received + response listeners
- Local scheduling functions — uncomment existing `scheduleWorkoutReminder()` and `scheduleCheckInReminder()` code

### NotificationContext.tsx — Real Implementation

- On auth state change (user logs in): call `registerForPushNotificationsAsync()`, save token
- On sign-out: call `clearPushToken()`
- Subscribe to `notifications` table via Supabase Realtime filtered to `user_id = current user`
- Track `unreadCount` state — increment on new insert, recount on mark-read
- Expose `unreadCount` to consumers (AppHeader badge)
- Handle notification tap responses — navigate based on `data.type`

### NotificationPreferences — Updated Shape

```typescript
interface NotificationPreferences {
    squadRequests: boolean;
    comments: boolean;
    lfgReactions: boolean;
    squadPosts: boolean;
    eventInvites: boolean;
    eventSoon: boolean;
    workoutReminders: boolean;
    checkInReminders: boolean;
    sound: 'custom' | 'default';
}
```

All default to `true`. Sound defaults to `'custom'`.

## Notifications Screen

### Layout

Grouped by category with section headers showing unread counts per group.

**Sections:**
1. **Squad** — squad_request, squad_accept, comment, lfg, squad_post
2. **Events** — event_invite, event_soon
3. **Training** — workout_reminder

Sections with no notifications are hidden. Each section shows its unread count badge.

### Header

- Title: "Notifications"
- Left: back arrow (if navigated from settings) or nothing (if on tab)
- Right: gear icon → navigates to NotificationSettings

### "Mark all read" link

Below the header. Tapping marks all unread notifications as read and clears the badge count.

### Notification Items

Each item shows:
- Avatar (from the triggering user's profile, or an icon for system notifications like reminders)
- Bold name + action text + relative timestamp
- Unread indicator: gold background tint + gold dot on right side
- Read items: no tint, muted text colors

### Inline Actions

- `squad_request`: Accept button (accent color) + Decline button (outlined). On action, update `squad_members` status and mark notification as `acted = true`. Buttons disappear after action, replaced with "Accepted" or "Declined" text.
- `event_invite`: Join Event button (accent color) + View Details button (outlined). Join calls `joinEvent()`, View Details navigates to EventDetail.

### Tap Navigation

All other types navigate on tap:
- `squad_accept` → Squad Members tab
- `comment` → CommentsScreen for that post
- `lfg` → the post (navigate to feed or activity)
- `squad_post` → the post
- `workout_reminder` → EventDetail
- `event_soon` → EventDetail

### Data Fetching

- Initial load: `supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)`
- Join with `athlete_profiles` to get display_name and avatar_url for the triggering user (stored in `data.userId`)
- Pull-to-refresh supported
- Mark as read: when screen opens, mark all visible as read after a short delay (1 second)

## Notification Settings Screen

### Layout

Accessible from:
- Settings screen → "Notification Settings" row
- Notifications screen → gear icon

### Sections

**Push Notifications** — Enable/disable status with button to request permissions if not granted

**Sound** — Toggle between "Custom (HYBRID)" and "System Default"

**Squad Activity** (4 toggles):
- Squad Requests
- Comments
- LFG Reactions
- Squad Posts

**Events** (2 toggles):
- Event Invites
- Event Starting Soon

**Training** (2 toggles):
- Workout Reminders
- Check-In Reminders

Each toggle updates `notification_preferences` in `athlete_profiles`. All use `themeColors` and `userColors` from `useTheme()`.

## AppHeader Badge

- Gold circle (using `userColors.accent_color`) positioned at top-right of bell icon
- White bold text showing unread count
- Hidden when count is 0
- Shows "99+" when count exceeds 99
- Count sourced from `NotificationContext.unreadCount`
- Updates in real-time via Supabase Realtime subscription

## Settings Screen Link

Add a new row to the Settings screen:
- Icon: `bell` (Feather)
- Label: "Notification Settings"
- Navigates to `NotificationSettings` screen

## Build Requirements

- New EAS build required (`expo-notifications` is a native module)
- APNs Push Key already configured: `KGCLMK94PH`
- Bump `buildNumber` in `app.json` before building
- Android FCM not needed yet (iOS-only)
- Custom sound file: `assets/sounds/notification.wav`

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add `expo-notifications` |
| `app.json` | Add notifications plugin + sound |
| `src/services/notificationService.ts` | Replace mocks with real implementation |
| `src/context/NotificationContext.tsx` | Real push registration, Realtime subscription, unread count |
| `src/screens/NotificationsScreen.tsx` | Full rebuild — grouped list, inline actions |
| `src/screens/NotificationSettingsScreen.tsx` | 8 toggles + sound toggle |
| `src/components/AppHeader.tsx` | Badge count on bell icon |
| `src/screens/SettingsScreen.tsx` | Add notification settings row |
| `supabase/migrations/YYYYMMDD_notifications.sql` | Table, triggers, RLS, cron |
| `supabase/functions/send-push/index.ts` | Edge Function for Expo Push API |
| `assets/sounds/notification.wav` | Custom notification sound (already copied) |
