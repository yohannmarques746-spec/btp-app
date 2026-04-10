import { PageWrapper } from '@/components/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEntrepriseProfil } from '@/hooks/useEntrepriseProfil';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUserId } from '@/hooks/useChantiers';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function SettingsPage() {
  const { profil, loading, saving, error, saveProfil } = useEntrepriseProfil();
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [numeroIde, setNumeroIde] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (profil) {
      setNom(profil.nom);
      setAdresse(profil.adresse);
      setTelephone(profil.telephone);
      setEmail(profil.email);
      setNumeroIde(profil.numero_ide);
      setSiteWeb(profil.site_web ?? '');
      setLogoUrl(profil.logo_url);
    } else {
      setNom('');
      setAdresse('');
      setTelephone('');
      setEmail('');
      setNumeroIde('');
      setSiteWeb('');
      setLogoUrl(null);
    }
  }, [profil, loading]);

  const onLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const userId = await getCurrentUserId();
    if (!userId) {
      setUploadError('Utilisateur non authentifié');
      return;
    }
    setUploadError(null);
    setLogoUploading(true);
    const rawExt = file.name.split('.').pop() || 'png';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${userId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || undefined,
    });
    if (upErr) {
      setUploadError(upErr.message);
      setLogoUploading(false);
      e.target.value = '';
      return;
    }
    const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
    setLogoUrl(pub.publicUrl);
    setLogoUploading(false);
    e.target.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !adresse.trim() || !telephone.trim() || !email.trim() || !numeroIde.trim()) {
      return;
    }
    try {
      await saveProfil({
        nom: nom.trim(),
        adresse: adresse.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        numero_ide: numeroIde.trim(),
        site_web: siteWeb.trim() || null,
        logo_url: logoUrl?.trim() || null,
      });
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // error surfaced via hook
    }
  };

  const canSave =
    nom.trim() && adresse.trim() && telephone.trim() && email.trim() && numeroIde.trim() && !saving && !logoUploading;

  return (
    <PageWrapper mobileTitle="Paramètres">
      <div className="p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-bold md:text-2xl text-white">Paramètres — Profil entreprise</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-label="Chargement" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {uploadError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                Profil enregistré
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-white">Nom de l&apos;entreprise *</Label>
              <Input
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="Nom commercial"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Adresse *</Label>
              <Textarea
                required
                rows={2}
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="Rue, numéro, boîte postale…"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Téléphone *</Label>
              <Input
                type="tel"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="+41 …"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Email *</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="contact@entreprise.ch"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Numéro IDE *</Label>
              <Input
                required
                value={numeroIde}
                onChange={(e) => setNumeroIde(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="CHE-123.456.789"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Site web</Label>
              <Input
                type="url"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="https://"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Logo</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={logoUploading}
                onChange={onLogoChange}
                className="bg-black/20 border-white/10 text-white file:mr-3 file:rounded file:border-0 file:bg-white/20 file:px-3 file:py-1 file:text-sm file:text-white"
              />
              {logoUploading && (
                <p className="text-xs text-white/60 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Téléversement…
                </p>
              )}
              {logoUrl ? (
                <img src={logoUrl} alt="Logo entreprise" className="max-h-20 object-contain mt-2 rounded border border-white/10 bg-black/20 p-2" />
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={!canSave}
              className="w-full sm:w-auto bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        )}
      </div>
    </PageWrapper>
  );
}
