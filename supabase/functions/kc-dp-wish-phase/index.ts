// Production source is deployed as Supabase Edge Function `kc-dp-wish-phase`.
// It owns the server-side Wunschphase deadline, reminder dispatch and automatic closure.
// Database schema: supabase/migrations/20260820105000_wish_phase_notifications_v01952.sql
// Scheduler: supabase/migrations/20260820105500_wish_phase_scheduler_v01952.sql
//
// Runtime behavior:
// - authenticated active members may read status
// - planner/duty_manager/admin may set deadline/reminder days, close or reopen
// - cron calls `scheduled` every five minutes using kc_dp_nightly_push_secret
// - reminder events are idempotent via kc_dp_wish_phase_notification_runs
// - Push uses existing KC DP2 VAPID subscriptions
// - E-mail uses KC_DP_RESEND_API_KEY/RESEND_API_KEY when configured; otherwise the API reports emailReady=false and never pretends mail was sent.

// NOTE: The deployed function is intentionally maintained through Supabase deployment tooling.
// This repository marker documents the contract and keeps release review aware of the server component.
export const KC_DP_WISH_PHASE_FUNCTION_VERSION = '1.0.0';
