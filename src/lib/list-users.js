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

  const { organizationId, requesterId } = req.body;

  if (!organizationId || !requesterId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Verify the requester belongs to this organization (any role may view the list)
  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', requesterId)
    .single();

  if (requesterError || !requesterProfile || requesterProfile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, role, full_name, created_at, must_change_password, is_active')
    .eq('organization_id', organizationId)
    .order('created_at');

  if (profilesError) {
    return res.status(400).json({ error: profilesError.message });
  }

  // Fetch emails and last sign-in time from auth.users for each profile id
  const usersWithEmail = await Promise.all(
    (profiles || []).map(async (p) => {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id);
      return { ...p, email: authUser?.user?.email || null, last_sign_in_at: authUser?.user?.last_sign_in_at || null };
    })
  );

  return res.status(200).json({ users: usersWithEmail });
}
