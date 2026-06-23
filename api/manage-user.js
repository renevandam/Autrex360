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
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', requesterId)
    .single();

  if (requesterError || !requesterProfile || requesterProfile.role !== 'admin' || requesterProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id')
    .eq('id', targetUserId)
    .single();

  if (targetError || !targetProfile || targetProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'User does not belong to this organization' });
  }

  if (action === 'updateRole') {
    if (!['admin', 'manager', 'auditor', 'viewer', 'guest_auditor'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const { error } = await supabaseAdmin.from('user_profiles').update({ role: newRole }).eq('id', targetUserId);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (action === 'delete') {
    if (targetUserId === requesterId) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }
    await supabaseAdmin.from('user_profiles').delete().eq('id', targetUserId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (action === 'deactivate') {
    if (targetUserId === requesterId) {
      return res.status(400).json({ error: 'You cannot deactivate yourself' });
    }
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' });
    if (banError) return res.status(400).json({ error: banError.message });
    const { error: profileError } = await supabaseAdmin.from('user_profiles').update({ is_active: false }).eq('id', targetUserId);
    if (profileError) return res.status(400).json({ error: profileError.message });
    return res.status(200).json({ success: true });
  }

  if (action === 'reactivate') {
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: 'none' });
    if (unbanError) return res.status(400).json({ error: unbanError.message });
    const { error: profileError } = await supabaseAdmin.from('user_profiles').update({ is_active: true }).eq('id', targetUserId);
    if (profileError) return res.status(400).json({ error: profileError.message });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}