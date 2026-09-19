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

## Liens vers le passage précis

Chaque table de contenu dispose de `source_excerpt` : court extrait exact vérifié dans la source, jamais notre résumé. Compléter aussi les anciennes lignes quand la source est accessible. Le site encode cet extrait en fragment textuel pour tenter de défiler et surligner le passage chez l'éditeur. Conserver l'URL canonique dans `source_url` pour la déduplication et les groupes de sondages. Si la source change, revérifier ou effacer l'extrait. Respecter les limites de citation cumulées par source.

Sans extrait vérifié, le lien reste classique. Les PDF conservent leur page `#page=N`. L'accès payant, les modifications de l'article et les navigateurs/sites ne prenant pas en charge les fragments peuvent empêcher le surlignage. Ne pas annoncer une garantie universelle.

### Journal public des exécutions

Au début de chaque veille, insérer une ligne dans `public.content_sync_runs` avec `status='running'`, récupérer son `id` et le conserver. Ne jamais journaliser une simple installation ou un contrôle technique comme une collecte éditoriale.
À la fin, mettre à jour cette même ligne avec `finished_at=now()`, `status` (`success`, `partial`, `failed`) et les compteurs réels `added`, `corrected`, `archived`, `sources_checked`. `success` exige que toutes les phases prévues aient été effectivement terminées et vérifiées ; sinon `partial` ou `failed`. `summary` est une courte synthèse publique (600 caractères maximum), sans secret, donnée personnelle ni erreur technique brute. Zéro nouveauté peut être une réussite si la recherche a bien été exécutée. Ne jamais antidater une exécution ni inventer de compteur. Une impossibilité d'écrire le journal doit être signalée dans le compte rendu ; le site ne doit pas prétendre à une réussite.
