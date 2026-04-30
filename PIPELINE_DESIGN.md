# Pipeline Design

## Événements déclencheurs

- `push` sur toutes les branches → lint + test (détection de régression rapide)
- `push` sur `main` uniquement → build + push GHCR + déploiement (après lint + test)

## Stages et jobs

```
lint ──► test ──► build ──► deploy
```

| Job | Stage | Dépend de | Condition |
|-----|-------|-----------|-----------|
| lint | quality | — | toujours |
| test | quality | lint | toujours |
| build | delivery | test | push sur main uniquement |
| deploy | delivery | build | push sur main uniquement |

## Détail des jobs

**lint**
- Setup Node 20 avec cache npm
- `npm ci`
- `npm run lint` → échoue si erreurs ESLint

**test**
- Setup Node 20 avec cache npm
- `npm ci`
- `npm run test:coverage`
- Upload du dossier `coverage/` en artefact (7 jours, `if: always()`)

**build**
- Setup Buildx (BuildKit)
- Login GHCR via `GITHUB_TOKEN`
- `docker/build-push-action` avec cache `type=gha`
- Tag : `ghcr.io/<owner>/<repo>:sha-<SHA complet du commit>`

**deploy**
- Injecte la clé privée SSH dans `~/.ssh/id_deploy` (depuis `DEPLOY_KEY`)
- Se connecte via SSH au serveur cible (`DEPLOY_HOST:DEPLOY_PORT`)
- Exécute le script de déploiement inline :
  1. `docker pull` l'image taguée avec le SHA du commit courant
  2. Stop + `rm` le conteneur existant (`taskboard-app`)
  3. Libère le port 3000 si occupé par un autre conteneur
  4. `docker run` le nouveau conteneur
  5. Attend jusqu'à 30 itérations (×3 s) que Docker signale le conteneur `healthy`
  6. Échoue et affiche les logs si le healthcheck ne passe pas

## Secrets requis

| Secret | Utilisé dans | Rôle |
|--------|-------------|------|
| `GITHUB_TOKEN` | build | Login GHCR (injecté automatiquement) |
| `DEPLOY_KEY` | deploy | Clé privée SSH Ed25519 |
| `DEPLOY_HOST` | deploy | Hôte du tunnel SSH (ex: `0.tcp.ngrok.io`) |
| `DEPLOY_PORT` | deploy | Port du tunnel SSH |
| `JWT_SECRET` | deploy | Injecté dans le conteneur au démarrage |
| `POSTGRES_USER` | deploy | Login PostgreSQL |
| `POSTGRES_PASSWORD` | deploy | Mot de passe PostgreSQL |
| `POSTGRES_DB` | deploy | Nom de la base PostgreSQL |

## Règles de sécurité

- Le `GITHUB_TOKEN` a les permissions `packages: write` uniquement sur le job build
- Build et deploy ne s'exécutent que sur `main`
- Un échec de lint ou de test bloque build via `needs` ; un échec de build bloque deploy
- La clé SSH est écrite dans un fichier `600` en mémoire et jamais loguée

