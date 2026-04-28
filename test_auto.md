Qu'est-ce que la pyramide des tests ? Quels types de tests existent ?

La pyramide classe les tests par vitesse et coût. 
- En bas : les tests unitaires (beaucoup, rapides, isolés). 
- Au milieu : les tests d'intégration (moins nombreux, testent plusieurs composants ensemble). 
- En haut : les tests end-to-end (peu, lents, testent tout le système de bout en bout).

Quelle différence entre un test unitaire, un test d'intégration et un test end-to-end ?

- Unitaire : teste une fonction seule, tout le reste est mocké. Rapide, facile à débugger.
- Intégration : teste plusieurs composants ensemble (ex: route + middleware + modèle), la DB peut être mockée ou réelle.
- E2E : teste l'application entière comme un vrai utilisateur, navigateur ou requête HTTP contre un environnement complet.

Qu'est-ce que la couverture de code ? Est-ce un indicateur suffisant de la qualité des tests ?

La couverture mesure le pourcentage de lignes/branches exécutées par les tests. 

Non, ce n'est pas suffisant : 100% de couverture ne veut pas dire que les cas limites sont testés, juste que le code a été exécuté. Un test peut traverser une ligne sans vérifier le résultat.

Comment tester une API REST ? Quels outils existent pour ça ?

On envoie des vraies requêtes HTTP à l'app et on vérifie le status code, le body et les headers. 

- Supertest (Node.js) permet de faire ça sans démarrer un serveur réel. 
- Hurl (fichiers .hurl) est plus lisible pour des tests écrits par des non-développeurs. 
- Pactum est orienté contract testing.

---

Outils choisis pour ce projet

- Jest : déjà configuré, runner + assertions + mocks intégrés, pas besoin d'ajouter Mocha/Chai.
- Supertest : permet de tester les routes Express sans lancer de vrai serveur HTTP.
- Istanbul (intégré à Jest) : couverture native via --coverage, rapport HTML + texte généré dans /coverage.
- ESLint : déjà configuré avec eslint:recommended, détecte les vars non utilisées et les erreurs de syntaxe.

---

Ce qui est testé dans l'existant

- GET /health (200 ok, 503 db fail)
- POST /auth/login (credentials valides, user inconnu, champs manquants)
- GET /tasks (401 sans token, 200 avec token)
- POST /tasks (201 créé)
- Task model : findAll, findById, create, delete

Ce qui n'était pas testé (ajouté)

- PUT /tasks/:id (mise à jour, 404 si inexistant)
- DELETE /tasks/:id (suppression, 404 si inexistant)
- GET /tasks?status=todo (filtre par statut)
- POST /auth/login avec mauvais mot de passe (401)
- Task.update et Task.findByStatus (modèle)
