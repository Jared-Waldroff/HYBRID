# Push Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete push notification system with 8 notification types, grouped notifications screen, real-time badge count, and per-type user control.

**Architecture:** Database triggers on Supabase create notification records and invoke a `send-push` Edge Function that delivers via the Expo Push API. Client-side uses `expo-notifications` for push token registration, permission handling, and local scheduling. A Supabase Realtime subscription keeps the bell badge count live.

**Tech Stack:** Supabase (Postgres triggers, Edge Functions, Realtime, pg_cron), expo-notifications, Expo Push API, React Native

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260331_notifications.sql` | Create | Notifications table, RLS, indexes, `create_notification()` function, all 6 triggers, retention cron |
| `supabase/functions/send-push/index.ts` | Create | Edge Function — receives push payload, sends to Expo Push API, clears dead tokens |
| `package.json` | Modify | Add `expo-notifications` dependency |
| `app.json` | Modify | Add `expo-notifications` plugin with custom sound |
| `src/services/notificationService.ts` | Rewrite | Replace mocks with real `expo-notifications` — registration, listeners, local scheduling, token management |
| `src/context/NotificationContext.tsx` | Rewrite | Real push registration, Realtime unread subscription, notification tap navigation, expose `unreadCount` |
| `App.tsx` | Modify | Add `NotificationProvider` to provider tree |
| `src/components/AppHeader.tsx` | Modify | Add badge count circle on bell icon |
| `src/screens/NotificationsScreen.tsx` | Rewrite | Grouped notification list, inline actions, mark-all-read, gear icon |
| `src/screens/NotificationSettingsScreen.tsx` | Rewrite | 8 individual toggles + custom/default sound toggle |
| `src/screens/SettingsScreen.tsx` | Modify | Add "Notification Settings" row in Account section |

---

### Task 1: Create Supabase Migration — Notifications Table, Triggers, Retention

**Files:**
- Create: `supabase/migrations/20260331_notifications.sql`

This is the foundation. Creates the table, RLS policies, the shared `create_notification()` function, all 6 triggers, and the daily cleanup cron.

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- Notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
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

-- Index: main query for notifications screen
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, read, created_at DESC);

-- Index: retention cleanup
CREATE INDEX idx_notifications_cleanup
    ON notifications (created_at);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark read/acted)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Service role can insert (triggers run as service role via security definer functions)
CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Service role can delete (cron cleanup)
CREATE POLICY "Service can delete notifications"
    ON notifications FOR DELETE
    USING (true);

-- ============================================================
-- Shared function: create_notification and send push
-- ============================================================
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id uuid;
    v_push_token text;
    v_preferences jsonb;
    v_pref_key text;
    v_sound text;
    v_supabase_url text;
    v_service_key text;
BEGIN
    -- Insert the notification row
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO v_notification_id;

    -- Look up push token and preferences
    SELECT push_token, notification_preferences
    INTO v_push_token, v_preferences
    FROM athlete_profiles
    WHERE user_id = p_user_id;

    -- If no push token, skip sending
    IF v_push_token IS NULL OR v_push_token = '' THEN
        RETURN v_notification_id;
    END IF;

    -- Map notification type to preference key
    v_pref_key := CASE p_type
        WHEN 'squad_request' THEN 'squadRequests'
        WHEN 'squad_accept' THEN 'squadRequests'
        WHEN 'comment' THEN 'comments'
        WHEN 'lfg' THEN 'lfgReactions'
        WHEN 'event_invite' THEN 'eventInvites'
        WHEN 'squad_post' THEN 'squadPosts'
        ELSE NULL
    END;

    -- Check if this notification type is enabled (default true if not set)
    IF v_pref_key IS NOT NULL
       AND v_preferences IS NOT NULL
       AND (v_preferences->>v_pref_key)::boolean IS DISTINCT FROM true
       AND v_preferences ? v_pref_key THEN
        RETURN v_notification_id;
    END IF;

    -- Determine sound preference
    v_sound := COALESCE(v_preferences->>'sound', 'custom');
    IF v_sound = 'custom' THEN
        v_sound := 'notification.wav';
    ELSE
        v_sound := 'default';
    END IF;

    -- Get Supabase URL and service key for Edge Function call
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);

    -- Call the send-push Edge Function via net.http_post
    -- This is async and non-blocking
    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
        PERFORM net.http_post(
            url := v_supabase_url || '/functions/v1/send-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
                'pushToken', v_push_token,
                'title', p_title,
                'body', p_body,
                'data', p_data || jsonb_build_object('type', p_type),
                'sound', v_sound
            )
        );
    END IF;

    RETURN v_notification_id;
END;
$$;

-- ============================================================
-- Trigger: Squad Request Sent
-- ============================================================
CREATE OR REPLACE FUNCTION handle_squad_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requester_name text;
BEGIN
    IF NEW.status = 'pending' THEN
        SELECT display_name INTO v_requester_name
        FROM athlete_profiles WHERE user_id = NEW.requester_id;

        PERFORM create_notification(
            NEW.receiver_id,
            'squad_request',
            'Squad Request',
            COALESCE(v_requester_name, 'Someone') || ' sent you a squad request',
            jsonb_build_object('userId', NEW.requester_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_squad_request_sent
    AFTER INSERT ON squad_members
    FOR EACH ROW
    EXECUTE FUNCTION handle_squad_request_notification();

-- ============================================================
-- Trigger: Squad Request Accepted
-- ============================================================
CREATE OR REPLACE FUNCTION handle_squad_accept_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_accepter_name text;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        SELECT display_name INTO v_accepter_name
        FROM athlete_profiles WHERE user_id = NEW.receiver_id;

        PERFORM create_notification(
            NEW.requester_id,
            'squad_accept',
            'Squad',
            COALESCE(v_accepter_name, 'Someone') || ' accepted your squad request',
            jsonb_build_object('userId', NEW.receiver_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_squad_request_accepted
    AFTER UPDATE ON squad_members
    FOR EACH ROW
    EXECUTE FUNCTION handle_squad_accept_notification();

-- ============================================================
-- Trigger: Comment on Post
-- ============================================================
CREATE OR REPLACE FUNCTION handle_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_author_id uuid;
    v_commenter_name text;
    v_comment_preview text;
BEGIN
    -- Get post author
    SELECT user_id INTO v_post_author_id
    FROM activity_feed WHERE id = NEW.post_id;

    -- Don't notify yourself
    IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    SELECT display_name INTO v_commenter_name
    FROM athlete_profiles WHERE user_id = NEW.user_id;

    -- Truncate comment for preview
    v_comment_preview := LEFT(NEW.content, 50);
    IF LENGTH(NEW.content) > 50 THEN
        v_comment_preview := v_comment_preview || '...';
    END IF;

    PERFORM create_notification(
        v_post_author_id,
        'comment',
        'New Comment',
        COALESCE(v_commenter_name, 'Someone') || ' commented: "' || v_comment_preview || '"',
        jsonb_build_object('postId', NEW.post_id, 'userId', NEW.user_id)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
    AFTER INSERT ON feed_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_comment_notification();

-- ============================================================
-- Trigger: LFG Reaction
-- ============================================================
CREATE OR REPLACE FUNCTION handle_lfg_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_author_id uuid;
    v_reactor_name text;
BEGIN
    -- Get post author
    SELECT user_id INTO v_post_author_id
    FROM activity_feed WHERE id = NEW.post_id;

    -- Don't notify yourself
    IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    SELECT display_name INTO v_reactor_name
    FROM athlete_profiles WHERE user_id = NEW.user_id;

    PERFORM create_notification(
        v_post_author_id,
        'lfg',
        'LFG!',
        COALESCE(v_reactor_name, 'Someone') || ' reacted LFG to your post',
        jsonb_build_object('postId', NEW.post_id, 'userId', NEW.user_id)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_lfg_reaction
    AFTER INSERT ON feed_reactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_lfg_notification();

-- ============================================================
-- Trigger: Event Invite
-- ============================================================
CREATE OR REPLACE FUNCTION handle_event_invite_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inviter_name text;
    v_event_name text;
BEGIN
    -- Don't notify if user joined voluntarily (user_id matches auth caller)
    IF NEW.user_id = auth.uid() THEN
        RETURN NEW;
    END IF;

    -- Get event name
    SELECT name INTO v_event_name
    FROM squad_events WHERE id = NEW.event_id;

    -- The inviter is the authenticated user
    SELECT display_name INTO v_inviter_name
    FROM athlete_profiles WHERE user_id = auth.uid();

    PERFORM create_notification(
        NEW.user_id,
        'event_invite',
        'Event Invite',
        COALESCE(v_inviter_name, 'Someone') || ' invited you to ' || COALESCE(v_event_name, 'an event'),
        jsonb_build_object('eventId', NEW.event_id)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_invite
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_invite_notification();

-- ============================================================
-- Trigger: Squad Post (notify all squad members)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_squad_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_poster_name text;
    v_member_id uuid;
BEGIN
    SELECT display_name INTO v_poster_name
    FROM athlete_profiles WHERE user_id = NEW.user_id;

    -- Loop through all accepted squad members of the poster
    FOR v_member_id IN
        SELECT CASE
            WHEN requester_id = NEW.user_id THEN receiver_id
            ELSE requester_id
        END
        FROM squad_members
        WHERE (requester_id = NEW.user_id OR receiver_id = NEW.user_id)
          AND status = 'accepted'
    LOOP
        PERFORM create_notification(
            v_member_id,
            'squad_post',
            'Squad Activity',
            COALESCE(v_poster_name, 'Someone') || ' posted a new update',
            jsonb_build_object('postId', NEW.id, 'userId', NEW.user_id)
        );
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_squad_post_created
    AFTER INSERT ON activity_feed
    FOR EACH ROW
    EXECUTE FUNCTION handle_squad_post_notification();

-- ============================================================
-- Retention: Daily cleanup of old notifications
-- ============================================================
-- Note: pg_cron must be enabled in Supabase dashboard (Extensions)
-- Run this manually in the SQL editor if pg_cron is available:
--
-- SELECT cron.schedule(
--     'cleanup-old-notifications',
--     '0 3 * * *',
--     $$DELETE FROM notifications WHERE
--         (read = true AND created_at < now() - interval '30 days')
--         OR (created_at < now() - interval '60 days')$$
-- );
```

- [ ] **Step 2: Apply the migration to Supabase**

Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor → paste and run). Verify:
- `notifications` table exists with correct columns
- RLS policies are active
- Test: `SELECT * FROM notifications;` should return empty result with no permission errors

Also ensure the `pg_net` extension is enabled (Dashboard → Database → Extensions → search `pg_net` → enable). This is required for `net.http_post` to call the Edge Function from triggers.

- [ ] **Step 3: Set app.settings for Edge Function URL**

In the Supabase SQL Editor, set the config values the `create_notification()` function needs:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

Replace with your actual Supabase project URL and service role key from the dashboard (Settings → API).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260331_notifications.sql
git commit -m "feat: add notifications table, triggers, and retention cron"
```

---

### Task 2: Create send-push Edge Function

**Files:**
- Create: `supabase/functions/send-push/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
    pushToken: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify authorization (only service role should call this)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const payload: PushPayload = await req.json()

        if (!payload.pushToken || !payload.title || !payload.body) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: pushToken, title, body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Send to Expo Push API
        const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                to: payload.pushToken,
                title: payload.title,
                body: payload.body,
                data: payload.data || {},
                sound: payload.sound || 'default',
                priority: 'high',
            }),
        })

        const result = await expoPushResponse.json()

        // Check for device not registered error — clear dead token
        if (result.data?.status === 'error' && result.data?.details?.error === 'DeviceNotRegistered') {
            console.log('Device not registered, clearing push token:', payload.pushToken)

            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, serviceRoleKey)

            await supabase
                .from('athlete_profiles')
                .update({ push_token: null })
                .eq('push_token', payload.pushToken)

            return new Response(
                JSON.stringify({ status: 'token_cleared', message: 'Device no longer registered' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ status: 'sent', result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('send-push error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
cd /Users/jaredwaldroff/SoftwareProjects/HYBRID
supabase functions deploy send-push --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function is called from the database trigger with the service role key, not a user JWT.

- [ ] **Step 3: Test the Edge Function**

From the Supabase dashboard SQL Editor, test the full chain:

```sql
-- This should create a notification row (push will fail without a real token, which is expected)
SELECT create_notification(
    auth.uid(),
    'squad_request',
    'Test Notification',
    'This is a test',
    '{}'::jsonb
);

-- Verify the row was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-push/index.ts
git commit -m "feat: add send-push Edge Function for Expo Push API"
```

---

### Task 3: Install expo-notifications and Configure app.json

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Install expo-notifications**

```bash
cd /Users/jaredwaldroff/SoftwareProjects/HYBRID
npx expo install expo-notifications
```

This installs the version compatible with the current Expo SDK.

- [ ] **Step 2: Add notification plugin to app.json**

In `app.json`, add `expo-notifications` to the `plugins` array with the custom sound file:

```json
[
    "expo-notifications",
    {
        "sounds": ["./assets/sounds/notification.wav"]
    }
]
```

Add it after the existing `@react-native-community/datetimepicker` plugin entry.

- [ ] **Step 3: Add notification permission description for iOS**

In `app.json` under `expo.ios.infoPlist`, add:

```json
"NSUserNotificationsUsageDescription": "HYBRID sends you notifications for squad requests, comments, event invites, and workout reminders."
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "feat: install expo-notifications with custom sound"
```

---

### Task 4: Rewrite notificationService.ts — Real Implementation

**Files:**
- Rewrite: `src/services/notificationService.ts`

- [ ] **Step 1: Replace the entire file with real expo-notifications implementation**

```typescript
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export interface NotificationPreferences {
    squadRequests: boolean;
    squadPosts: boolean;
    comments: boolean;
    lfgReactions: boolean;
    eventInvites: boolean;
    eventSoon: boolean;
    workoutReminders: boolean;
    checkInReminders: boolean;
    sound: 'custom' | 'default';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    squadRequests: true,
    squadPosts: true,
    comments: true,
    lfgReactions: true,
    eventInvites: true,
    eventSoon: true,
    workoutReminders: true,
    checkInReminders: true,
    sound: 'custom',
};

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register for push notifications and get the Expo push token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'notification.wav',
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
        console.error('Missing EAS project ID for push token');
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
}

/**
 * Save the push token to the user's profile in Supabase.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ push_token: token })
        .eq('user_id', userId);

    if (error) {
        console.error('Error saving push token:', error);
    }
}

/**
 * Clear the push token on sign-out.
 */
export async function clearPushToken(userId: string): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ push_token: null })
        .eq('user_id', userId);

    if (error) {
        console.error('Error clearing push token:', error);
    }
}

/**
 * Get notification preferences from the database.
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
        .from('athlete_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();

    if (error || !data?.notification_preferences) {
        return DEFAULT_PREFERENCES;
    }

    return {
        ...DEFAULT_PREFERENCES,
        ...data.notification_preferences,
    };
}

/**
 * Save notification preferences to the database.
 */
export async function saveNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ notification_preferences: preferences })
        .eq('user_id', userId);

    if (error) {
        console.error('Error saving notification preferences:', error);
    }
}

/**
 * Schedule a local notification for a workout reminder.
 */
export async function scheduleWorkoutReminder(
    workoutName: string,
    eventName: string,
    scheduledDate: Date,
    eventId: string,
    trainingWorkoutId: string
): Promise<string | null> {
    const reminderDate = new Date(scheduledDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(20, 0, 0, 0);

    if (reminderDate < new Date()) {
        return null;
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Workout Tomorrow!',
                body: `Don't forget: ${workoutName} for ${eventName}`,
                data: {
                    type: 'workout_reminder',
                    eventId,
                    trainingWorkoutId,
                },
                sound: 'notification.wav',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
        return notificationId;
    } catch (error) {
        console.error('Error scheduling workout reminder:', error);
        return null;
    }
}

/**
 * Schedule a local notification for event starting soon.
 */
export async function scheduleEventSoonReminder(
    eventName: string,
    eventDate: Date,
    eventId: string
): Promise<string | null> {
    // Remind 2 days before the event at 9 AM
    const reminderDate = new Date(eventDate);
    reminderDate.setDate(reminderDate.getDate() - 2);
    reminderDate.setHours(9, 0, 0, 0);

    if (reminderDate < new Date()) {
        return null;
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Event Coming Up!',
                body: `${eventName} starts in 2 days`,
                data: {
                    type: 'event_soon',
                    eventId,
                },
                sound: 'notification.wav',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
        return notificationId;
    } catch (error) {
        console.error('Error scheduling event reminder:', error);
        return null;
    }
}

/**
 * Cancel all scheduled notifications for an event.
 */
export async function cancelEventNotifications(eventId: string): Promise<void> {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of allNotifications) {
        const data = notification.content.data;
        if (data?.eventId === eventId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the count of scheduled notifications.
 */
export async function getScheduledNotificationCount(): Promise<number> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
}

/**
 * Add notification listeners for handling received notifications.
 * Returns a cleanup function.
 */
export function addNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/notificationService.ts
git commit -m "feat: replace notification mocks with real expo-notifications"
```

---

### Task 5: Rewrite NotificationContext.tsx — Real Push Registration, Realtime Unread Count

**Files:**
- Rewrite: `src/context/NotificationContext.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import {
    registerForPushNotificationsAsync,
    savePushToken,
    clearPushToken,
    getNotificationPreferences,
    saveNotificationPreferences,
    addNotificationListeners,
    NotificationPreferences,
} from '../services/notificationService';

interface NotificationContextType {
    pushToken: string | null;
    preferences: NotificationPreferences;
    isRegistered: boolean;
    unreadCount: number;
    registerForNotifications: () => Promise<boolean>;
    updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
    markAllRead: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
    squadRequests: true,
    squadPosts: true,
    comments: true,
    lfgReactions: true,
    eventInvites: true,
    eventSoon: true,
    workoutReminders: true,
    checkInReminders: true,
    sound: 'custom',
};

const NotificationContext = createContext<NotificationContextType>({
    pushToken: null,
    preferences: defaultPreferences,
    isRegistered: false,
    unreadCount: 0,
    registerForNotifications: async () => false,
    updatePreferences: async () => {},
    markAllRead: async () => {},
    refreshUnreadCount: async () => {},
});

export function useNotifications() {
    return useContext(NotificationContext);
}

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [isRegistered, setIsRegistered] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const listenerCleanup = useRef<(() => void) | null>(null);

    // Register for push notifications when user logs in
    useEffect(() => {
        if (user?.id) {
            loadPreferences();
            attemptRegistration();
            fetchUnreadCount();
        } else {
            // User logged out — reset state
            setPushToken(null);
            setIsRegistered(false);
            setUnreadCount(0);
        }
    }, [user?.id]);

    // Subscribe to new notifications via Supabase Realtime
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // New notification arrived — increment count
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Set up notification tap listeners
    useEffect(() => {
        const handleNotificationReceived = (notification: Notifications.Notification) => {
            // Notification received while app is in foreground — count already
            // updated by Realtime subscription, nothing extra needed
        };

        const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
            const data = response.notification.request.content.data;

            // Navigate based on notification type
            if (data?.type === 'squad_request' || data?.type === 'squad_accept') {
                (navigation as any).navigate('Main', {
                    screen: 'Squad',
                    params: { screen: 'SquadMain', params: { initialTab: 'members' } },
                });
            } else if (data?.type === 'comment' && data?.postId) {
                (navigation as any).navigate('Comments', { postId: data.postId });
            } else if (data?.type === 'lfg' && data?.postId) {
                (navigation as any).navigate('Main', { screen: 'Squad' });
            } else if (data?.type === 'event_invite' && data?.eventId) {
                (navigation as any).navigate('EventDetail', { id: data.eventId });
            } else if (data?.type === 'event_soon' && data?.eventId) {
                (navigation as any).navigate('EventDetail', { id: data.eventId });
            } else if (data?.type === 'workout_reminder' && data?.eventId) {
                (navigation as any).navigate('EventDetail', { id: data.eventId });
            } else if (data?.type === 'squad_post') {
                (navigation as any).navigate('Main', { screen: 'Squad' });
            }
        };

        listenerCleanup.current = addNotificationListeners(
            handleNotificationReceived,
            handleNotificationResponse
        );

        return () => {
            if (listenerCleanup.current) {
                listenerCleanup.current();
            }
        };
    }, [navigation]);

    const attemptRegistration = async () => {
        if (!user?.id) return;
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setPushToken(token);
            setIsRegistered(true);
            await savePushToken(user.id, token);
        }
    };

    const loadPreferences = async () => {
        if (!user?.id) return;
        const prefs = await getNotificationPreferences(user.id);
        setPreferences(prefs);
    };

    const fetchUnreadCount = async () => {
        if (!user?.id) return;
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (!error && count !== null) {
            setUnreadCount(count);
        }
    };

    const registerForNotifications = useCallback(async (): Promise<boolean> => {
        if (!user?.id) return false;
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setPushToken(token);
            setIsRegistered(true);
            await savePushToken(user.id, token);
            return true;
        }
        setIsRegistered(false);
        return false;
    }, [user?.id]);

    const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
        if (!user?.id) return;
        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);
        await saveNotificationPreferences(user.id, updated);
    }, [user?.id, preferences]);

    const markAllRead = useCallback(async () => {
        if (!user?.id) return;
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (!error) {
            setUnreadCount(0);
        }
    }, [user?.id]);

    const refreshUnreadCount = useCallback(async () => {
        await fetchUnreadCount();
    }, [user?.id]);

    return (
        <NotificationContext.Provider
            value={{
                pushToken,
                preferences,
                isRegistered,
                unreadCount,
                registerForNotifications,
                updatePreferences,
                markAllRead,
                refreshUnreadCount,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/NotificationContext.tsx
git commit -m "feat: real notification context with push registration and realtime unread count"
```

---

### Task 6: Wire Up NotificationProvider in App.tsx and Clear Token on Sign-Out

**Files:**
- Modify: `App.tsx`
- Modify: `src/context/AuthContext.tsx`

- [ ] **Step 1: Add NotificationProvider to App.tsx**

Add the import at the top of `App.tsx`:

```typescript
import { NotificationProvider } from './src/context/NotificationContext';
```

Then wrap `Navigation` with `NotificationProvider` inside the provider tree. It must be inside `AuthProvider` (needs auth) and inside `NavigationContainer` scope. Since `NotificationProvider` uses `useNavigation()`, it needs to be inside the `NavigationContainer`. The simplest approach: move the `NotificationProvider` wrapping into the `Navigation` component itself.

Actually — `NotificationProvider` calls `useNavigation()` which requires being inside `NavigationContainer`. Since `NavigationContainer` is inside the `Navigation` component, we need to restructure slightly. The cleanest approach: remove `useNavigation()` from `NotificationProvider` and pass the navigation ref instead.

**Alternative approach:** Move the notification tap handling out of `NotificationProvider` and into the `Navigation` component where `NavigationContainer` is already available. Keep `NotificationProvider` focused on state (token, count, preferences) and put it in `App.tsx`.

In `App.tsx`, add the provider wrapping `PostDraftProvider`:

```typescript
<RevenueCatProvider>
    <NotificationProvider>
        <PostDraftProvider>
            <View style={styles.container}>
                <StatusBar style="light" />
                <Navigation />
            </View>
        </PostDraftProvider>
    </NotificationProvider>
</RevenueCatProvider>
```

- [ ] **Step 2: Remove useNavigation from NotificationContext.tsx**

In `src/context/NotificationContext.tsx`, remove the `useNavigation` import and the `navigation` variable. Remove the entire `handleNotificationResponse` function and the listener setup effect. These will move to the Navigation component in a later step.

Remove these lines:
- `import { useNavigation } from '@react-navigation/native';`
- `const navigation = useNavigation();`
- The entire `useEffect` block that sets up `handleNotificationResponse` and `addNotificationListeners`
- The `listenerCleanup` ref

- [ ] **Step 3: Move notification tap handling to Navigation component**

In `src/navigation/index.tsx`, add the notification tap listener inside the `Navigation` component, after the `NavigationContainer` renders (using a `ref`). Add to imports:

```typescript
import { NavigationContainer, DarkTheme, getFocusedRouteNameFromRoute, NavigatorScreenParams, LinkingOptions, useNavigationContainerRef } from '@react-navigation/native';
import { addNotificationListeners } from '../services/notificationService';
```

In the `Navigation` component, add a navigation ref and notification response handler:

```typescript
const navigationRef = useNavigationContainerRef<RootStackParamList>();

useEffect(() => {
    const cleanup = addNotificationListeners(
        () => {}, // foreground notification — no action needed
        (response) => {
            const data = response.notification.request.content.data;
            if (!navigationRef.current) return;
            const nav = navigationRef.current as any;

            if (data?.type === 'squad_request' || data?.type === 'squad_accept') {
                nav.navigate('Main', {
                    screen: 'Squad',
                    params: { screen: 'SquadMain', params: { initialTab: 'members' } },
                });
            } else if (data?.type === 'comment' && data?.postId) {
                nav.navigate('Comments', { postId: data.postId });
            } else if (data?.type === 'lfg' || data?.type === 'squad_post') {
                nav.navigate('Main', { screen: 'Squad' });
            } else if ((data?.type === 'event_invite' || data?.type === 'event_soon' || data?.type === 'workout_reminder') && data?.eventId) {
                nav.navigate('EventDetail', { id: data.eventId });
            }
        }
    );
    return cleanup;
}, []);
```

Pass `ref={navigationRef}` to `NavigationContainer`:

```tsx
<NavigationContainer theme={DarkTheme} linking={linking} ref={navigationRef}>
```

- [ ] **Step 4: Clear push token on sign-out**

In `src/context/AuthContext.tsx`, import `clearPushToken`:

```typescript
import { clearPushToken } from '../services/notificationService';
```

In the `signOut` function, clear the token before signing out:

```typescript
const signOut = async () => {
    if (user?.id) {
        await clearPushToken(user.id);
    }
    const { error } = await supabase.auth.signOut();
    return { error };
};
```

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/context/NotificationContext.tsx src/navigation/index.tsx src/context/AuthContext.tsx
git commit -m "feat: wire up notification provider and tap navigation"
```

---

### Task 7: Add Badge Count to AppHeader Bell Icon

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Add unread count badge**

Add the import:

```typescript
import { useNotifications } from '../context/NotificationContext';
```

Inside the component, get the unread count:

```typescript
const { unreadCount } = useNotifications();
```

Replace the bell `Pressable` with a version that includes a badge:

```tsx
<Pressable style={styles.iconButton} onPress={handleBell}>
    <View>
        <Feather
            name="bell"
            size={22}
            color={themeColors.textPrimary}
        />
        {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: userColors.accent_color }]}>
                <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
            </View>
        )}
    </View>
</Pressable>
```

Add badge styles:

```typescript
badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
},
badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
},
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add unread notification badge to bell icon"
```

---

### Task 8: Rebuild NotificationsScreen — Grouped List with Inline Actions

**Files:**
- Rewrite: `src/screens/NotificationsScreen.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    Pressable,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { useSquad } from '../hooks/useSquad';
import { useSquadEvents } from '../hooks/useSquadEvents';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';
import { formatRelativeTime } from '../hooks/useActivityFeed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, any>;
    read: boolean;
    acted: boolean;
    created_at: string;
    // Joined from athlete_profiles
    actor_name?: string;
    actor_avatar?: string;
}

interface NotificationSection {
    title: string;
    icon: string;
    unreadCount: number;
    data: NotificationItem[];
}

const SQUAD_TYPES = ['squad_request', 'squad_accept', 'comment', 'lfg', 'squad_post'];
const EVENT_TYPES = ['event_invite', 'event_soon'];
const TRAINING_TYPES = ['workout_reminder'];

export default function NotificationsScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const { markAllRead, refreshUnreadCount } = useNotifications();
    const { addSquadMember, removeSquadMember, loadSquad } = useSquad();
    const { joinEvent } = useSquadEvents();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actingOn, setActingOn] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Get unique actor user IDs from notification data
            const actorIds = [...new Set(
                (data || [])
                    .map((n: any) => n.data?.userId)
                    .filter(Boolean)
            )];

            // Fetch actor profiles
            let profileMap = new Map();
            if (actorIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('athlete_profiles')
                    .select('user_id, display_name, avatar_url')
                    .in('user_id', actorIds);

                profiles?.forEach((p: any) => {
                    profileMap.set(p.user_id, p);
                });
            }

            // Enrich notifications with actor info
            const enriched: NotificationItem[] = (data || []).map((n: any) => {
                const actor = profileMap.get(n.data?.userId);
                return {
                    ...n,
                    actor_name: actor?.display_name,
                    actor_avatar: actor?.avatar_url,
                };
            });

            setNotifications(enriched);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Mark all as read when screen opens (after a short delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            markAllRead();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        await refreshUnreadCount();
        setRefreshing(false);
    };

    const handleAcceptSquadRequest = async (notification: NotificationItem) => {
        if (!notification.data?.userId) return;
        setActingOn(notification.id);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        await addSquadMember(notification.data.userId);
        await loadSquad();

        // Mark as acted
        await supabase
            .from('notifications')
            .update({ acted: true })
            .eq('id', notification.id);

        // Update local state
        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, acted: true } : n)
        );
        setActingOn(null);
    };

    const handleDeclineSquadRequest = async (notification: NotificationItem) => {
        setActingOn(notification.id);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Mark as acted (decline = just dismiss)
        await supabase
            .from('notifications')
            .update({ acted: true })
            .eq('id', notification.id);

        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, acted: true } : n)
        );
        setActingOn(null);
    };

    const handleJoinEvent = async (notification: NotificationItem) => {
        if (!notification.data?.eventId) return;
        setActingOn(notification.id);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        await joinEvent(notification.data.eventId);

        await supabase
            .from('notifications')
            .update({ acted: true })
            .eq('id', notification.id);

        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, acted: true } : n)
        );
        setActingOn(null);
    };

    const handleNotificationPress = (notification: NotificationItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { type, data } = notification;

        if (type === 'squad_request' || type === 'squad_accept') {
            (navigation as any).navigate('Main', {
                screen: 'Squad',
                params: { screen: 'SquadMain', params: { initialTab: 'members' } },
            });
        } else if (type === 'comment' && data?.postId) {
            (navigation as any).navigate('Comments', { postId: data.postId });
        } else if ((type === 'lfg' || type === 'squad_post') && data?.postId) {
            (navigation as any).navigate('Main', { screen: 'Squad' });
        } else if ((type === 'event_invite' || type === 'event_soon' || type === 'workout_reminder') && data?.eventId) {
            (navigation as any).navigate('EventDetail', { id: data.eventId });
        }
    };

    const getNotificationIcon = (type: string): string => {
        switch (type) {
            case 'squad_request': return 'user-plus';
            case 'squad_accept': return 'user-check';
            case 'comment': return 'message-circle';
            case 'lfg': return 'zap';
            case 'squad_post': return 'edit-3';
            case 'event_invite': return 'calendar';
            case 'event_soon': return 'clock';
            case 'workout_reminder': return 'activity';
            default: return 'bell';
        }
    };

    // Build sections
    const buildSections = (): NotificationSection[] => {
        const sections: NotificationSection[] = [];

        const squadNotifs = notifications.filter(n => SQUAD_TYPES.includes(n.type));
        const eventNotifs = notifications.filter(n => EVENT_TYPES.includes(n.type));
        const trainingNotifs = notifications.filter(n => TRAINING_TYPES.includes(n.type));

        if (squadNotifs.length > 0) {
            sections.push({
                title: 'Squad',
                icon: 'users',
                unreadCount: squadNotifs.filter(n => !n.read).length,
                data: squadNotifs,
            });
        }
        if (eventNotifs.length > 0) {
            sections.push({
                title: 'Events',
                icon: 'calendar',
                unreadCount: eventNotifs.filter(n => !n.read).length,
                data: eventNotifs,
            });
        }
        if (trainingNotifs.length > 0) {
            sections.push({
                title: 'Training',
                icon: 'activity',
                unreadCount: trainingNotifs.filter(n => !n.read).length,
                data: trainingNotifs,
            });
        }

        return sections;
    };

    const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
        <View style={[styles.sectionHeader, { backgroundColor: themeColors.bgPrimary }]}>
            <Feather name={section.icon as any} size={14} color={userColors.accent_color} />
            <Text style={[styles.sectionTitle, { color: userColors.accent_color }]}>
                {section.title}
            </Text>
            {section.unreadCount > 0 && (
                <View style={[styles.sectionBadge, { backgroundColor: userColors.accent_color }]}>
                    <Text style={styles.sectionBadgeText}>{section.unreadCount}</Text>
                </View>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: NotificationItem }) => {
        const isUnread = !item.read;
        const isActing = actingOn === item.id;

        return (
            <Pressable
                style={[
                    styles.notificationItem,
                    isUnread && { backgroundColor: `${userColors.accent_color}10` },
                ]}
                onPress={() => handleNotificationPress(item)}
                disabled={item.type === 'squad_request' && !item.acted}
            >
                <View style={styles.notificationRow}>
                    {/* Avatar or icon */}
                    {item.actor_avatar ? (
                        <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.iconCircle, { backgroundColor: themeColors.bgTertiary }]}>
                            <Feather
                                name={getNotificationIcon(item.type) as any}
                                size={16}
                                color={isUnread ? userColors.accent_color : themeColors.textMuted}
                            />
                        </View>
                    )}

                    {/* Content */}
                    <View style={styles.notificationContent}>
                        <Text
                            style={[
                                styles.notificationBody,
                                { color: isUnread ? themeColors.textPrimary : themeColors.textSecondary },
                            ]}
                            numberOfLines={2}
                        >
                            {item.body}
                        </Text>
                        <Text style={[styles.timestamp, { color: themeColors.textMuted }]}>
                            {formatRelativeTime(item.created_at)}
                        </Text>
                    </View>

                    {/* Unread dot */}
                    {isUnread && (
                        <View style={[styles.unreadDot, { backgroundColor: userColors.accent_color }]} />
                    )}
                </View>

                {/* Inline actions for squad requests */}
                {item.type === 'squad_request' && !item.acted && (
                    <View style={styles.actionButtons}>
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: userColors.accent_color }]}
                            onPress={() => handleAcceptSquadRequest(item)}
                            disabled={isActing}
                        >
                            {isActing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.actionBtnText}>Accept</Text>
                            )}
                        </Pressable>
                        <Pressable
                            style={[styles.actionBtn, styles.actionBtnOutlined, { borderColor: themeColors.glassBorder }]}
                            onPress={() => handleDeclineSquadRequest(item)}
                            disabled={isActing}
                        >
                            <Text style={[styles.actionBtnTextOutlined, { color: themeColors.textSecondary }]}>Decline</Text>
                        </Pressable>
                    </View>
                )}

                {/* Acted state for squad requests */}
                {item.type === 'squad_request' && item.acted && (
                    <Text style={[styles.actedText, { color: themeColors.textMuted }]}>Responded</Text>
                )}

                {/* Inline actions for event invites */}
                {item.type === 'event_invite' && !item.acted && (
                    <View style={styles.actionButtons}>
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: userColors.accent_color }]}
                            onPress={() => handleJoinEvent(item)}
                            disabled={isActing}
                        >
                            {isActing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.actionBtnText}>Join Event</Text>
                            )}
                        </Pressable>
                        <Pressable
                            style={[styles.actionBtn, styles.actionBtnOutlined, { borderColor: themeColors.glassBorder }]}
                            onPress={() => handleNotificationPress(item)}
                        >
                            <Text style={[styles.actionBtnTextOutlined, { color: themeColors.textSecondary }]}>View Details</Text>
                        </Pressable>
                    </View>
                )}

                {item.type === 'event_invite' && item.acted && (
                    <Text style={[styles.actedText, { color: themeColors.textMuted }]}>Joined</Text>
                )}
            </Pressable>
        );
    };

    const sections = buildSections();
    const hasUnread = notifications.some(n => !n.read);

    return (
        <ScreenLayout hideHeader>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: themeColors.glassBorder }]}>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Notifications</Text>
                <Pressable
                    onPress={() => (navigation as any).navigate('NotificationSettings')}
                    style={styles.headerIcon}
                >
                    <Feather name="settings" size={20} color={themeColors.textSecondary} />
                </Pressable>
            </View>

            {/* Mark all read */}
            {hasUnread && (
                <Pressable style={styles.markAllRow} onPress={markAllRead}>
                    <Text style={[styles.markAllText, { color: userColors.accent_color }]}>Mark all as read</Text>
                </Pressable>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={userColors.accent_color} />
                </View>
            ) : sections.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="bell-off" size={48} color={themeColors.textMuted} />
                    <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                        No notifications yet
                    </Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={userColors.accent_color}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                />
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    headerIcon: {
        padding: spacing.xs,
    },
    markAllRow: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: 'flex-end',
    },
    markAllText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    emptyText: {
        fontSize: typography.sizes.base,
    },
    listContent: {
        paddingBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    sectionBadgeText: {
        color: '#0a141f',
        fontSize: 10,
        fontWeight: '700',
    },
    notificationItem: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationContent: {
        flex: 1,
    },
    notificationBody: {
        fontSize: typography.sizes.sm,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
        marginLeft: 44, // align with content (avatar width + gap)
    },
    actionBtn: {
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnOutlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    actionBtnText: {
        color: '#0a141f',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    actionBtnTextOutlined: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    actedText: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
        marginLeft: 44,
        fontStyle: 'italic',
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/NotificationsScreen.tsx
git commit -m "feat: grouped notifications screen with inline actions"
```

---

### Task 9: Rewrite NotificationSettingsScreen — 8 Toggles + Sound

**Files:**
- Rewrite: `src/screens/NotificationSettingsScreen.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import ScreenLayout from '../components/ScreenLayout';
import { useAlert } from '../components/CustomAlert';
import { spacing, radii, typography } from '../theme';

export default function NotificationSettingsScreen() {
    const navigation = useNavigation();
    const { themeColors, colors: userColors } = useTheme();
    const {
        preferences,
        updatePreferences,
        isRegistered,
        registerForNotifications,
    } = useNotifications();

    const [loading, setLoading] = useState(false);
    const [registeringPush, setRegisteringPush] = useState(false);
    const { showAlert } = useAlert();

    const handleEnablePush = async () => {
        setRegisteringPush(true);
        const success = await registerForNotifications();
        setRegisteringPush(false);

        if (!success) {
            showAlert({
                title: 'Notifications Disabled',
                message: 'Please enable notifications in your device settings to receive workout reminders and squad activity updates.',
            });
        }
    };

    const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
        setLoading(true);
        await updatePreferences({ [key]: value });
        setLoading(false);
    };

    const handleSoundToggle = async () => {
        const newSound = preferences.sound === 'custom' ? 'default' : 'custom';
        await updatePreferences({ sound: newSound });
    };

    const ToggleRow = ({ icon, label, description, prefKey }: {
        icon: string;
        label: string;
        description: string;
        prefKey: keyof typeof preferences;
    }) => (
        <View style={styles.toggleItem}>
            <View style={styles.toggleInfo}>
                <Feather name={icon as any} size={18} color={themeColors.textSecondary} />
                <View style={styles.toggleText}>
                    <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>{label}</Text>
                    <Text style={[styles.toggleDesc, { color: themeColors.textMuted }]}>{description}</Text>
                </View>
            </View>
            <Switch
                value={preferences[prefKey] as boolean}
                onValueChange={(v) => handleToggle(prefKey, v)}
                trackColor={{ false: themeColors.bgTertiary, true: `${userColors.accent_color}50` }}
                thumbColor={preferences[prefKey] ? userColors.accent_color : themeColors.textMuted}
                disabled={loading}
            />
        </View>
    );

    return (
        <ScreenLayout hideHeader>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: themeColors.glassBorder }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={themeColors.textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Notification Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Push Notification Status */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="bell" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Push Notifications</Text>
                    </View>

                    {isRegistered ? (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                                <Feather name="check-circle" size={16} color="#10b981" />
                                <Text style={[styles.statusText, { color: '#10b981' }]}>Enabled</Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                You'll receive notifications on this device
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#f5970620' }]}>
                                <Feather name="alert-circle" size={16} color="#f59706" />
                                <Text style={[styles.statusText, { color: '#f59706' }]}>Not Enabled</Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                Enable to receive push notifications
                            </Text>
                            <Pressable
                                style={[styles.enableButton, { backgroundColor: userColors.accent_color }]}
                                onPress={handleEnablePush}
                                disabled={registeringPush}
                            >
                                {registeringPush ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.enableButtonText}>Enable Notifications</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Sound */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="volume-2" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Sound</Text>
                    </View>
                    <Pressable style={styles.soundToggle} onPress={handleSoundToggle}>
                        <View style={[
                            styles.soundOption,
                            preferences.sound === 'custom' && { backgroundColor: `${userColors.accent_color}20`, borderColor: userColors.accent_color },
                            { borderColor: themeColors.glassBorder },
                        ]}>
                            <Text style={[styles.soundLabel, {
                                color: preferences.sound === 'custom' ? userColors.accent_color : themeColors.textSecondary,
                            }]}>Custom (HYBRID)</Text>
                        </View>
                        <View style={[
                            styles.soundOption,
                            preferences.sound === 'default' && { backgroundColor: `${userColors.accent_color}20`, borderColor: userColors.accent_color },
                            { borderColor: themeColors.glassBorder },
                        ]}>
                            <Text style={[styles.soundLabel, {
                                color: preferences.sound === 'default' ? userColors.accent_color : themeColors.textSecondary,
                            }]}>System Default</Text>
                        </View>
                    </Pressable>
                </View>

                {/* Squad Activity */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="users" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Squad Activity</Text>
                    </View>
                    <ToggleRow icon="user-plus" label="Squad Requests" description="Someone sends or accepts a request" prefKey="squadRequests" />
                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                    <ToggleRow icon="message-circle" label="Comments" description="Someone comments on your post" prefKey="comments" />
                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                    <ToggleRow icon="zap" label="LFG Reactions" description="Someone reacts LFG to your post" prefKey="lfgReactions" />
                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                    <ToggleRow icon="edit-3" label="Squad Posts" description="Someone in your squad posts" prefKey="squadPosts" />
                </View>

                {/* Events */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="calendar" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Events</Text>
                    </View>
                    <ToggleRow icon="mail" label="Event Invites" description="Someone invites you to an event" prefKey="eventInvites" />
                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                    <ToggleRow icon="clock" label="Event Starting Soon" description="Reminder before an event" prefKey="eventSoon" />
                </View>

                {/* Training */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="activity" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Training</Text>
                    </View>
                    <ToggleRow icon="bell" label="Workout Reminders" description="Reminder before a training workout" prefKey="workoutReminders" />
                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                    <ToggleRow icon="check-square" label="Check-In Reminders" description="Periodic training progress nudges" prefKey="checkInReminders" />
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    section: {
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    statusRow: {
        gap: spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        gap: 6,
    },
    statusText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    statusHint: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    enableButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    enableButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    soundToggle: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    soundOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    soundLabel: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        gap: spacing.sm,
        marginRight: spacing.md,
    },
    toggleText: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    toggleDesc: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginVertical: spacing.xs,
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/NotificationSettingsScreen.tsx
git commit -m "feat: notification settings with 8 toggles and sound preference"
```

---

### Task 10: Add Notification Settings Row to SettingsScreen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Add a Notification Settings row in the Account section**

In `src/screens/SettingsScreen.tsx`, find the Account section (around line 451). After the "Change Password" row and before the closing `</View>` of the section content, add:

```tsx
<View style={[styles.divider, { marginVertical: 0 }]} />
<SettingsRow
    icon="bell"
    label="Notification Settings"
    onPress={() => navigation.navigate('NotificationSettings')}
/>
```

This goes right after line 457 (`<SettingsRow icon="lock" label="Change Password" ...`).

- [ ] **Step 2: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add notification settings link to settings screen"
```

---

### Task 11: Build New EAS Development Build

This task is manual — requires the developer to run EAS build commands.

- [ ] **Step 1: Bump build number in app.json**

Increment `buildNumber` (iOS) and `versionCode` (Android) in `app.json`. Currently at `20`, change to `21`.

- [ ] **Step 2: Create a development build to test**

```bash
eas build --profile development --platform ios
```

Wait for the build to complete. Install on your device via the QR code or download link.

- [ ] **Step 3: Test push notification registration**

Open the app. The `NotificationContext` will automatically request permissions and register the push token. Check:
- Permission dialog appears
- After granting, check Supabase `athlete_profiles` table — your row should have a non-null `push_token` starting with `ExponentPushToken[`

- [ ] **Step 4: Test the full push chain**

Have a friend (or use a second account) send you a squad request. You should:
- Receive a push notification banner on your phone
- See the bell icon badge increment
- See the notification in the grouped list when you tap the bell
- See Accept/Decline buttons on the squad request notification

- [ ] **Step 5: Commit build number bump**

```bash
git add app.json
git commit -m "build: bump buildNumber to 21 for push notifications"
```
