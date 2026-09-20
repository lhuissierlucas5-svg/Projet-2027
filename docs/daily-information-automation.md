# Veille quotidienne des informations

## Objectif

Le site effectue une veille quotidienne sans publier automatiquement d'affirmation politique. Le système sépare strictement **découverte** et **publication**.

## Exécution

- Planification Supabase Cron : `30 6 * * *` (06:30 UTC chaque jour).
- Fonction : `daily-information-watch`.
- Authentification interne : secret aléatoire stocké dans Supabase Vault ; seule son empreinte SHA-256 est accessible à la fonction.
- Aucun secret n'est stocké dans GitHub ou dans le navigateur.

## Ce que fait un passage

1. Charge la liste actuelle des profils suivis.
2. Lance la même requête de veille pour chaque profil, plus une requête générale sur la présidentielle 2027.
3. Récupère uniquement les métadonnées utiles des résultats récents (titre, source, URL, date) et les déduplique.
4. Insère les nouveautés dans `daily_information_queue` avec le statut `review`.
5. Contrôle un échantillon tournant de 72 liens déjà utilisés sur le site et met à jour `source_audit_log`.
6. Archive les éléments dont `expires_at` est explicitement dépassé.
7. Enregistre le résultat dans `content_sync_runs`.

## Règle éditoriale

Une entrée de `daily_information_queue` est une **piste de vérification**, pas un fait publié. Elle n'alimente directement aucune page publique. Dans l'administration, il faut ouvrir la source puis marquer la piste comme examinée ou écartée.

Les résumés, propositions, candidatures, événements et chiffres publiés continuent de passer par les tables éditoriales existantes et leurs statuts de vérification.

## Résilience

- Les flux sont dédupliqués par une empreinte stable.
- Une source indisponible est signalée `review` sans retirer automatiquement le contenu associé.
- Une panne d'une sous-étape produit un passage `partial`.
- Une panne globale produit un passage `failed`.
- Les messages de suivi sont volontairement synthétiques et ne contiennent ni secret ni erreur brute.
