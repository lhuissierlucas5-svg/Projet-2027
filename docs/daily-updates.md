# Actualisation et temporalité

La tâche quotidienne ChatGPT « Actualiser Projet 2027 » collecte les informations via les connecteurs GitHub et Supabase. Ce n'est pas un cron Vercel. Son activation ne prouve pas une exécution réussie : consulter ses comptes rendus.

## Tables à alimenter

- `candidate_positions` : propositions sourcées ; `candidate_issue_cards` : synthèses du comparateur.
- `political_agenda` : événements, débats, échéances.
- `campaign_updates`, `kind=poll` : résultats de sondages, une ligne par candidat et scénario complet.
- `contender_watch` : statuts documentés ; `priority_issues` : indicateurs thématiques.

Lire les sources complètes, respecter les contraintes, dédupliquer avant insertion et ne jamais inventer de chiffre, date ou candidature. Mettre à jour les annulations et les corrections dans toutes les représentations concernées. Les sondages conservent institut, commanditaire, dates de terrain, population, effectif et scénario ; publier les scénarios complets en transaction.

## Nettoyage automatique

Les vues `current_*` (migration `db/temporal_visibility.sql`) filtrent à chaque lecture, indépendamment de la collecte. Le site est dynamique et une page visible s'actualise toutes les 60 secondes, ainsi qu'au retour dans l'onglet.

- Agenda : masquer completed/cancelled. Retirer à `ends_at` si connu, sinon à `starts_at` si connu, sinon à minuit de Paris après `end_date` ou `sort_date`. Les plages de plusieurs jours restent visibles jusqu'à leur fin. Ne pas inventer d'heure ; une date approximative conserve date_tbc.
- Sondages : fenêtre glissante de 90 jours, sans dates de publication futures. Ordre premier tour, deuxième tour, autres thématiques ; dates décroissantes dans chaque catégorie. Charger toutes les lignes avant de regrouper pour ne jamais tronquer un duel ou exclure le premier tour à cause d'une limite globale.
- Toutes ces tables : `archived_at` masque une information retirée/remplacée ; `expires_at` masque une information à durée de validité connue. Les propositions durables ne périment pas arbitrairement.
- Conserver l'historique en base, ne pas le supprimer physiquement. Une source inaccessible n'autorise pas à modifier les dates ou à inventer une actualisation.

Les vues respectent les permissions RLS des tables (security_invoker). Aucun droit d'écriture public n'est ajouté. Tout changement de schéma nécessite une migration explicite, pas une initiative de la collecte.
