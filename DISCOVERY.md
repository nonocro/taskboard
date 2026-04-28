# Discovery - Prise en main Taskboard

## Variables d'environnement

Trois variables principales dans `.env`:
- `PORT=3000` - Port du serveur
- `DATABASE_URL=postgresql://taskboard:taskboard123@localhost:5432/taskboard` - Connexion PostgreSQL
- `JWT_SECRET=mysupersecretkey123` - Secret pour les tokens JWT

⚠️ Le `.env` n'est pas dans `.gitignore`, c'est pas ouf de laisser les credentials en dur


## Services externes

**PostgreSQL 14** - Seul service externe, lancé via Docker Compose
- DB créée automatiquement au démarrage
- User `admin/admin123` seeding auto
- Tables users et tasks créées auto lors du premier `npm start`

C'est cool, pas besoin de setup manuel de la BD.


## Scripts disponibles

Dans `package.json`:
- `npm start` - Démarre le serveur en prod
- `npm run dev` - Mode watch (rechargement auto)
- `npm test` - Lance les tests Jest
- `npm run test:coverage` - Rapport de couverture
- `npm run lint` - ESLint

Rien de spécial, c'est standard.


## Problèmes de sécurité détectés

### 🔴 SQL Injection - findByStatus()
Dans `src/models/task.js` ligne 11:
```javascript
const result = await pool.query(`SELECT * FROM tasks WHERE status = '${status}'`);
```
À la place d'une requête paramétrée. Facile à patcher avec `$1`.

### 🟡 Pas de validation des inputs
- Aucune vérification sur les champs POST (title, description, status)
- Pas de contrôle de la longueur des chaînes
- Status accepte n'importe quoi

### 🟡 CORS ouvert à tous
`app.use(cors())` sans restriction. N'importe quel site peut requêter l'API.

### 🟡 Pas de rate limiting
L'endpoint `/auth/login` accepte un nombre illimité de tentatives. Brute force facile.

### Autres petits trucs
- Les logs affichent les requêtes (y compris POST avec données)
- Pas de blacklist pour révoquer les tokens
- Gestion d'erreurs basique (donne des infos sur la BD parfois)


## Dépendances 

6 packages en prod:
- express, pg, jsonwebtoken, bcryptjs, cors, dotenv

3 en dev:
- jest, supertest, eslint

Rien de fouf, c'est all standard pour une API Node/Express.


## Structure du code

- `src/routes/` - Endpoints (auth.js, tasks.js)
- `src/models/` - Requêtes SQL (task.js, user.js)
- `src/middleware/` - Auth, logging, error handling
- `public/` - Frontend statique
- `tests/` - Tests unitaires et d'intégration

Architecture simple et classique. Pas d'ORM, requêtes SQL directes.


## Endpoints testés

- **GET /health** - Retourne le status de l'app et de la BD
- **POST /auth/login** - Auth avec username/password, retourne un JWT
- **GET /tasks** - Liste des tâches (besoin d'un token)
- **POST /tasks** - Crée une tâche (besoin d'un token)
- **PUT /tasks/:id** - Modifie une tâche (besoin d'un token)
- **DELETE /tasks/:id** - Supprime une tâche (besoin d'un token)
- **GET /metrics** - Pas implémenté encore (retourne 501)

Tout fonctionne, la protection JWT marche.


## Tests

Jest + Supertest configured. Tests dans `tests/unit/` et `tests/integration/`.

⚠️ Les tests utilisent une BD séparée `taskboard_test` qui n'existe pas, donc ça va crash au premier `npm test`.


## Hypothèses pour industrialisation (Docker/K8s)

**Points importants à penser:**

1. PostgreSQL en conteneur OK, mais besoin de migrations au démarrage
2. L'app n'a pas de vrai health check (juste une requête à la BD)
3. Pas de graceful shutdown 
4. Secrets management (JWT_SECRET, credentials BD) à gérer proprement
5. Logs en stdout c'est bon pour conteneurs, mais pas structurés (pas de JSON)
6. `/metrics` endpoint à implémenter pour Prometheus

**A faire d'abord:**
1. Fixer la SQL injection 
2. Ajouter validation des inputs
3. Créer Dockerfile + docker-compose finale
4. CI/CD pipeline

## Cas de tests manquants

Cas identifiés qui ne sont toujours pas couverts et qui seraient importants :

**Validation des inputs**
- `POST /tasks` sans `title` : actuellement passe sans erreur, la BD va échouer silencieusement. Important car c'est un contrat API non respecté.
- `PUT /tasks/:id` avec un `status` invalide (ex: `"random"`) : la BD a un CHECK constraint qui va rejeter, mais l'API ne retourne pas de message clair.

**Sécurité auth**
- Token avec signature invalide (clé secrète différente) : devrait retourner 401.
- Token expiré : devrait retourner 401 avec un message spécifique.
- Header `Authorization` malformé (ex: juste `Bearer` sans token) : comportement non testé.

**SQL Injection**
- `GET /tasks?status='; DROP TABLE tasks; --` : `findByStatus` est vulnérable (interpolation directe). Important à tester avant de patcher pour documenter la faille.

**Endpoint /metrics**
- Retourne 501 mais n'est pas testé. Si quelqu'un l'implémente, il faut un test de non-régression.

**Concurrence**
- Deux updates simultanés sur la même tâche : `updated_at` peut être incohérent. Difficile à tester en unit/intégration, nécessiterait des tests E2E avec vraie BD.

## Résumé

- App fonctionne bien localement ✅
- Architecture simple et facile à comprendre ✅
- Quelques failles de sécurité à patcher avant prod ⚠️
- Pas de monitoring/metrics pour maintenant (c'est un MVP) ⚠️
- Tests mis à jour : PUT, DELETE, filtre status, mauvais mot de passe couverts ✅
