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

  const { email, password, fullName, role, organizationId, requesterId } = req.body;

  if (!email || !password || !role || !organizationId || !requesterId) {
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

  // Create the auth user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  // Create the matching profile
  const { error: profileError } = await supabaseAdmin.from('user_profiles').insert([{
    id: newUser.user.id,
    organization_id: organizationId,
    role,
    full_name: fullName || null,
  }]);

  if (profileError) {
    // Roll back the auth user if the profile insert failed, to avoid orphaned accounts
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  return res.status(200).json({ success: true, userId: newUser.user.id });
}
