export interface CrmProspect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string;
  /** Id client Supabase lorsque le prospect vient de l’app Clients */
  clientId?: string;
}

export interface CrmColumn {
  id: string;
  name: string;
  items: CrmProspect[];
}

export interface PendingSendContext {
  prospect: CrmProspect;
  targetColumn: string;
  chantierId?: string;
  devisId?: string;
  factureId?: string;
}

export const CRM_MAIL_COLUMN_IDS = [
  "quote",
  "invoice",
  "followup1",
  "followup2",
  "followup3",
  "followup4",
] as const;

export type CrmMailColumnId = (typeof CRM_MAIL_COLUMN_IDS)[number];

export function isCrmMailColumn(columnId: string): boolean {
  return (CRM_MAIL_COLUMN_IDS as readonly string[]).includes(columnId);
}
