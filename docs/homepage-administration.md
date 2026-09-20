# Modifier l’accueil

Ouvrir `/admin`, se connecter avec le compte administrateur habituel, puis choisir **Accueil** (onglet ouvert par défaut).

1. Modifier les textes regroupés dans En-tête, Repères, Rubriques et Méthode.
2. Vérifier l’aperçu, qui ne publie aucune modification.
3. Cliquer sur **Enregistrer et publier**. **Voir le site** ouvre l’accueil dans un nouvel onglet.

Les titres, le sous-titre, les deux boutons principaux, le bandeau, les libellés des chiffres, les titres candidats/primaires et la note méthodologique sont modifiables. Les destinations des boutons restent fixes. Le texte est affiché comme texte, jamais comme HTML.

Les trois compteurs proviennent des personnalités suivies, des propositions vérifiées encore visibles et des rendez-vous à venir/en cours/à confirmer encore visibles. Ils sont recalculés lors du chargement de l’accueil. Un tiret indique une donnée indisponible. Les compteurs ne sont pas des scores de sondage et ne sont pas modifiables manuellement.

**Annuler les modifications** restaure la version chargée. En cas de modification concurrente, rien n’est écrasé : conserver ses textes, puis utiliser **Recharger la version publiée**. En cas de refus d’enregistrement, le brouillon reste affiché. Les changements non enregistrés ne sont pas sauvegardés après fermeture du navigateur.

## Structure et déploiement

L’inspection du schéma public et du code n’a trouvé aucune table de réglages éditoriaux. `db/homepage_content.sql` ajoute donc uniquement `homepage_content`, contenant une ligne `id=home`. Migration distante : `homepage_editorial_content`.

- Lecture publique ; modification réservée aux membres existants de `site_admins`.
- Aucun droit de création, suppression ou modification de l’identifiant et de l’horodatage pour les utilisateurs du site.
- Limites de longueur et valeurs non vides contrôlées dans le formulaire et la base.
- Réutilisation du déclencheur `touch_content_updated_at` et comparaison de l’ancienne version à l’enregistrement.
- Les textes par défaut restent utilisables si la lecture des réglages échoue.
- Aucune modification des vues `current_*`, des politiques existantes, des collectes ou des workflows.
- Les collectes doivent continuer à écrire dans leurs tables métier, jamais dans `homepage_content`.

Appliquer la migration une seule fois avant le déploiement du code. Elle est déjà appliquée au projet Supabase lié. Ne pas réexécuter son fichier SQL sur ce projet. Un retour au code précédent laisse cette table inutilisée et conserve les réglages.

## Vérification

- `npm ci`, puis `npm run build`.
- `npx playwright test` : tests publics existants et scénarios d’administration avec authentification/écritures simulées uniquement dans le navigateur de test.
- `db/homepage_content_checks.sql` : contrôles transactionnels réels des droits, contraintes et conflits ; identité temporaire et modifications annulées par `ROLLBACK`.
- Après déploiement : vérifier le SHA dans `/api/health`, puis relancer les tests sur l’URL de production.
