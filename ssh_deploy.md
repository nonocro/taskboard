Comment GitHub Actions peut-il se connecter à une machine locale derrière un NAT ?

GitHub Actions tourne dans le cloud et ne peut pas atteindre directement une machine derrière un routeur domestique. La solution : ouvrir un tunnel depuis la machine locale vers un serveur public. Le runner cloud se connecte à ce serveur, qui redirige vers la machine locale. C'est du reverse port forwarding.

Qu'est-ce qu'un tunnel SSH ? Comment fonctionne le port forwarding inversé (-R) ?

- SSH -L : forwardit un port distant vers le local (le client accède à distance).
- SSH -R : forwardit un port local vers un serveur distant (le serveur rend accessible ce qui tourne en local).
Exemple : `ssh -R 2222:localhost:2222 serveo.net` → quiconque se connecte à serveo.net:2222 atterrit sur localhost:2222.

Qu'est-ce qu'un déploiement idempotent ? Pourquoi est-ce important ?

Idempotent = relancer le même script deux fois donne le même résultat, sans erreur ni doublon. Important parce que la CI peut rejouer un job en cas d'échec partiel.

Qu'est-ce qu'un healthcheck post-déploiement ? Que doit-il vérifier ?

C'est une vérification automatique après le démarrage du conteneur. Il doit confirmer que l'application répond réellement (pas juste que le processus existe). Dans notre cas : attendre que `docker inspect` signale le conteneur `healthy`, ce qui correspond au HEALTHCHECK défini dans le Dockerfile (requête HTTP sur /health qui interroge la BD).

---

Comparaison des outils de tunnel SSH

serveo.net : pas d'installation, juste SSH. Gratuit, mais c'est un service gratuit maintenu par un développeur indépendant, sans SLA ni infrastructure dédiée. Il tombe régulièrement pendant des heures ou des jours, redémarre, retombe. 

Commande : `ssh -R 2222:localhost:2222 serveo.net`.

localhost.run : même principe (SSH), pas d'installation, gratuit pour HTTP seulement. Les ports TCP arbitraires sont sur plan payant.

ngrok : le plus fiable, nécessite installation + compte gratuit, 1 tunnel TCP inclus. L'URL change à chaque redémarrage sur le plan gratuit. Commande : `ngrok tcp 2222`.

Cloudflare Tunnel (cloudflared) : très stable, tunnels persistants, nécessite un compte et une configuration DNS. Overkill pour un TP.

Pinggy : similaire à ngrok, moins connu. Plan gratuit limité.

Choix retenu : serveo.net pour sa simplicité (zéro install), avec ngrok en fallback si serveo est indisponible.

Finalement, dû à la non disponibilité de serveo. ngrok est utilisé.

---

Authentification SSH : clé dédiée vs mot de passe

Le mot de passe est exclu : pas automatisable en CI sans le stocker en clair.
Clé Ed25519 : recommandée aujourd'hui, plus courte qu'RSA 4096 et aussi sûre. Génération : `ssh-keygen -t ed25519 -C "deploy-key" -f ~/.ssh/id_deploy -N ""`.
La clé privée va dans les secrets GitHub (DEPLOY_KEY). La clé publique est copiée dans `authorized_keys` du serveur SSH via une variable d'environnement au démarrage du conteneur.

---

Architecture mise en place

`compose.yml` lance deux services permanents :
- `db` : PostgreSQL (toujours actif)
- `ssh-server` : conteneur Alpine avec openssh + docker CLI, accès au socket Docker de l'hôte

Le tunnel expose le port 2222 du ssh-server vers l'extérieur.

GitHub Actions SSH dans ce conteneur et exécute `deploy.sh` qui :
1. `docker pull` la nouvelle image depuis GHCR
2. Stop + rm l'ancien conteneur
3. `docker run` le nouveau conteneur sur le réseau `taskboard`
4. Attend que Docker signale le conteneur `healthy`

Les secrets requis dans GitHub :
- `DEPLOY_KEY` : clé privée SSH
- `DEPLOY_HOST` : hôte du tunnel (ex: serveo.net)
- `DEPLOY_PORT` : port du tunnel (ex: 2222)
- `JWT_SECRET` : secret JWT injecté dans le conteneur au démarrage
