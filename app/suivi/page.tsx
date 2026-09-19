import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import { syncHealth, syncDate, type SyncRun } from "../../lib/sync-status";
import SiteNav from "../site-nav";
export const metadata = { title: "Suivi des actualisations · Élections 2027" };
export default async function TrackingPage() {
 await connection();
 const [history, success] = await Promise.all([
  supabase.from("content_sync_runs").select("*").order("started_at", {ascending:false}).limit(20),
  supabase.from("content_sync_runs").select("*").eq("status","success").order("finished_at", {ascending:false}).limit(1)
 ]);
 const runs = (history.data ?? []) as SyncRun[];
 const lastSuccess = (success.data?.[0] ?? null) as SyncRun | null;
 const health = syncHealth(runs[0] ?? null,lastSuccess);
 const unavailable = Boolean(history.error || success.error);
 const labels = {running:"En cours",success:"Réussie",partial:"Partielle",failed:"Échouée"};
 return <><SiteNav /><main className="management-page">
  <p className="management-eyebrow">Transparence</p><h1>Le suivi des actualisations</h1>
  <p className="management-intro">Une veille quotidienne, des sources vérifiées et un historique consultable.</p>
  <section className={`management-card sync-${unavailable ? "warning" : health.tone}`}>
   <h2>{unavailable ? "Suivi temporairement indisponible" : health.label}</h2>
   <p>Dernière collecte réussie : <strong>{unavailable ? "Non disponible" : syncDate(lastSuccess?.finished_at ?? null)}</strong></p>
   <p>Les dates affichées dans les articles restent celles des faits. Une collecte réussie peut ne trouver aucune nouveauté.</p>
  </section>
  <section className="management-card"><h2>Comment le site reste à jour</h2>
   <ul><li>Les événements terminés quittent automatiquement l’agenda public.</li><li>Les sondages sont classés par tour, puis du plus récent au plus ancien.</li><li>Les éléments retirés sont archivés pour conserver leur historique.</li></ul>
   <p>Une veille planifiée ne garantit pas une exécution réussie : son résultat apparaît ici lorsqu’il est enregistré. Les horaires sont affichés à l’heure de Paris.</p>
  </section>
  <section className="management-card"><h2>Dernières exécutions</h2>
   {!runs.length && <p>{unavailable ? "Impossible de charger l’historique." : "Aucune collecte n’a encore été enregistrée dans ce suivi."}</p>}
   {runs.map(run => <article className="sync-run" key={run.id}>
    <div><strong>{labels[run.status]}</strong><span>{syncDate(run.started_at)}</span></div>
    <p>{run.added} ajout(s) · {run.corrected} correction(s) · {run.archived} archivage(s) · {run.sources_checked} source(s) contrôlée(s)</p>
    {run.summary && <p>{run.summary}</p>}
   </article>)}
  </section><a href="/admin">Accéder à l’administration →</a>
 </main></>;
}
