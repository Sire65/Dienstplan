// KC DP2 -> KC Communication
// Uses DP2's already authenticated Supabase client. No provider secrets belong here.
export function createKcCommunication(supabaseClient) {
  if (!supabaseClient?.functions?.invoke) throw new Error('Supabase client fehlt');
  const SOURCE = 'kc-dp2';
  const ORG_ID = 'KC_WERNE';

  async function send(eventKey, recipients, variables = {}, options = {}) {
    const body = {
      sourceProgram: SOURCE,
      eventKey,
      orgId: options.orgId || ORG_ID,
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

  async function currentUserRecipient() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user?.id) throw error || new Error('Kein angemeldeter Benutzer');
    return [{ userId: data.user.id, email: data.user.email || null }];
  }

  return {
    send,
    async testPush(message='KC DP2 Test-Push') {
      return send('shift_changed', await currentUserRecipient(), { title:'KC DP2', body:message, message }, { testOnly:true });
    },
    shiftChanged: (recipients, variables) => send('shift_changed', recipients, variables),
    planReleased: (variables, options={}) => send('plan_released', [], variables, { ...options, orgId: options.orgId || ORG_ID }),
    replacementRequested: (recipients, variables) => send('replacement_requested', recipients, variables, { priority:'high' })
  };
}
