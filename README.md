# Confidences

Application web francophone de partage anonyme de confessions, avec affichage de coachs verifies et connexion a une base MariaDB/MySQL.

Ce projet est actuellement un prototype frontend servi par une API Express. Il ne faut pas le traiter comme une application de production : l'inscription fonctionne, mais l'authentification complete, les sessions, les interactions communautaires et la publication liee a l'utilisateur connecte restent a finaliser.

## Demander une amelioration a une IA

Copier le bloc suivant dans une autre IA apres lui avoir donne acces au dossier :

> Tu travailles sur le projet `Confidences`, une application web francophone de confessions anonymes. Lis tous les fichiers du projet avant de modifier quoi que ce soit.
>
> Contexte technique : frontend HTML/CSS/JavaScript vanilla, backend Node.js avec Express 5, base MariaDB/MySQL via `mysql2/promise`, donnees servies par le meme serveur Express. La base existante s'appelle `confessions_db` et contient les tables `users`, `categories`, `coach_profiles` et `confessions`.
>
> Contraintes :
> - Ne jamais afficher ni demander les secrets du fichier `.env`.
> - Ne pas remplacer la base existante et ne pas supprimer de donnees.
> - Ne pas inventer de colonnes SQL sans verifier la structure reelle.
> - Ne pas stocker de mot de passe en clair.
> - Garder l'anonymat public des confessions.
> - Conserver le style visuel existant sauf si une refonte est explicitement demandee.
> - Utiliser des requetes parametrees MySQL.
> - Valider chaque modification avec `npm run check` et `node --check app.js`.
> - Tester les erreurs et les cas limites, pas seulement le cas nominal.
>
> Priorites recommandees :
> 1. Implementer une vraie authentification login/logout avec session ou JWT HttpOnly, sans exposer le mot de passe.
> 2. Remplacer `ANONYMOUS_USER_ID` par l'identite issue de la session cote serveur.
> 3. Connecter les controles frontend reels : recherche, categories, filtres coachs, compteurs et pagination.
> 4. Ajouter les tables et routes necessaires aux likes, commentaires, favoris et avis, uniquement apres verification du schema.
> 5. Ajouter une gestion d'erreur visible et accessible dans tous les formulaires.
> 6. Ajouter des tests API et une documentation des migrations SQL.
>
> Avant chaque edition, explique l'hypothese locale, fais la modification minimale, puis execute une validation ciblee. A la fin, indique les fichiers modifies, les tests executes et les points qui restent a traiter.

## Fonctionnalites actuelles

- Page d'accueil avec navigation par ancres.
- Section de confessions avec cartes de demonstration initiales.
- Chargement des confessions depuis `GET /api/confessions` lorsque la base repond.
- Filtre SQL de confessions par categorie et recherche via query string.
- Formulaire de publication de confession via `POST /api/confessions`.
- Section de coachs verifies.
- Chargement des coachs approuves depuis `GET /api/coaches`.
- Formulaire d'inscription via `POST /api/auth/register`.
- Validation de l'adresse e-mail et longueur minimale du mot de passe.
- Confirmation obligatoire du mot de passe avant toute inscription.
- Hash du mot de passe avec `crypto.scrypt` et sel aleatoire.
- Protection basique avec Helmet et limite JSON de `100kb`.
- Route de diagnostic `GET /api/health`.

## Architecture des fichiers

```text
.
|-- index.html                 Page et formulaires frontend
|-- style.css                  Styles responsive et identite visuelle
|-- app.js                     Appels fetch, rendu des cartes et formulaires
|-- server.js                  Serveur Express et montage des routes
|-- package.json               Scripts et dependances
|-- package-lock.json          Verrouillage des versions npm
|-- .env.example               Modele de configuration sans secret
|-- .env                       Configuration locale, ignoree par Git
|-- .gitignore                 Exclusions Git
|-- schema.example.sql         Rappel non destructif de la base existante
`-- src/
    |-- db.js                  Pool MySQL partage
    `-- routes/
        |-- auth.js            Inscription
        |-- confessions.js     Lecture et creation des confessions
        `-- coaches.js         Lecture des coachs approuves
```

`node_modules/` est genere par `npm install` et ne doit pas etre versionne.

## Installation et lancement

Prerequis : Node.js recent, npm et un serveur MySQL/MariaDB local accessible, par exemple via XAMPP/WAMP.

```bash
npm install
```

Creer `.env` a la racine en partant de `.env.example` :

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=confessions_db
DB_USER=root
DB_PASSWORD=
ANONYMOUS_USER_ID=
```

Ne jamais commiter `.env` ni transmettre sa valeur complete a une IA.

Lancer le serveur :

```bash
npm start
```

Mode developpement avec redemarrage automatique :

```bash
npm run dev
```

Ouvrir ensuite `http://localhost:3000`. Ne pas ouvrir `index.html` directement avec `file://` et ne pas utiliser Live Server seul : les appels `/api/...` necessitent Express.

## Verification

```bash
npm run check
node --check app.js
```

La validation actuelle verifie la syntaxe JavaScript mais ne constitue pas encore une suite de tests fonctionnels.

## Configuration de la base

La connexion est geree par [src/db.js](src/db.js) avec un pool `mysql2/promise` :

- hote : `DB_HOST`, par defaut `127.0.0.1`
- port : `DB_PORT`, par defaut `3306`
- base : `DB_NAME`, par defaut `confessions_db`
- utilisateur : `DB_USER`, par defaut `root`
- mot de passe : `DB_PASSWORD`, vide par defaut en local

Le code n'execute aucune migration automatique. La base `confessions_db` existe deja dans phpMyAdmin.

## Structure SQL observee

Structure verifiee dans phpMyAdmin, sans modifier les donnees :

### `users`

- `id` : cle primaire, `int`, auto-increment
- `name` : `varchar(100)`
- `email` : `varchar(150)`, indexe
- `password` : `varchar(255)`
- `role` : enum `USER`, `COACH`, `ADMIN`, valeur par defaut `USER`

### `categories`

- `id` : cle primaire, `int`, auto-increment
- `name` : `varchar(50)`, indexe

### `coach_profiles`

- `id` : cle primaire, `int`, auto-increment
- `user_id` : index, relation vers `users.id`
- `speciality` : `varchar(150)`
- `experience` : `int`
- `bio` : `text`, nullable
- `status` : enum comprenant notamment `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, valeur par defaut `PENDING`
- `rating_avg` : `decimal(3,2)`, valeur par defaut `0.00`

### `confessions`

- `id` : cle primaire, `int`, auto-increment
- `user_id` : index, obligatoire, relation vers `users.id`
- `category_id` : index, obligatoire, relation vers `categories.id`
- `coach_id` : index, nullable
- `title` : `varchar(255)`
- `content` : `text`
- `is_anonymous` : `tinyint(1)`, valeur par defaut `1`
- `created_at` : `timestamp`, valeur par defaut `current_timestamp()`

Les tables etaient vides lors du dernier diagnostic, sauf si des donnees ont ete ajoutees depuis. `schema.example.sql` est volontairement non destructif et ne sert pas de migration.

## API actuelle

### `GET /api/health`

Reponse :

```json
{ "status": "ok" }
```

### `POST /api/auth/register`

Corps attendu :

```json
{
  "name": "Nom utilisateur",
  "email": "utilisateur@example.com",
  "password": "motdepasse-solide"
}
```

Comportement : normalisation de l'e-mail en minuscules, verification du format, minimum de 8 caracteres, controle d'unicite, hash `salt:derivedKey`, insertion avec le role `USER`.

Reponse `201` :

```json
{
  "id": 1,
  "name": "Nom utilisateur",
  "email": "utilisateur@example.com",
  "role": "USER"
}
```

La colonne `password` n'est jamais renvoyee.

### `GET /api/confessions`

Query params disponibles :

- `category` : nom exact de la categorie, sauf `Toutes`
- `search` : recherche dans `title` et `content`
- `limit` : entre 1 et 100, valeur par defaut 20
- `offset` : decalage numerique, valeur par defaut 0

La requete joint `confessions` a `categories` et trie par `created_at DESC`.

Les champs `likes_count` et `comments_count` sont actuellement retournes a `0` en dur, car aucune colonne ou table correspondante n'est implemente dans le projet.

### `POST /api/confessions`

Corps attendu :

```json
{
  "title": "Titre",
  "content": "Texte de la confession",
  "category": "Couple",
  "coachId": null
}
```

La categorie est resolue par `categories.name`, puis la confession est inseree avec `is_anonymous = 1`.

Limitation critique : `user_id` est actuellement fourni par `ANONYMOUS_USER_ID` dans `.env`. Ce n'est pas une authentification. Il faut le remplacer par l'utilisateur de la session cote serveur avant toute mise en production.

### `GET /api/coaches`

Query params disponibles :

- `search` : recherche dans le nom ou la bio
- `specialty` : valeur exacte de `coach_profiles.speciality`, sauf `Toutes`

La route retourne uniquement les coachs dont `status = 'APPROVED'`, joints a `users`. `reviews_count` est actuellement retourne a `0` en dur.

## Etat du frontend

`index.html` contient les sections : accueil, confessions, coachs, parcours, publication et connexion.

`app.js` :

- remplace les cartes de confessions si l'API renvoie des resultats ;
- remplace les cartes de coachs si l'API renvoie des resultats ;
- gere la soumission de publication ;
- ouvre et ferme le formulaire d'inscription ;
- affiche le succes ou l'erreur d'inscription dans la page.

`style.css` utilise une identite creme/orange/violette, les polices Google `DM Serif Display` et `Inter`, ainsi que des media queries pour les ecrans de moins de `1050px` et `760px`.

## Limites et problemes connus

1. **Authentification incomplete** : l'inscription existe, mais le bouton de connexion n'est pas branche a une route login.
2. **Publication non liee a une session** : `ANONYMOUS_USER_ID` est global et peut etre absent ou incorrect.
3. **Pas de session, JWT, logout ou mot de passe oublie**.
4. **Recherche frontend non branchee** : la barre de recherche des confessions est un bloc visuel, pas un champ actif.
5. **Filtres coachs non branches** : les controles affiches ne declenchent pas encore `GET /api/coaches`.
6. **Donnees statiques restantes** : categories, coachs du select, compteurs et nombre de resultats sont parfois ecrits dans le HTML.
7. **Aucun systeme de likes, commentaires, favoris ou avis**.
8. **Pas de pagination frontend** meme si l'API accepte `limit` et `offset`.
9. **Pas de tests automatises** : seulement des controles de syntaxe.
10. **Gestion des erreurs incomplete cote frontend** : plusieurs actions utilisent encore `alert`, et le chargement initial ignore silencieusement les erreurs.
11. **Securite a renforcer** : rate limiting, cookies/session securises, CSRF si necessaire, validation plus stricte, logs structures et gestion des secrets en production.
12. **Accessibilite a renforcer** : plusieurs controles sont des `div` non interactifs ou des liens `href="#"`, et les icones textuelles devraient etre remplacees par des controles accessibles.
13. **Coherence metier a clarifier** : le produit promet l'anonymat, mais doit conserver un lien prive avec le compte pour permettre la gestion des propres confessions.

## Plan d'amelioration recommande

### Phase 1 : fiabiliser la base

- Ajouter une gestion de configuration explicite et verifier la connexion au demarrage.
- Creer une couche de validation commune des entrees.
- Ajouter des migrations versionnees, sans recreer les tables existantes.
- Ajouter des tests des routes d'inscription, erreurs, doublons et requetes SQL.

### Phase 2 : authentification

- Ajouter `POST /api/auth/login`, `POST /api/auth/logout` et `GET /api/auth/me`.
- Utiliser des sessions serveur ou des cookies HttpOnly securises.
- Comparer les mots de passe avec `scrypt` sans jamais les renvoyer.
- Remplacer `ANONYMOUS_USER_ID` par `request.user.id`.
- Proteger les routes de publication et de gestion privee.

### Phase 3 : connecter l'interface

- Recuperer les categories depuis `GET /api/categories`.
- Remplir dynamiquement le select des coachs.
- Transformer les barres de recherche et filtres en vrais champs.
- Afficher les etats chargement, vide, erreur et succes sans `alert`.
- Ajouter une pagination ou un chargement progressif.

### Phase 4 : fonctionnalites communautaires

- Concevoir les tables likes, commentaires, favoris et avis.
- Ajouter moderation, signalement et statut de publication.
- Ajouter profils coachs et demandes de coaching.
- Ajouter une politique de confidentialite et les regles de moderation.

## Regles de travail pour les prochaines modifications

- Lire les fichiers et verifier la base avant chaque changement important.
- Ne pas supprimer les changements existants sans demande explicite.
- Utiliser `apply_patch` pour les modifications manuelles.
- Garder les requetes parametrees.
- Eviter d'exposer les donnees personnelles et les hashes.
- Tester une route ciblee apres chaque changement backend.
- Terminer par `npm run check` et `node --check app.js`.
- Documenter toute nouvelle table, route, variable `.env` ou contrainte metier.

## Fonctionnalites d'interaction ajoutees

- `POST /api/auth/login`, `POST /api/auth/logout` et `GET /api/auth/me` utilisent une session HttpOnly de 7 jours.
- La publication d'une confession exige maintenant une session et utilise `request.user.id`.
- `GET /api/categories` alimente les categories du formulaire.
- Les recherches de confessions, les chips de categories et les filtres coachs appellent l'API.
- Les boutons like, favori et commentaire persistent leurs donnees dans MySQL.
- Le serveur cree automatiquement, avec `CREATE TABLE IF NOT EXISTS`, les tables `sessions`, `confession_likes`, `confession_favorites` et `confession_comments`.
- Les boutons Google et mot de passe oublie affichent leur etat actuel, mais necessitent encore une configuration OAuth et un flux d'e-mail pour devenir complets.

## Pages utilisateur

- Le premier accès à `/` sans session redirige vers `/register.html`.
- Sur la page d'accueil, la section connexion est masquée automatiquement lorsqu'une session active est détectée.
- `/` : accueil, confessions, coachs et publication.
- `/login.html` : connexion. Une connexion reussie redirige vers `/profile.html`.
- `/register.html` : inscription. Une inscription reussie cree la session puis redirige vers `/profile.html`.
- `/profile.html` : espace prive de l'utilisateur, informations personnelles, modification du nom/e-mail, publications personnelles et deconnexion.

Routes profil :

- `GET /api/auth/profile` : retourne l'utilisateur connecte.
- `PATCH /api/auth/profile` : modifie le nom et l'e-mail de l'utilisateur connecte.
- `GET /api/confessions/mine` : retourne les publications de l'utilisateur connecte.

## Candidature coach

Depuis `/profile.html#coach-application`, un utilisateur connecte peut envoyer une candidature avec sa specialite, son experience et sa presentation.

- `GET /api/coaches/application` : retourne la candidature de l'utilisateur courant.
- `POST /api/coaches/application` : cree ou re-soumet une candidature.
- Une nouvelle candidature est enregistree dans `coach_profiles` avec `status = 'PENDING'`.
- Une candidature `PENDING` ou `APPROVED` ne peut pas etre envoyee une seconde fois.
- Seuls les profils `APPROVED` apparaissent dans la liste publique des coachs.
- La validation ou le refus par un administrateur reste a implementer.

## Administration

- `/admin.html` est reserve aux sessions dont le role vaut `ADMIN`.
- `/admin-login.html` est le lien de connexion distinct reserve aux administrateurs.
- Le tableau de bord affiche les statistiques, les comptes, les candidatures coach et les confessions.
- L'administrateur peut valider/refuser/suspendre un profil coach, modifier un role, supprimer un compte et supprimer une confession.
- L'administrateur peut modifier son mot de passe depuis le tableau de bord en confirmant son ancien mot de passe et le nouveau.
- Un lien Administration apparait dans le profil d'un administrateur.
- Le formulaire `/register.html` propose `Compte utilisateur` ou `Compte coach`. Un compte coach recoit le role `COACH` et une candidature `PENDING` dans une transaction SQL.

Pour promouvoir un compte existant en administrateur depuis phpMyAdmin :

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Cette operation doit etre executee uniquement par le proprietaire de la base. Aucun compte administrateur n'etait present lors du dernier diagnostic.
