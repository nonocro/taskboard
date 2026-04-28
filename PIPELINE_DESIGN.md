# Pipeline Design

## Événements déclencheurs

- `push` sur toutes les branches → lint + test (détection de régression rapide)
- `push` sur `main` uniquement → build + push GHCR (après lint + test)

## Stages et jobs

```
lint ──► test ──► build
```

| Job | Stage | Dépend de | Condition |
|-----|-------|-----------|-----------|
| lint | quality | — | toujours |
| test | quality | lint | toujours |
| build | delivery | test | push sur main uniquement |

## Détail des jobs

**lint**
- Setup Node 20 avec cache npm
- `npm ci`
- `npm run lint` → échoue si erreurs ESLint

**test**
- Setup Node 20 avec cache npm
- `npm ci`
- `npm run test:coverage`
- Upload du dossier `coverage/` en artefact

**build**
- Setup Buildx (BuildKit)
- Login GHCR via `GITHUB_TOKEN`
- `docker/build-push-action` avec cache `type=gha`
- Tags : `ghcr.io/<owner>/<repo>:<sha>` + `latest`

## Règles de sécurité

- Le `GITHUB_TOKEN` a les permissions `packages: write` uniquement sur le job build
- Le push vers GHCR ne s'exécute que sur `main` (`push: ${{ github.ref == 'refs/heads/main' }}`)
- Un échec de lint ou de test bloque le job build via `needs`

## Tags d'image

- `sha-<7 premiers caractères du commit SHA>` → traçabilité
- `latest` → uniquement sur main, pointe toujours vers le dernier build stable
