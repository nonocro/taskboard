Quelle est la différence entre CI (Intégration Continue) et CD (Déploiement Continu) ?

CI : chaque push déclenche automatiquement lint, tests et build. L'objectif est de détecter les régressions le plus tôt possible.
CD : va plus loin, l'artefact validé est automatiquement déployé en staging ou en production. CI est un prérequis au CD.

Qu'est-ce qu'un runner GitHub Actions ? Où s'exécute-t-il ?

C'est la machine virtuelle qui exécute les jobs. GitHub fournit des runners hébergés qui tournent dans le cloud GitHub. On peut aussi héberger son propre runner (self-hosted) sur son infra.

Qu'est-ce qu'un artefact de pipeline ? Dans quels cas est-il utile ?

Un artefact est un fichier produit par un job et conservé après la fin du pipeline (rapport de couverture, binaire compilé, image Docker locale). Utile pour debugger un test qui a échoué ou pour partager un build entre jobs sans le reconstruire.

Comment les jobs peuvent-ils dépendre les uns des autres ?

Avec le mot-clé `needs`. Un job listé dans `needs` doit réussir avant que le suivant démarre. Ça permet de bloquer le build si les tests échouent, sans avoir à tout mettre dans un seul job.

---

Comparaison des plateformes CI/CD

GitHub Actions : gratuit pour les dépôts publics, YAML natif dans le repo, 2000 min/mois gratuit sur les privés, écosystème énorme (Actions Marketplace). Courbe d'apprentissage faible si on connaît déjà GitHub.

GitLab CI : gratuit pour les dépôts publics, syntaxe `.gitlab-ci.yml` légèrement différente, runners partagés limités sur le plan gratuit. Très puissant si tout l'écosystème est GitLab (registry, issues, etc.).

CircleCI : plan gratuit limité, syntaxe plus verbeuse, bon écosystème mais moins intégré qu'Actions si le code est sur GitHub.

Pour ce projet (repo GitHub public) : GitHub Actions est le choix évident, les secrets GITHUB_TOKEN et GHCR sont disponibles nativement.

---

Comparaison des registries Docker

Docker Hub : le plus connu, gratuit pour les images publiques, limites de pull sur le plan gratuit (100 pulls/6h non authentifié). Indépendant de GitHub.

GHCR (GitHub Container Registry) : intégré à GitHub, authentification via GITHUB_TOKEN (pas de secret à configurer), gratuit pour les repos publics, packages visibles directement sur le profil GitHub.

Amazon ECR / GCP Artifact Registry : solutions cloud, idéales si on déploie sur AWS/GCP, nécessitent des credentials IAM supplémentaires, coût à l'usage.

Pour ce projet : GHCR est le meilleur choix. Le GITHUB_TOKEN est automatiquement disponible dans les workflows, pas besoin de configurer de secret supplémentaire.

---

Cache

npm : `actions/setup-node` avec `cache: 'npm'` met en cache `~/.npm` à partir du hash de `package-lock.json`. Le second run ne re-télécharge pas les packages si le lockfile n'a pas changé.

Docker layers : BuildKit expose `type=gha` pour stocker les layers dans le cache GitHub Actions. Les layers qui n'ont pas changé (ex: installation des deps) sont réutilisées directement sans rebuild.
