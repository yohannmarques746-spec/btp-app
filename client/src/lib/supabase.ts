import { supabase } from './supabaseClient';

// Supabase client configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hvnjlxxcxfxvuwlmnwtw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bmpseHhjeGZ4dnV3bG1ud3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzA3ODIsImV4cCI6MjA3OTU0Njc4Mn0.SmL4eqGq8XLfbLOolxGdafLhS6eeTgYGGn1w9gcrWdU';

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
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

    if (error || !data) return null;
    return data;
  } catch (error) {
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
  return crypto.randomUUID() + '-' + Date.now().toString(36);
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

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error updating admin code:', error);
    return null;
  }
}

