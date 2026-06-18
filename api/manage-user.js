import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, targetUserId, newRole, organizationId, requesterId } = req.body;

  if (!action || !targetUserId || !organizationId || !requesterId) {
    return res.status(400).json({ error: 'Ontbrekende velden' });
  }

  // Verify the requester is an admin of this organization
  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', requesterId)
    .single();

  if (requesterError || !requesterProfile || requesterProfile.role !== 'admin' || requesterProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Niet bevoegd' });
  }

  // Verify the target user actually belongs to this organization, to avoid cross-org actions
  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id')
    .eq('id', targetUserId)
    .single();

  if (targetError || !targetProfile || targetProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Gebruiker hoort niet bij deze organisatie' });
  }

  if (action === 'updateRole') {
    if (!['admin', 'manager', 'auditor', 'viewer'].includes(newRole)) {
      return res.status(400).json({ error: 'Ongeldige rol' });
    }
    const { error } = await supabaseAdmin.from('user_profiles').update({ role: newRole }).eq('id', targetUserId);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (action === 'delete') {
    if (targetUserId === requesterId) {
      return res.status(400).json({ error: 'Je kunt jezelf niet verwijderen' });
    }
    await supabaseAdmin.from('user_profiles').delete().eq('id', targetUserId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Onbekende actie' });
}
