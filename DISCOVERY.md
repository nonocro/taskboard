# Compte-rendu — Taskboard Infrastructure DevOps

## Table des matières

1. [Prise en main](#1-prise-en-main)
2. [Tests automatisés](#2-tests-automatisés)
3. [Conteneurisation](#3-conteneurisation)
4. [Gestion des secrets](#4-gestion-des-secrets)
5. [Pipeline CI/CD](#5-pipeline-cicd)
6. [Déploiement SSH](#6-déploiement-ssh)

---

## 1. Prise en main

### Variables d'environnement

Trois variables principales dans `.env` :

| Variable | Exemple | Rôle |
|----------|---------|------|
| `PORT` | `3000` | Port du serveur |
| `DATABASE_URL` | `postgresql://taskboard:taskboard123@localhost:5432/taskboard` | Connexion PostgreSQL |
| `JWT_SECRET` | `mysupersecretkey123` | Secret pour les tokens JWT |

### Services externes

**PostgreSQL 14** — seul service externe, lancé via Docker Compose.
- Base créée automatiquement au démarrage
- User `admin/admin123` seedé automatiquement
- Tables `users` et `tasks` créées au premier `npm start`

### Endpoints testés

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `GET` | `/health` | — | Statut de l'app et de la BD |
| `POST` | `/auth/login` | — | Retourne un JWT |
| `GET` | `/tasks` | ✅ | Liste des tâches |
| `POST` | `/tasks` | ✅ | Crée une tâche |
| `PUT` | `/tasks/:id` | ✅ | Modifie une tâche |
| `DELETE` | `/tasks/:id` | ✅ | Supprime une tâche |
| `GET` | `/metrics` | — | Non implémenté (retourne 501) |

### Scripts disponibles dans `package.json`

```json
"scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/"
  },
```

### Problèmes de sécurité détectés

#### 🔴 SQL Injection — `findByStatus()`

```js
// src/models/task.js:11 — interpolation directe, vulnérable
const result = await pool.query(`SELECT * FROM tasks WHERE status = '${status}'`);
```

À remplacer par une requête paramétrée avec `$1`.

#### 🟡 Pas de validation des inputs

- Aucune vérification sur les champs POST (`title`, `description`, `status`)
- `status` accepte n'importe quelle valeur

#### 🟡 CORS ouvert

`app.use(cors())` sans restriction — n'importe quel site peut requêter l'API.

#### 🟡 Pas de rate limiting

`/auth/login` accepte un nombre illimité de tentatives, brute force trivial.

---

## 2. Tests automatisés

### Concepts clés

**Pyramide des tests**

```
        /\
       /E2E\        ← peu, lents, testent tout le système
      /-----\
     / Intég.\    ← testent plusieurs composants ensemble
    /---------\
   / Unitaires \ ← beaucoup, rapides, isolés
  /_____________\
```

- **Unitaire** : teste une fonction seule, tout le reste est mocké
- **Intégration** : route + middleware + modèle, la BD peut être réelle ou mockée
- **E2E** : teste l'application comme un vrai utilisateur

**Couverture de code**

La couverture mesure le pourcentage de lignes/branches exécutées. 100% de couverture ne garantit pas la qualité : un test peut traverser une ligne sans vérifier le résultat.

### Outils retenus

| Outil | Rôle |
|-------|------|
| **Jest** | Runner + assertions + mocks intégrés |
| **Supertest** | Requêtes HTTP sur l'app Express sans serveur réel |
| **Istanbul** | Couverture native via `--coverage` (intégré à Jest) |
| **ESLint** | Lint statique, configuré avec `eslint:recommended` |

### Revue des tests

**Déjà testés (existant)**

- `GET /health` (200 ok, 503 db fail)
- `POST /auth/login` (credentials valides, user inconnu, champs manquants)
- `GET /tasks` (401 sans token, 200 avec token)
- `POST /tasks` (201 créé)
- Task model : `findAll`, `findById`, `create`, `delete`

**Ajoutés**

- `PUT /tasks/:id` (mise à jour, 404 si inexistant)
- `DELETE /tasks/:id` (suppression, 404 si inexistant)
- `GET /tasks?status=todo` (filtre par statut)
- `POST /auth/login` avec mauvais mot de passe (401)
- `Task.update` et `Task.findByStatus` (modèle)

### Rapport de couverture final

File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s       
----------------|---------|----------|---------|---------|-------------------------
All files       |    75.3 |    71.87 |   66.66 |    75.3 |                         
 src            |    54.9 |        0 |   14.28 |    54.9 |                         
  app.js        |      96 |      100 |      50 |      96 | 37                      
  db.js         |   66.66 |      100 |       0 |   66.66 | 8-9                     
  server.js     |       0 |        0 |       0 |       0 | 1-55                    
 src/middleware |   79.31 |       50 |      75 |   79.31 |                         
  auth.js       |   81.25 |    83.33 |     100 |   81.25 | 12,22-23                
  errors.js     |      40 |        0 |       0 |      40 | 2-5                     
  logging.js    |     100 |      100 |     100 |     100 |                         
 src/models     |    90.9 |      100 |    87.5 |    90.9 |                         
  task.js       |     100 |      100 |     100 |     100 |                         
  user.js       |   71.42 |      100 |      50 |   71.42 | 10-11                   
 src/routes     |   84.37 |      100 |     100 |   84.37 |                         
  auth.js       |    90.9 |      100 |     100 |    90.9 | 38-39                   
  tasks.js      |   80.95 |      100 |     100 |   80.95 | 21-22,35-36,53-54,70-71 

---

## 3. Conteneurisation

### Pourquoi conteneuriser ?

Conteneuriser isole l'app de la machine hôte : même version de Node, mêmes dépendances, même comportement en dev, CI et prod. Sans conteneur, "ça marche sur ma machine" est un vrai risque.

**Build reproductible** : même artefact à partir du même code source, peu importe qui build et quand. Indispensable pour débugger un build précis si un bug apparaît en prod.

### Choix de l'image de base

| Image | Taille | Verdict |
|-------|--------|---------|
| `node:20` | ~1 Go | Inclut tout Debian — inutile en prod |
| `node:20-slim` | ~250 Mo | Compromis raisonnable |
| `node:20-alpine` | ~180 Mo | ✅ Retenu — léger, moins de surface d'attaque |
| `distroless` | ~60 Mo | Le plus sécurisé mais difficile à débugger |

### Stratégie multi-stage

- **Sans multi-stage** : les couches `npm ci` + outils de build restent dans l'image finale
- **Avec multi-stage** : une étape installe les dépendances, l'étape finale copie seulement le nécessaire → image plus petite, pas d'outils de build en prod

### Sécurité de l'image

- **Utilisateur non-root** : exécuter en root dans un conteneur = si l'app est compromise, l'attaquant a les droits root. Un utilisateur dédié limite les dégâts.
- **HEALTHCHECK** : permet à Docker de savoir si l'app répond réellement, pas seulement si le processus tourne.

### Gestion des dépendances

- `npm install` recalcule les versions possibles
- `npm ci` installe exactement ce qui est dans `package-lock.json` → **build reproductible garanti**
- `--omit=dev` exclut les devDependencies (jest, eslint) de l'image de prod

---

## 4. Gestion des secrets

### Concepts clés

**Qu'est-ce qu'un secret ?**
Toute information sensible de l'application : mot de passe de BD, clé d'API, token JWT.

**Pourquoi ne pas commiter des secrets même dans un dépôt privé ?**
- La confidentialité d'un dépôt privé repose sur la confiance envers GitHub — si GitHub est compromis, les secrets sont exposés
- Si la visibilité change, les secrets restent dans l'historique Git
- `git checkout <ancien_commit> -- .env` suffit à récupérer un fichier supprimé

**Détecter des secrets déjà leakés :**
```bash
gitleaks detect --source . --report-format json --report-path report.json

# Recherches ciblées dans l'historique
git log -p | grep -i "api_key"
git log -p | grep -i "password"
git log -p | grep -i "secret"
```

### Comparaison des solutions

#### 1. Variables d'environnement système

Définies au niveau de l'OS (`export VAR=value`), récupérées via `process.env.VAR`.

**✅ Simple, rien à configurer, pas dans git**
**❌ Difficiles à gérer sur plusieurs machines, pas de versioning**

Adapté : dev local, serveurs avec infrastructure-as-code.

---

#### 2. Fichiers `.env` + `.gitignore`

Fichier `.env` local chargé via `dotenv`, jamais commité.

**✅ Très simple en dev, flexible (`.env.dev`, `.env.prod`)**
**❌ Dangereux si `.gitignore` est oublié, stocké en clair, pas de contrôle d'accès**

Adapté : développement local uniquement. **Pas en prod.**

---

#### 3. GitHub Actions Secrets

Secrets définis dans les settings du repo, injectés comme variables d'environnement dans les workflows, masqués automatiquement dans les logs.

**✅ Chiffrés, natifs GitHub, rotation facile, masqués dans les logs**
**❌ Uniquement pour la CI/CD, verrouillé à GitHub, pas de versioning**

Adapté : pipelines CI/CD, tokens de déploiement, clés d'API pour les tests.

---

#### 4. SOPS (Secrets OPerationS)

Fichier YAML/JSON chiffré avec une clé maître (AWS KMS, GCP KMS, etc.), commité dans Git.

**✅ Secrets versionnés et auditables, portable**
**❌ Setup complexe, si la clé maître leak tout leak**

Adapté : projets d'infrastructure moyenne, équipes avec rigueur DevOps.

---

#### 5. HashiCorp Vault

Service centralisé, l'app récupère les secrets via API au démarrage, avec audit complet et rotation automatique.

**✅ Enterprise-ready, audit complet, rotation automatique**
**❌ Très complexe, service externe à maintenir, overkill pour petits projets**

Adapté : grandes organisations, compliance stricte, nombreux services partageant des secrets.

---

#### 6. Gestionnaires cloud (AWS / GCP)

| | AWS Secrets Manager | GCP Secret Manager |
|-|--------------------|--------------------|
| **Auth** | IAM Roles | Cloud IAM |
| **Audit** | CloudTrail | Cloud Audit |
| **Coût** | Par secret/mois | Moins cher |
| **Lock-in** | AWS | GCP |

Adapté : applications hébergées sur cloud avec IAM déjà configuré.

---

### Pour notre projet

| Contexte | Solution retenue |
|----------|-----------------|
| Dev local | `.env` (non commité) |
| CI/CD | GitHub Actions Secrets |
| Prod cloud | AWS/GCP Secret Manager |
| Prod indépendant | SOPS |

---

## 5. Pipeline CI/CD

### Concepts clés

**CI vs CD**
- **CI (Intégration Continue)** : chaque push déclenche automatiquement lint, tests et build. Objectif : détecter les régressions le plus tôt possible.
- **CD (Déploiement Continu)** : l'artefact validé est automatiquement déployé en staging ou en production. La CI est un prérequis au CD.

**Runner GitHub Actions**
Machine virtuelle qui exécute les jobs. GitHub fournit des runners hébergés dans le cloud. On peut aussi héberger son propre runner (self-hosted) sur sa propre infrastructure.

**Artefact de pipeline**
Fichier produit par un job et conservé après la fin du pipeline (rapport de couverture, binaire compilé, image Docker). Utile pour débugger un test échoué ou partager un build entre jobs sans reconstruire.

**Dépendances entre jobs**
Le mot-clé `needs` permet de chaîner les jobs : un job listé dans `needs` doit réussir avant que le suivant démarre. Ça permet de bloquer le build si les tests échouent.

### Comparaison des plateformes CI/CD

| Plateforme | Gratuit | Intégration GitHub | Points forts | Limites |
|-----------|:---:|:---:|------|------|
| **GitHub Actions** | ✅ (public) / 2000 min (privé) | Natif | Écosystème énorme, GITHUB_TOKEN natif | — |
| **GitLab CI** | ✅ (public) | Via import | Puissant si tout l'écosystème est GitLab | Runners partagés limités |
| **CircleCI** | Limité | Via OAuth | Bon écosystème | Plus verbeux, moins intégré |

**Choix retenu : GitHub Actions**, le repo est public sur GitHub, `GITHUB_TOKEN` et GHCR sont disponibles nativement, pas de secret supplémentaire à configurer.

### Comparaison des registries Docker

| Registry | Auth | Gratuit | Points forts | Limites |
|---------|------|:---:|------|------|
| **Docker Hub** | Docker login | Images publiques | Le plus connu | 100 pulls/6h non authentifié |
| **GHCR** | `GITHUB_TOKEN` | Repos publics | Intégré GitHub, pas de secret à configurer | — |
| **Amazon ECR** | IAM | ❌ | Intégré AWS | Credentials IAM, coût à l'usage |
| **GCP Artifact Registry** | IAM | ❌ | Intégré GCP | Idem |

**Choix retenu : GHCR**, authentification automatique via `GITHUB_TOKEN`, aucun secret supplémentaire.

### Cache

**npm**
`actions/setup-node` avec `cache: 'npm'` met en cache `~/.npm` à partir du hash de `package-lock.json`. Si le lockfile n'a pas changé, les packages ne sont pas re-téléchargés.

**Docker layers**
BuildKit expose `type=gha` pour stocker les layers dans le cache GitHub Actions. Les layers inchangées (ex : installation des dépendances) sont réutilisées directement sans rebuild.

---

## 6. Déploiement SSH

### Concepts clés

**Déploiement idempotent**
Relancer le même script deux fois donne le même résultat, sans erreur ni doublon. Important car la CI peut rejouer un job en cas d'échec partiel.

**Healthcheck post-déploiement**
Vérification automatique après le démarrage du conteneur. Il doit confirmer que l'application répond réellement (pas seulement que le processus existe). Dans notre cas : attendre que `docker inspect` signale le conteneur `healthy`, ce qui correspond au `HEALTHCHECK` défini dans le Dockerfile (requête HTTP sur `/health` qui interroge la BD).

**Tunnel SSH — pourquoi ?**
GitHub Actions tourne dans le cloud et ne peut pas atteindre directement une machine derrière un routeur domestique. Solution : ouvrir un tunnel depuis la machine locale vers un serveur public. Le runner se connecte à ce serveur, qui redirige vers la machine locale (**reverse port forwarding**).

- `ssh -L` : forwardit un port distant vers le local (le client accède à distance)
- `ssh -R` : forwardit un port local vers un serveur distant — c'est ce qu'on utilise

### Comparaison des outils de tunnel

| Outil | Install | Gratuit | Fiabilité | Notes |
|-------|:---:|:---:|:---:|------|
| **serveo.net** | ❌ | ✅ | ⭐⭐ | Tombe régulièrement, maintenu par un dev indépendant |
| **localhost.run** | ❌ | HTTP seul | ⭐⭐ | Ports TCP arbitraires sur plan payant |
| **ngrok** | ✅ | 1 tunnel TCP | ⭐⭐⭐⭐ | URL change à chaque redémarrage (plan gratuit) |
| **Cloudflare Tunnel** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | Très stable, overkill pour un TP |

**Choix retenu : ngrok** (serveo.net initialement prévu, mais non-disponible).

### Authentification SSH : clé dédiée

Le mot de passe est exclu : non automatisable en CI sans le stocker en clair.

**Clé Ed25519** : recommandée aujourd'hui, plus courte qu'RSA 4096 et aussi sûre.

```bash
ssh-keygen -t ed25519 -C "deploy-key" -f ~/.ssh/id_deploy -N ""
```

- La **clé privée** va dans les secrets GitHub (`DEPLOY_KEY`)
- La **clé publique** est copiée dans `authorized_keys` du serveur SSH via variable d'environnement au démarrage du conteneur

### Architecture mise en place

```
GitHub Actions (cloud)
        │
        │  SSH (port 2222)
        ▼
   [ngrok tunnel]
        │
        ▼
   ssh-server (conteneur Alpine + openssh + docker CLI)
        │  socket Docker monté
        ▼
   Docker Engine (hôte)
        │
        ├── db (PostgreSQL — permanent)
        └── taskboard-app (redéployé à chaque push)
```

`compose.yml` lance deux services permanents :
- `db` : PostgreSQL (toujours actif)
- `ssh-server` : Alpine avec openssh + docker CLI, accès au socket Docker de l'hôte

Le job de déploiement CI :
1. `docker pull` la nouvelle image depuis GHCR
2. Stop + `rm` l'ancien conteneur
3. `docker run` le nouveau conteneur sur le réseau `taskboard`
4. Attend que Docker signale le conteneur `healthy`

### Secrets requis

| Secret | Contenu |
|--------|---------|
| `DEPLOY_KEY` | Clé privée SSH (Ed25519) |
| `DEPLOY_HOST` | Hôte du tunnel (ex: `0.tcp.ngrok.io`) |
| `DEPLOY_PORT` | Port du tunnel (ex: `12345`) |
| `JWT_SECRET` | Secret JWT injecté dans le conteneur au démarrage |
| `POSTGRES_USER` | Login PostgreSQL (l'URL est reconstruite avec `db` comme host dans le workflow) |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base PostgreSQL |