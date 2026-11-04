# GameHub - projet jeux en ligne

Un site web pour jouer a des jeux de plateau contre d'autres joueurs.
On peut creer un compte, se connecter, voir les autres joueurs, et lancer une partie.

Jeux disponibles : Sudoku (solo), Tic-tac-toe et Puissance 4 (a deux).

## Technologies

Node, Express, EJS, PostgreSQL (pg), jQuery, Bootstrap et AJAX.

## Installation

1. Installer les dependances :

   npm install

2. Creer la base de donnees PostgreSQL :

   createdb base_projet_pw

3. Mettre vos infos PostgreSQL dans le fichier `.env` :

   PGUSER=votre_nom
   PGHOST=localhost
   PGDATABASE=base_projet_pw
   PGPASSWORD=votre_mot_de_passe
   PGPORT=5432

4. Creer les tables :

   npm run setup_db

## Lancer le serveur

npm run dev

Le site est accessible sur http://localhost:8080

## Structure des dossiers

- `app.js` : point d'entree du serveur
- `db.js` : connexion a la base de donnees
- `setup_db.sql` : creation des tables
- `routes/` : les routes (auth, sudoku, connect4, tictactoe, invitations)
- `queries/` : les requetes SQL rangees par sujet
- `games/` : la logique des jeux (verifier une grille, un gagnant, etc)
- `middleware/` : verification de connexion
- `views/` : les pages EJS
- `views/partials/` : morceaux de pages reutilises (navbar, modals, etc)
- `public/css/` : les styles
- `public/js/` : le javascript cote client
