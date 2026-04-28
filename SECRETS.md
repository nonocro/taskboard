Qu'est-ce qu'un secret dans le contexte d'une application web ?

Tout information sensible de l'application. Ex : Mot de passe de bdd, api_key.

Pourquoi est-il dangereux de commiter des secrets même dans un dépôt privé ?

Le concept de dépôt privé repose sur la confiance que le développeut à envers github. Si github subit une attaque alors tes variables riques d'etre dibvulguer.

Si tu decide de changer de visibilité. les secrets seront encore présent dans l'historique.

Comment détecter si des secrets ont déjà été leakés dans l'historique Git ?

gitleaks detect --source . --report-format json --report-path report.json

Tu peux faire des recherches ciblées :
git log -p | grep -i "api_key"
git log -p | grep -i "password"
git log -p | grep -i "secret"

Que se passe-t-il si vous supprimez le fichier .env mais que le commit initial est conservé dans l'historique ?

Le fichier est toujours présent dans les anciens commits
N’importe qui peut le récupérer avec :git checkout <ancien_commit> -- .env
---

# Solutions de gestion des secrets (comparaison réalisé à l'aide de Claude)

## 1. Variables d'environnement système

**Fonctionnement:**
- Définir les secrets au niveau du système d'exploitation (export VAR=value en Linux/Mac, set VAR=value en Windows)
- L'application les récupère via `process.env.VAR` (Node.js)

**Avantages:**
- ✅ Simple, rien à configurer
- ✅ Ne sont pas dans le code/git
- ✅ Respecté par tous les outils

**Limitations:**
- ❌ Chiantes à gérer sur plusieurs machines
- ❌ Pas tracé/verrouillé
- ❌ Pas de version/historique
- ❌ Facile d'oublier une variable sur un nouveau serveur

**Contexte adapté:**
- Dev local (avec un .env.example au lieu de .env)
- Serveurs de prod avec beaucoup d'infra as code
- Quand tu veux juste éviter les leaks git (peu de secrets)

---

## 2. Fichiers `.env` avec `.gitignore` strict

**Fonctionnement:**
- Créer un `.env` avec les secrets
- Ajouter `.env` à `.gitignore`
- Charger via `dotenv` au démarrage de l'app

**Avantages:**
- ✅ Super facile à développer localement
- ✅ Flexible (un fichier par environnement: .env.dev, .env.prod)
- ✅ Lisible, facile à maintenir

**Limitations:**
- ❌ DANGEREUX si quelqu'un oublie .env dans .gitignore
- ❌ Pas de chiffrement, stocké en clair sur le disque
- ❌ Pas de contrôle d'accès dans l'équipe
- ❌ Complexe de partager entre devs sans git

**Contexte adapté:**
- Développement local (OBLIGATOIRE)
- Petits projets/prototypes
- PAS en prod (trop risqué)

---

## 3. Secrets GitHub Actions (pour la CI/CD)

**Fonctionnement:**
- Créer des "Secrets" dans les settings du repo GitHub
- GitHub les injecte dans les workflows sous forme de variables d'environnement
- Automatiquement masqués dans les logs

**Avantages:**
- ✅ Sécurisé (chiffré chez GitHub)
- ✅ Integré natif à GitHub
- ✅ Automatiquement masqué dans les logs (pas visible si leak du log)
- ✅ Facile de rotater un secret

**Limitations:**
- ❌ Que pour la CI/CD (pas directement en prod)
- ❌ Verrouillé à GitHub (pas portable)
- ❌ Pas de versioning/historique des changements
- ❌ Il faut comprendre les workflows GitHub Actions

**Contexte adapté:**
- CI/CD pipelines GitHub Actions
- Tokens pour déployer sur des services (Docker Hub, AWS, etc)
- Clés d'API pour les tests
- Secrets nécessaires seulement en CI

---

## 4. SOPS (Secrets OPerationS)

**Fonctionnement:**
- Fichier YAML/JSON avec les secrets, chiffré avec une clé maître
- Clé maître stockée ailleurs (AWS KMS, GCP KMS, vault, etc)
- On commit le fichier chiffré dans git
- Au déploiement, SOPS déchiffre avec la clé maître

**Avantages:**
- ✅ Secrets versionné dans git (chiffré)
- ✅ Historique des changements
- ✅ Flexible (plusieurs systèmes de chiffrement)
- ✅ Portable entre services

**Limitations:**
- ❌ Setup complexe (besoin d'une clé maître)
- ❌ Extra tooling à installer
- ❌ Pas aussi user-friendly que .env
- ❌ Si la clé maître leak, tout leak

**Contexte adapté:**
- Projets d'infrastructure moyenne
- Quand tu veux versionner les secrets (audit/compliance)
- Équipes avec rigeur DevOps
- Kubernetes avec versioning

---

## 5. HashiCorp Vault

**Fonctionnement:**
- Service centralisé qui stocke les secrets (chiffré)
- L'app se connecte à Vault au démarrage avec une auth method
- Récupère les secrets via une API
- Vault gère les permissions, audit, rotation

**Avantages:**
- ✅ Solution enterprise-ready
- ✅ Audit complet (qui a accédé à quel secret et quand)
- ✅ Rotation de secrets automatique
- ✅ Plusieurs methods d'auth (JWT, AppRole, etc)
- ✅ Pas de secrets locaux du tout

**Limitations:**
- ❌ TRES complexe à installer/maîtriser
- ❌ Un service externe à maintenir
- ❌ Overkill pour petits projets
- ❌ Si Vault crash, l'app peut pas démarrer
- ❌ Coûteux en infrastructure

**Contexte adapté:**
- Grosses orgas avec beaucoup d'infra
- Compliance/sécurité stricte requise
- Besoin d'audit des accès aux secrets
- Nombreux services qui partagent des secrets

---

## 6. Gestionnaires de secrets cloud

### AWS Secrets Manager
**Fonctionnement:**
- Stocker les secrets dans AWS Secrets Manager (chiffré avec KMS)
- IAM roles pour donner accès aux apps
- Les apps requêtent via AWS SDK

**Avantages:**
- ✅ Sécurisé (AWS gère le chiffrement)
- ✅ Intégré à l'écosystème AWS
- ✅ Rotation automatique possible
- ✅ Audit natif (CloudTrail)

**Limitations:**
- ❌ Verrouillé à AWS
- ❌ Coûteux (par secret par mois)
- ❌ Nécessite AWS SDK dans l'app
- ❌ Latence réseau (requête HTTP à AWS)

---

### GCP Secret Manager
**Fonctionnement:**
- Pareil qu'AWS, mais pour Google Cloud
- Intégré à Cloud IAM et Cloud Audit

**Avantages:**
- ✅ Sécurisé (Google gère le chiffrement)
- ✅ Intégré à GCP
- ✅ Moins cher qu'AWS généralement

**Limitations:**
- ❌ Verrouillé à GCP
- ❌ Dépendance réseau

---

**Contexte adapté:**
- Apps sur cloud (AWS, GCP, etc)
- Quand tu veux pas gérer ta proprio infra de secrets
- Quand tu as déjà des IAM roles configurés

---

## Comparatif résumé

| Solution | Simplicité | Sécurité | Scalabilité | Coût | Contexte |
|----------|-----------|----------|-------------|------|---------|
| **Env vars système** | ⭐⭐ | ⭐ | ⭐⭐ | Gratuit | Dev local |
| **.env + .gitignore** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | Gratuit | Dev local |
| **GitHub Actions Secrets** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Gratuit | CI/CD GitHub |
| **SOPS** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Gratuit | Infra moyenne |
| **HashiCorp Vault** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Cher | Grandes orgas |
| **Cloud Secrets (AWS/GCP)** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Moyen | Apps cloud |

---

## Recommandation pour Taskboard

**En dev:** .env local (pas commité)
**En CI/CD:** GitHub Actions Secrets pour les clés de déploiement
**En prod:** AWS/GCP Secret Manager (si on déploie sur cloud) ou SOPS (si on veut rester indépendant)