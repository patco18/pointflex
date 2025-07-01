# Contribuer à PointFlex

Merci de votre intérêt pour contribuer à PointFlex ! Ce guide vous aidera à commencer.

## 🚀 Démarrage Rapide

1. **Fork le projet**
2. **Cloner votre fork**
```bash
git clone https://github.com/VOTRE-USERNAME/pointflex.git
cd pointflex
```

3. **Configurer l'environnement de développement**
```bash
# Windows
./dev-setup.bat

# Linux/Mac
chmod +x dev-setup.sh && ./dev-setup.sh
```

4. **Créer une branche pour votre feature**
```bash
git checkout -b feature/ma-nouvelle-fonctionnalite
```

## 📋 Standards de Code

### Frontend (React/TypeScript)
- Utiliser TypeScript strict
- Suivre les conventions ESLint
- Components en PascalCase
- Hooks commençant par "use"

### Backend (Python/Flask)
- PEP 8 pour le style Python
- Docstrings pour toutes les fonctions
- Type hints recommandés
- Tests unitaires pour les nouvelles features

### Commits
Utiliser la convention [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajouter système de notifications
fix: corriger bug de géolocalisation
docs: mettre à jour README
refactor: optimiser requêtes database
test: ajouter tests pour AuthContext
```

## 🔧 Développement

### Structure du Projet
```
pointflex/
├── src/                 # Frontend React
├── backend/            # API Flask
├── docs/              # Documentation
├── docker-compose.yml # Déploiement
└── .github/          # CI/CD
```

### Workflow de Développement

1. **Développer votre feature**
   - Frontend: `npm run dev`
   - Backend: `cd backend && python app.py`

2. **Tester vos changements**
   - Frontend: `npm run lint`
   - Backend: Vérifier que l'API fonctionne

3. **Commit et Push**
```bash
git add .
git commit -m "feat: description de votre feature"
git push origin feature/ma-nouvelle-fonctionnalite
```

4. **Créer une Pull Request**

## 🐛 Signaler des Bugs

Utiliser les [GitHub Issues](https://github.com/patco18/pointflex/issues) avec :
- Description claire du problème
- Étapes pour reproduire
- Environnement (OS, navigateur, etc.)
- Screenshots si applicable

## 💡 Proposer des Features

1. Créer une Issue pour discuter de l'idée
2. Attendre les retours avant de commencer le développement
3. Implémenter selon les standards du projet

## 📚 Ressources

- [React Documentation](https://react.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🎯 Priorités Actuelles

- [ ] Tests automatisés (frontend/backend)
- [ ] Notifications en temps réel
- [ ] Mode hors-ligne
- [ ] Application mobile (React Native)
- [ ] API documentation (Swagger)
- [ ] Localisation i18n

## ❓ Questions

N'hésitez pas à ouvrir une Issue pour toute question ou rejoindre les discussions dans les PR existantes.

Merci pour votre contribution ! 🙏
