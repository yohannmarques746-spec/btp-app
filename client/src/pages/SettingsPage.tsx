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
  const [formError, setFormError] = useState<string | null>(null);

  const normalizeSiteWeb = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

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
    const runId = `settings-logo-${Date.now()}`;
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId,hypothesisId:'H1',location:'client/src/pages/SettingsPage.tsx:50',message:'logo file selected',data:{name:file.name,size:file.size,type:file.type,lastModified:file.lastModified},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const userId = await getCurrentUserId();
    const { data: authData } = await supabase.auth.getUser();
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId,hypothesisId:'H2',location:'client/src/pages/SettingsPage.tsx:55',message:'resolved user ids before upload',data:{getCurrentUserId:userId,authUserId:authData.user?.id ?? null,sameUser:userId === (authData.user?.id ?? null)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!userId) {
      setUploadError('Utilisateur non authentifié');
      return;
    }
    setUploadError(null);
    setLogoUploading(true);
    const rawExt = file.name.split('.').pop() || 'png';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${userId}/logo.${ext}`;
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId,hypothesisId:'H3',location:'client/src/pages/SettingsPage.tsx:65',message:'upload request prepared',data:{bucket:'logos',path,upsert:true,cacheControl:'3600',contentType:file.type || null,derivedExt:ext},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || undefined,
    });
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId,hypothesisId:'H4',location:'client/src/pages/SettingsPage.tsx:72',message:'upload response received',data:{hasError:Boolean(upErr),errorName:upErr?.name ?? null,errorMessage:upErr?.message ?? null,errorStatus:(upErr as { statusCode?: string | number } | null)?.statusCode ?? null,errorDetails:(upErr as { details?: string | null } | null)?.details ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (upErr) {
      const shouldFallbackToDataUrl = /bucket not found/i.test(upErr.message);
      if (shouldFallbackToDataUrl) {
        // #region agent log
        fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId:'post-fix',hypothesisId:'H6',location:'client/src/pages/SettingsPage.tsx:79',message:'bucket missing fallback started',data:{reason:upErr.message,fileSize:file.size,fileType:file.type},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const fallbackUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
        // #region agent log
        fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId:'post-fix',hypothesisId:'H6',location:'client/src/pages/SettingsPage.tsx:89',message:'bucket missing fallback resolved',data:{fallbackCreated:Boolean(fallbackUrl),fallbackPrefix:fallbackUrl?.slice(0,24) ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (fallbackUrl) {
          setLogoUrl(fallbackUrl);
          setUploadError(null);
          setLogoUploading(false);
          e.target.value = '';
          return;
        }
      }
      setUploadError(upErr.message);
      setLogoUploading(false);
      e.target.value = '';
      return;
    }
    const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5953e6'},body:JSON.stringify({sessionId:'5953e6',runId,hypothesisId:'H5',location:'client/src/pages/SettingsPage.tsx:82',message:'public URL generated after upload',data:{publicUrl:pub.publicUrl},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setLogoUrl(pub.publicUrl);
    setLogoUploading(false);
    e.target.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(false);
    if (!nom.trim() || !adresse.trim() || !telephone.trim() || !email.trim() || !numeroIde.trim()) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      await saveProfil({
        nom: nom.trim(),
        adresse: adresse.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        numero_ide: numeroIde.trim(),
        site_web: normalizeSiteWeb(siteWeb),
        logo_url: logoUrl?.trim() || null,
      });
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch (saveErr) {
      setFormError(saveErr instanceof Error ? saveErr.message : 'Erreur lors de l’enregistrement.');
    }
  };

  const initialSnapshot = {
    nom: profil?.nom?.trim() ?? '',
    adresse: profil?.adresse?.trim() ?? '',
    telephone: profil?.telephone?.trim() ?? '',
    email: profil?.email?.trim() ?? '',
    numero_ide: profil?.numero_ide?.trim() ?? '',
    site_web: normalizeSiteWeb(profil?.site_web ?? '') ?? '',
    logo_url: profil?.logo_url?.trim() ?? '',
  };

  const currentSnapshot = {
    nom: nom.trim(),
    adresse: adresse.trim(),
    telephone: telephone.trim(),
    email: email.trim(),
    numero_ide: numeroIde.trim(),
    site_web: normalizeSiteWeb(siteWeb) ?? '',
    logo_url: logoUrl?.trim() ?? '',
  };

  const hasChanges =
    currentSnapshot.nom !== initialSnapshot.nom ||
    currentSnapshot.adresse !== initialSnapshot.adresse ||
    currentSnapshot.telephone !== initialSnapshot.telephone ||
    currentSnapshot.email !== initialSnapshot.email ||
    currentSnapshot.numero_ide !== initialSnapshot.numero_ide ||
    currentSnapshot.site_web !== initialSnapshot.site_web ||
    currentSnapshot.logo_url !== initialSnapshot.logo_url;

  const canSave =
    nom.trim() &&
    adresse.trim() &&
    telephone.trim() &&
    email.trim() &&
    numeroIde.trim() &&
    hasChanges &&
    !saving &&
    !logoUploading;

  return (
    <PageWrapper mobileTitle="Paramètres">
      <div className="p-3 md:p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-bold md:text-2xl text-white">Paramètres — Profil entreprise</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-label="Chargement" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
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
                type="text"
                inputMode="url"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                placeholder="exemple.ch ou https://exemple.ch"
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
