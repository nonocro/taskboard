Pourquoi conteneuriser une application Node.js alors qu'on peut la lancer directement ?

Conteneuriser isole l'app de la machine hôte : même version de Node, mêmes dépendances, même comportement partout (dev, CI, prod). Sans conteneur, "ça marche sur ma machine" devient un vrai problème.

Qu'est-ce que le concept de « build reproductible » et pourquoi est-il important ?

Un build reproductible donne exactement le même artefact à partir du même code source, peu importe qui le build et quand. Important parce que ça évite les surprises en prod et ça permet de débugger un build précis si un bug apparaît.

Quelle est la différence entre une image de développement et une image de production ?

Dev : inclut les devDependencies (jest, eslint...), outils de debug, hot-reload. Lourde mais pratique.
Prod : seulement les dépendances runtime, pas d'outils inutiles, taille minimale, utilisateur non-root.

---

Choix de l'image de base : node:20-alpine

- node:20 (~1 Go) inclut tout Debian.
- node:20-alpine (~180 Mo) utilise Alpine Linux, beaucoup plus léger et moins de surface d'attaque. 
- node:20-slim est entre les deux mais alpine reste le meilleur compromis taille/compatibilité pour une app Express classique. 
- distroless est le plus sécurisé mais compliqué à debugger.

Stratégie de build : multi-stage

- Une seule étape : le npm ci + toutes les couches intermédiaires restent dans l'image finale.
- Multi-stage : une étape installe les deps, l'étape finale copie seulement ce qui est nécessaire. 

`Résultat : image plus petite, pas d'outils de build en prod.`

Sécurité de l'image

Exécuter en root dans un conteneur = si l'app est compromise, l'attaquant a les droits root dans le conteneur. Un utilisateur dédié limite les dégâts. 

Le HEALTHCHECK permet à Docker de savoir si l'app répond vraiment, pas seulement si le processus tourne.

Gestion des dépendances

- npm install recalcule les versions possibles. 
- npm ci installe exactement ce qui est dans package-lock.json, ce qui garantit le build reproductible. On exclut les devDependencies en prod avec --omit=dev pour ne pas embarquer jest et eslint dans l'image finale.
