export type SyncRun = {
 id: string; started_at: string; finished_at: string | null;
 status: "running" | "success" | "partial" | "failed";
 added: number; corrected: number; archived: number; sources_checked: number; summary: string | null;
};
export function syncHealth(latest: SyncRun | null, lastSuccess: SyncRun | null, now = Date.now()) {
 if (!latest) return {tone:"warning", label:"Première actualisation en attente"};
 if (latest.status === "running") return now - Date.parse(latest.started_at) > 2 * 3600000
  ? {tone:"warning", label:"Actualisation sans confirmation de fin"} : {tone:"neutral", label:"Actualisation en cours"};
 if (latest.status === "failed") return {tone:"warning", label:"Dernière actualisation échouée"};
 if (latest.status === "partial") return {tone:"warning", label:"Dernière actualisation partielle"};
 if (!lastSuccess?.finished_at || now - Date.parse(lastSuccess.finished_at) > 36 * 3600000)
  return {tone:"warning", label:"Actualisation à vérifier"};
 return {tone:"success", label:"Dernière actualisation réussie"};
}
export function syncDate(value: string | null) {
 return value ? new Intl.DateTimeFormat("fr-FR", {dateStyle:"medium", timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(value)) : "Aucune exécution confirmée";
}
