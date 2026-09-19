# Modifier Projet 2027 vous-même

## Les trois espaces

| Pour… | Ouvrir… |
| --- | --- |
| Modifier les portraits, textes, sondages et rendez-vous | [Supabase : éditeur des données](https://supabase.com/dashboard/project/lwqxkjrzyfnyxrdxcpmm/editor) |
| Modifier le design, les boutons et les titres fixes | [Le code sur GitHub](https://github.com/lhuissierlucas5-svg/Projet-2027) |
| Voir les mises en ligne et leurs erreurs | [Le projet Vercel](https://vercel.com/lhuissierlucas5-2797/projet-2027-supd) |

Le site n'a pas encore de page `/admin` ni d'éditeur visuel intégré.
Supabase constitue actuellement son back-office de contenu. Connectez-vous
avec le compte qui possède le projet « Projet 2027 » (ou un compte invité avec
les droits nécessaires). La clé `sb_publishable_…` n'est pas un mot de passe :
elle ne permet pas de se connecter au back-office.

## Première modification simple

1. Ouvrez Supabase avec le lien ci-dessus et connectez-vous.
2. Dans **Table Editor**, sélectionnez le schéma `public`, puis `candidates`.
3. Repérez la personne dans `display_name`.
4. Ouvrez la cellule `party`, modifiez le texte et validez dans l'éditeur.
5. Rechargez le site public : la modification est lue au prochain chargement.

Évitez de modifier `id` : les autres données utilisent cet identifiant.
`slug` détermine l'adresse de la fiche ; le changer modifie les anciens liens.

## Où modifier chaque contenu ?

| Table | Contenu | Champs pratiques |
| --- | --- | --- |
| `candidates` | Nom, parti, portrait, déclaration d'accueil | `display_name`, `party`, `image_url`, `image_credit`, `latest_quote`, `quote_date`, `quote_source_name`, `quote_source_url` |
| `campaign_updates` | Propositions, sondages et agenda | `kind`, `candidate_id`, `title`, `summary`, `source_name`, `source_url`, `published_at`, `verification_status` |
| `statements` | Historique sur les fiches candidats | `quote_text`, `statement_date`, `context`, `verification_status`, `candidate_id`, `source_id` |
| `sources` | Sources des déclarations historiques | `name`, `url`, `published_at` |
| `selection_processes` | Primaires et désignations | `name`, `status`, `summary`, `first_round_date`, `second_round_date`, `official_url` |
| `selection_candidates` | Participants aux primaires | `display_name`, `party`, `positioning_label`, `positioning_summary`, `candidature_status` |
| `selection_poll_indicators` | Indicateurs affichés dans les primaires | `value_percent`, `institute`, `source_url`, dates et méthode |

Pour un portrait, `image_url` doit être l'adresse HTTPS de l'image, accessible
publiquement. Renseignez aussi le crédit et assurez-vous d'avoir le droit de
l'utiliser. Une URL d'image ne correspond pas à un fichier présent uniquement
sur votre ordinateur.

La déclaration affichée sur l'accueil (`candidates.latest_quote`) et l'historique
(`statements`) sont deux enregistrements distincts. Corrigez les deux si la même
citation est erronée ; ne les remplacez pas par une paraphrase entre guillemets.

## Afficher ou retirer une information

Dans `campaign_updates` :

- `review` : en attente, invisible pour les visiteurs.
- `verified` : visible. Renseigner aussi `verified_at` avec la date et l'heure de
  vérification effectives, par exemple au format `AAAA-MM-JJTHH:MM:SS+02:00`
  (adapter le décalage à la date).
- `rejected` : écartée, invisible. Cela permet de retirer une information sans
  supprimer son historique.

Les corrections validées sont publiques au prochain rechargement du site.
Conservez une source qui prouve chaque information. Lors d'une correction,
mettez aussi `updated_at` à la date et l'heure de correction.

## Ajouter une proposition, un sondage ou un rendez-vous

Dans `campaign_updates`, utilisez **Insert row** et remplissez d'abord :
`dedup_key` (clé unique stable, par exemple `manuel-proposition-logement-001`),
`candidate_id` (l'`id` de la personne dans `candidates`), `kind`, `title`,
`summary`, `source_name`, `source_url` (HTTPS), `published_at` (date réelle de
publication) et `verification_status` (`review` pendant la préparation).
Les champs `id`, `created_at` et `updated_at` ont des valeurs par défaut.

Puis renseignez les champs propres au type :

| `kind` | Champs supplémentaires |
| --- | --- |
| `proposal` | `topic` (thème) |
| `poll` | `institute`, `metric_type`, `scenario`, `value_percent`, `fieldwork_start`, `fieldwork_end`, `sample_size`, `population` ; `sponsor` si connu |
| `appearance` | `event_date`, `media_name`, `event_status` ; `event_at` si l'heure est annoncée |

Pour un sondage, une ligne représente un candidat dans un scénario précis.
Les valeurs autorisées de `metric_type` sont `presidential_vote_intention`,
`primary_vote_intention`, `favorability`, `desired_participation`. Le pourcentage
est entre 0 et 100 ; la fin du terrain ne précède pas son début et la publication
ne précède pas la fin du terrain. `sample_size` désigne l'effectif de la population
analysée, pas nécessairement l'échantillon total.

Le graphique regroupe uniquement les lignes dont l'enquête, le titre, le
scénario, la source et la méthode sont identiques. Utilisez les mêmes libellés
pour les candidats d'un même scénario. Les barres partagent une échelle 0–100 %.
La page montre les 12 résultats les plus récents ; elle n'affiche pas forcément
tous les candidats testés par l'institut.

Pour l'agenda : `event_status` vaut `scheduled`, `cancelled` ou `completed`.
`event_date` est la date à Paris. Si l'heure est connue, renseignez `event_at`
avec un fuseau explicite ; sinon laissez ce champ vide. Les événements annulés
et passés disparaissent de la liste à venir, mais restent dans la base.

Si Supabase refuse l'enregistrement, vérifiez les champs obligatoires et ces
règles ; ne désactivez pas les contraintes ni les protections d'accès.

## Modifier la présentation

- `app/page.tsx` : titre principal, boutons et cartes de l'accueil.
- `app/globals.css` : couleurs (variables `:root`), tailles, espacements.
- `app/campaign-feed.tsx` : graphiques, propositions et agenda.
- `app/primaires/page.tsx` : page des primaires.

GitHub permet de modifier un fichier via l'icône crayon puis d'enregistrer un
commit. Pour une modification de code, préférez une branche et une prévisualisation
avant de l'intégrer à `main`. Les changements de `main` déclenchent Vercel ;
attendez le statut **Ready** avant de vérifier le site.

## Et la mise à jour quotidienne ?

Une tâche ChatGPT nommée « Actualiser Projet 2027 » alimente `campaign_updates`.
Ce n'est pas un cron Vercel. Elle doit garder son accès aux connecteurs et aux
sources. Ses règles sont décrites dans `docs/daily-updates.md`.

Les lignes ne disposent pas encore d'un verrou « modification manuelle ».
L'automatisation peut donc corriger un fait modifié manuellement si elle trouve
une source probante. Consultez son compte rendu ; si vous voulez reprendre
entièrement la main, demandez à mettre cette tâche en pause.

Référence : [Tables et données — documentation Supabase](https://supabase.com/docs/guides/database/tables).

## Masquer une information et régler sa durée

Dans le Table Editor Supabase, modifier les tables d'origine, pas les vues `current_*`.
Renseigner `archived_at` pour retirer une ligne du site en conservant son historique ; remettre à null pour la rétablir si elle est encore valide. `expires_at` définit une fin de validité automatique.
Dans `political_agenda`, `sort_date` est le début et `end_date` la dernière journée. Pour une heure exacte, utiliser `starts_at` et `ends_at` avec un fuseau. `completed` et `cancelled` retirent immédiatement l'événement. Sans heure connue, le retrait a lieu à minuit de Paris après la dernière journée. Le site ouvert s'actualise sous une minute.
Les sondages de plus de 90 jours restent en base mais quittent les pages courantes. Leur ordre est premier tour, deuxième tour, puis autres thématiques.

## Pointer une source vers la phrase précise

Dans Supabase, renseigner `source_excerpt` avec quelques mots consécutifs copiés exactement dans le paragraphe source qui justifie l'information. Ne pas utiliser le résumé rédigé pour notre site. Le lien cible ce texte automatiquement. Laisser vide si le passage n'est pas vérifié ; les liens PDF gardent leur numéro de page. Vérifier à nouveau l'extrait après tout changement d'URL ou d'article.
