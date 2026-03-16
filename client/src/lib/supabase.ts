import { supabase } from './supabaseClient';

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  // #region agent log
  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H1',location:'client/src/lib/supabase.ts:6',message:'getCurrentUserId resolved',data:{hasUser:Boolean(user)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return user?.id || null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: 'actif' | 'inactif';
  login_code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'actif')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Generate a random 6-digit code if not provided
    const loginCode = member.login_code || Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...member,
        login_code: loginCode,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating team member:', error);
    return null;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error deleting team member:', error);
    return false;
  }
}

export async function verifyTeamMemberCode(code: string, invitationToken?: string): Promise<TeamMember | null> {
  try {
    // Si un token d'invitation est fourni, on peut vérifier sans auth
    if (invitationToken) {
      // D'abord, vérifier que l'invitation est valide
      const invitation = await getInvitationByToken(invitationToken);
      if (!invitation) return null;

      // Ensuite, vérifier le code pour ce membre spécifique
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', invitation.team_member_id)
        .eq('login_code', code)
        .eq('status', 'actif')
        .single();

      if (error || !data) return null;
      return data;
    }

    // Sinon, vérification normale avec auth
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('login_code', code)
      .eq('status', 'actif')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error('Error verifying code:', error);
    return null;
  }
}

// Admin code functions
export interface AdminCode {
  id: string;
  code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('code', code)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error verifying admin code:', error);
    return false;
  }
}

export async function getAdminCode(): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H2',location:'client/src/lib/supabase.ts:191',message:'getAdminCode query result',data:{hasData:Boolean(data),errorMessage:error?.message||null,errorCode:(error as { code?: string } | null)?.code||null,errorDetails:(error as { details?: string } | null)?.details||null,errorHint:(error as { hint?: string } | null)?.hint||null,errorStatus:(error as { status?: number } | null)?.status||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (error || !data) return null;
    return data;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H2',location:'client/src/lib/supabase.ts:198',message:'getAdminCode exception',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error getting admin code:', error);
    return null;
  }
}

// Team Invitation functions
export interface TeamInvitation {
  id: string;
  user_id: string;
  team_member_id: string | null;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

// Générer un token unique pour l'invitation
function generateInvitationToken(): string {
  const hasRandomUUID =
    typeof crypto !== 'undefined' &&
    typeof (crypto as { randomUUID?: unknown }).randomUUID === 'function';

  if (hasRandomUUID) {
    try {
      return `${crypto.randomUUID()}-${Date.now().toString(36)}`;
    } catch {
      // Fallback below
    }
  }

  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `inv_${fallback}`;
}

// Créer une invitation pour un membre d'équipe
export async function createTeamInvitation(
  teamMemberId: string,
  email: string
): Promise<{ invitation: TeamInvitation | null; inviteLink: string | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        user_id: userId,
        team_member_id: teamMemberId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Générer le lien d'invitation
    const inviteLink = `${window.location.origin}/invite/${token}`;

    return { invitation: data, inviteLink };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { invitation: null, inviteLink: null };
  }
}

// Vérifier et récupérer une invitation par token
export async function getInvitationByToken(
  token: string
): Promise<TeamInvitation | null> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !data) return null;

    // Vérifier si l'invitation a expiré
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting invitation:', error);
    return null;
  }
}

// Marquer une invitation comme utilisée
export async function markInvitationAsUsed(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .update({
        used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token);

    return !error;
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    return false;
  }
}

export async function updateAdminCode(newCode: string): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H3',location:'client/src/lib/supabase.ts:321',message:'updateAdminCode called',data:{hasUserId:Boolean(userId),newCodeLength:newCode?.trim().length||0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // First, get the existing admin code
    const existing = await getAdminCode();
    
    if (existing) {
      // Update existing code
      const { data, error } = await supabase
        .from('admin_codes')
        .update({
          code: newCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H4',location:'client/src/lib/supabase.ts:342',message:'update admin_codes result',data:{hasData:Boolean(data),errorMessage:error?.message||null,errorCode:(error as { code?: string } | null)?.code||null,errorDetails:(error as { details?: string } | null)?.details||null,errorHint:(error as { hint?: string } | null)?.hint||null,errorStatus:(error as { status?: number } | null)?.status||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (error) throw error;
      return data;
    } else {
      // Create new admin code
      const { data, error } = await supabase
        .from('admin_codes')
        .insert({
          code: newCode,
          user_id: userId,
        })
        .select()
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H5',location:'client/src/lib/supabase.ts:357',message:'insert admin_codes result',data:{hasData:Boolean(data),errorMessage:error?.message||null,errorCode:(error as { code?: string } | null)?.code||null,errorDetails:(error as { details?: string } | null)?.details||null,errorHint:(error as { hint?: string } | null)?.hint||null,errorStatus:(error as { status?: number } | null)?.status||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (error) throw error;
      return data;
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'admin-code-debug-1',hypothesisId:'H3',location:'client/src/lib/supabase.ts:364',message:'updateAdminCode exception',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error updating admin code:', error);
    return null;
  }
}

