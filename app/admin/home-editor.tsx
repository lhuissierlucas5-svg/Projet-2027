"use client";
import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import HomeIntro from '../home-intro';
import { homeFields, readHomeContent, type HomeContent, type HomeCounts } from '../../lib/home-content';

type SavedHome = HomeContent & { id: string; updated_at: string };
export default function HomeEditor({ client, onDirtyChange }: { client: SupabaseClient; onDirtyChange: (dirty: boolean) => void }) {
  const [saved, setSaved] = useState<SavedHome | null>(null);
  const [draft, setDraft] = useState<HomeContent | null>(null);
  const [counts, setCounts] = useState<HomeCounts>({ profiles: null, positions: null, events: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = !!saved && !!draft && homeFields.some(field => draft[field.key] !== saved[field.key]);
  useEffect(() => { onDirtyChange(dirty || busy); return () => onDirtyChange(false); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const guardLink = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (anchor && anchor.target !== '_blank' && !window.confirm('Quitter sans enregistrer les modifications de l’accueil ?')) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLink);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardLink); };
  }, [dirty, busy]);
  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const [home, profiles, positions, events] = await Promise.all([
        client.from('homepage_content').select('*').eq('id', 'home').single(),
        client.from('candidates').select('id', { count: 'exact', head: true }),
        client.from('current_candidate_positions').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        client.from('current_political_agenda').select('id', { count: 'exact', head: true }).in('status', ['upcoming', 'ongoing', 'date_tbc']),
      ]);
      if (home.error || !home.data) throw new Error('unavailable');
      const content = readHomeContent(home.data);
      setSaved({ ...content, id: 'home', updated_at: home.data.updated_at }); setDraft(content); setConflict(false);
      setCounts({ profiles: profiles.error ? null : profiles.count, positions: positions.error ? null : positions.count, events: events.error ? null : events.count });
    } catch { setMessage('Impossible de charger les réglages. Tes modifications éventuelles sont conservées. Réessaie le chargement.'); }
    finally { setLoading(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !saved || busy || conflict) return;
    const payload = Object.fromEntries(homeFields.map(field => [field.key, draft[field.key].trim()]));
    if (homeFields.some(field => !payload[field.key] || payload[field.key].length > field.max)) { setMessage('Complète tous les champs en respectant les longueurs indiquées.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await client.from('homepage_content').update(payload).eq('id', 'home').eq('updated_at', saved.updated_at).select().maybeSingle();
      if (result.error) { setMessage('Enregistrement refusé. Vérifie ta connexion et tes droits. Ton brouillon reste affiché.'); return; }
      if (!result.data) { setConflict(true); setMessage('La page a été modifiée ailleurs. Copie tes textes si nécessaire, puis recharge la version publiée avant de recommencer. Rien n’a été écrasé.'); return; }
      const content = readHomeContent(result.data);
      setSaved({ ...content, id: 'home', updated_at: result.data.updated_at }); setDraft(content);
      setMessage('Accueil enregistré et publié. Ouvre le site pour voir les changements.');
    } catch { setMessage('Connexion interrompue. Ton brouillon est conservé ; réessaie.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="home-editor-title">
    <h2 id="home-editor-title">Modifier la page d’accueil</h2>
    <p>1. Modifie les textes. 2. Vérifie l’aperçu. 3. Enregistre pour publier sur le site.</p>
    <p>Les chiffres sont calculés automatiquement depuis les contenus disponibles. Tu peux modifier leurs libellés ici ; les données se gèrent dans les autres onglets.</p>
    <p className="admin-home-status" role="status">{loading ? 'Chargement des réglages…' : message || (dirty ? 'Modifications non enregistrées.' : 'La version publiée est affichée.')}</p>
    {(!saved || conflict || message.startsWith('Impossible')) && <button type="button" disabled={loading || busy} onClick={() => { if (!dirty || window.confirm('Recharger la version publiée et abandonner tes modifications ?')) void load(); }}>Recharger la version publiée</button>}
    {draft && saved && <div className="admin-home-layout">
      <form className="management-card admin-home-form" onSubmit={save}>
        <fieldset disabled={busy || loading}>
          {['En-tête', 'Repères', 'Rubriques', 'Méthode'].map(group => <fieldset key={group}>
            <legend>{group}</legend>
            {homeFields.filter(field => field.group === group).map(field => <label key={field.key}>
              {field.label}
              {field.max > 150 ? <textarea required rows={field.max > 400 ? 6 : 3} maxLength={field.max} value={draft[field.key]} onChange={e => setDraft({ ...draft, [field.key]: e.target.value })} /> : <input required maxLength={field.max} value={draft[field.key]} onChange={e => setDraft({ ...draft, [field.key]: e.target.value })} />}
              <small>{draft[field.key].length} / {field.max} caractères</small>
            </label>)}
          </fieldset>)}
        </fieldset>
        <div className="admin-actions admin-savebar">
          <button type="submit" className="admin-primary" disabled={!dirty || busy || loading || conflict}>{busy ? 'Enregistrement…' : 'Enregistrer et publier'}</button>
          <button type="button" disabled={!dirty || busy || loading} onClick={() => { if (window.confirm('Annuler tes modifications non enregistrées ?')) { setDraft(readHomeContent(saved)); setMessage('Modifications annulées.'); } }}>Annuler les modifications</button>
          <a href="/" target="_blank" rel="noopener noreferrer">Voir le site ↗</a>
        </div>
      </form>
      <section aria-label="Aperçu non publié">
        <h3>Aperçu de tes modifications</h3>
        <p>Les liens sont désactivés dans cet aperçu. Les changements ne sont publiés qu’après enregistrement.</p>
        <div className="admin-home-preview" inert>
          <HomeIntro content={draft} counts={counts} preview />
          <section className="editorial-method"><h3>{draft.candidates_title}</h3><h3>{draft.primaries_title}</h3><p>{draft.primaries_description}</p><h3>Notre méthode</h3><p>{draft.methodology}</p></section>
        </div>
      </section>
    </div>}
  </section>;
}
