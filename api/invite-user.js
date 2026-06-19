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

  const { email, fullName, role, organizationId, requesterId } = req.body;

  if (!email || !role || !organizationId || !requesterId) {
    return res.status(400).json({ error: 'Ontbrekende velden' });
  }

  if (!['admin', 'manager', 'auditor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Ongeldige rol' });
  }

  // Verify the requester is actually an admin of this organization before allowing the action
  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', requesterId)
    .single();

  if (requesterError || !requesterProfile || requesterProfile.role !== 'admin' || requesterProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Niet bevoegd om gebruikers aan te maken voor deze organisatie' });
  }

  // Invite the user by email - Supabase sends a secure magic link, no password
  // ever passes through our hands or theirs over an insecure channel like email/chat.
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.VITE_SITE_URL || 'https://autrex360.vercel.app'}/reset-password`,
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  // Create the matching profile - must_change_password stays true by default,
  // though for invited users the link itself already forces setting a fresh password.
  const { error: profileError } = await supabaseAdmin.from('user_profiles').insert([{
    id: newUser.user.id,
    organization_id: organizationId,
    role,
    full_name: fullName || null,
    must_change_password: true,
  }]);

  if (profileError) {
    // Roll back the auth user if the profile insert failed, to avoid orphaned accounts
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  return res.status(200).json({ success: true, userId: newUser.user.id });
}
