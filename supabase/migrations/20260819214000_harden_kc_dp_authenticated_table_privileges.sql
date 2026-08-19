-- KC DP2 browser-role least-privilege hardening.
-- RLS controls row DML, but TRUNCATE is outside row-level policy enforcement.

revoke truncate, trigger, references on table
  public.kc_dp_devices,
  public.kc_dp_push_deliveries,
  public.kc_dp_push_schedule_settings,
  public.kc_dp_push_subscriptions,
  public.kc_dp_sync_conflicts,
  public.kc_dp_sync_test_runs
from authenticated;

-- Delivery state is maintained server-side / through the SECURITY DEFINER receipt RPC.
revoke insert, update, delete on table public.kc_dp_push_deliveries from authenticated;

-- No DELETE RLS policy exists or is required for these browser-facing tables.
revoke delete on table
  public.kc_dp_push_subscriptions,
  public.kc_dp_sync_conflicts,
  public.kc_dp_sync_test_runs
from authenticated;
