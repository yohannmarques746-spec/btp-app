/** Codes unité stockés en base (devis / lignes). Réutiliser ce module pour futures lignes facture ou catalogue de prestations. */
export const UNITE_CODES = [
  "m²",
  "ml²",
  "ml",
  "m",
  "cm",
  "mm",
  "m³",
  "L",
  "kg",
  "t",
  "u",
  "pce",
  "ens.",
  "lot",
  "h",
  "j",
  "sem.",
  "sac",
  "roul.",
  "pal.",
] as const;

export type UnitePrestationCode = (typeof UNITE_CODES)[number];

export const DEFAULT_UNITE_PRESTATION: UnitePrestationCode = "u";

const UNITE_CODE_SET = new Set<string>(UNITE_CODES);

export function isUnitePrestationCode(value: string): value is UnitePrestationCode {
  return UNITE_CODE_SET.has(value);
}

const LEGACY_UNITE_MAP: Record<string, UnitePrestationCode> = {
  heure: "h",
  jour: "j",
  forfait: "ens.",
  piece: "pce",
  autre: "u",
};

/** Anciennes valeurs (heure, jour, …) ou code inconnu → code canonique. */
export function normalizeUniteLegacy(raw: string | undefined | null): UnitePrestationCode {
  if (raw == null || raw === "") return DEFAULT_UNITE_PRESTATION;
  const trimmed = String(raw).trim();
  if (isUnitePrestationCode(trimmed)) return trimmed;
  const mapped = LEGACY_UNITE_MAP[trimmed.toLowerCase()];
  return mapped ?? DEFAULT_UNITE_PRESTATION;
}

export type UniteOptionGroup = {
  label: string;
  options: { code: UnitePrestationCode; libelle: string }[];
};

/** Structure pour `<select>` avec `<optgroup>` — ordre demandé. */
export const UNITE_OPTION_GROUPS: UniteOptionGroup[] = [
  {
    label: "Surface",
    options: [
      { code: "m²", libelle: "mètre carré" },
      { code: "ml²", libelle: "mètre linéaire (surface)" },
    ],
  },
  {
    label: "Longueur",
    options: [
      { code: "ml", libelle: "mètre linéaire" },
      { code: "m", libelle: "mètre" },
      { code: "cm", libelle: "centimètre" },
      { code: "mm", libelle: "millimètre" },
    ],
  },
  {
    label: "Volume",
    options: [
      { code: "m³", libelle: "mètre cube" },
      { code: "L", libelle: "litre" },
    ],
  },
  {
    label: "Masse",
    options: [
      { code: "kg", libelle: "kilogramme" },
      { code: "t", libelle: "tonne" },
    ],
  },
  {
    label: "Unité / Forfait",
    options: [
      { code: "u", libelle: "unité" },
      { code: "pce", libelle: "pièce" },
      { code: "ens.", libelle: "ensemble / forfait" },
      { code: "lot", libelle: "lot" },
    ],
  },
  {
    label: "Temps",
    options: [
      { code: "h", libelle: "heure" },
      { code: "j", libelle: "jour" },
      { code: "sem.", libelle: "semaine" },
    ],
  },
  {
    label: "Conditionné",
    options: [
      { code: "sac", libelle: "sac" },
      { code: "roul.", libelle: "rouleau" },
      { code: "pal.", libelle: "palette" },
    ],
  },
];
