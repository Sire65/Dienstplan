// KC DP2 -> KC Communication
// Uses the already authenticated Supabase client from DP2. No secret keys belong here.
export function createKcCommunication(supabaseClient) {
  if (!supabaseClient?.functions?.invoke) throw new Error('Supabase client fehlt');
  const SOURCE = 'kc-dp2';
  async function send(eventKey, recipients, variables = {}, options = {}) {
    const body = {
      sourceProgram: SOURCE,
      eventKey,
      recipients: Array.isArray(recipients) ? recipients : [],
      variables,
      priority: options.priority || 'normal',
      testOnly: options.testOnly === true,
      correlationId: options.correlationId || `dp2-${Date.now()}-${Math.random().toString(16).slice(2)}`
    };
    const { data, error } = await supabaseClient.functions.invoke('kc-communication-router', { body });
    if (error) throw error;
    return data;
  }
  return {
    send,
    testPush: (recipients, message='KC DP2 Test-Push') => send('shift_changed', recipients, { title:'KC DP2', body:message, message }, { testOnly:true }),
    shiftChanged: (recipients, variables) => send('shift_changed', recipients, variables),
    planReleased: (recipients, variables) => send('plan_released', recipients, variables),
    replacementRequested: (recipients, variables) => send('replacement_requested', recipients, variables, { priority:'high' })
  };
}
