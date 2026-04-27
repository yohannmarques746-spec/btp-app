import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Projet Supabase cible (même ref que le MCP Cursor : project_ref=uowsssvaobrpdpnhxgwc).
 * Les données de l’app passent par l’API REST du projet, pas par l’URL MCP
 * (https://mcp.supabase.com/mcp?... est réservé aux outils d’IDE).
 */
const SUPABASE_PROJECT_REF = "uowsssvaobrpdpnhxgwc";
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

const SUPABASE_URL =
  (typeof import.meta.env.VITE_SUPABASE_URL === "string" ? import.meta.env.VITE_SUPABASE_URL.trim() : "") ||
  DEFAULT_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === "string"
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : "";

if (!SUPABASE_ANON_KEY && import.meta.env.DEV) {
  console.error(
    `[CALDY] Définissez VITE_SUPABASE_ANON_KEY dans .env (clé « anon public » du projet ${SUPABASE_PROJECT_REF} : Dashboard → Project Settings → API).`,
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** ID utilisateur Supabase Auth (pour `user_id` sur les tables métier). */
export async function getCurrentUserId(): Promise<string | null> {
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
      .maybeSingle();

    if (error) return null;
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

export type UpdateAdminCodeResult =
  | { ok: true; data: AdminCode }
  | { ok: false; error: string };

/** PostgREST PGRST205 = table absente du cache schéma (souvent table jamais créée). */
function formatAdminCodesTableError(err: { code?: string; message?: string }): string {
  const missing =
    err.code === "PGRST205" ||
    (err.message?.includes("Could not find the table") &&
      err.message?.includes("admin_codes"));
  if (missing) {
    return (
      "La table public.admin_codes n’existe pas sur ce projet Supabase. " +
      "Ouvrez le SQL Editor et exécutez supabase/migrations/20250322130000_caldy_full_schema.sql (schéma complet), puis réessayez."
    );
  }
  return err.message ?? "Erreur base de données";
}

export async function updateAdminCode(newCode: string): Promise<UpdateAdminCodeResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        ok: false,
        error:
          "Session expirée ou absente. Reconnectez-vous depuis la page d’authentification, puis réessayez.",
      };
    }

    const existing = await getAdminCode();

    if (existing) {
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

      if (error) {
        console.error('Error updating admin code:', error);
        return { ok: false, error: formatAdminCodesTableError(error) };
      }
      if (!data) return { ok: false, error: "Aucune ligne mise à jour." };
      return { ok: true, data };
    }

    const { data, error } = await supabase
      .from('admin_codes')
      .insert({
        code: newCode,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting admin code:', error);
      return { ok: false, error: formatAdminCodesTableError(error) };
    }
    if (!data) return { ok: false, error: "Insertion refusée par la base." };
    return { ok: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error updating admin code:', error);
    return { ok: false, error: msg };
  }
}

