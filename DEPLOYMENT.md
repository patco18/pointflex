# PointFlex - Guide de Déploiement Rapide

## 🎯 Déploiement en 3 Étapes

### 1. Installation Rapide
```bash
git clone https://github.com/patco18/pointflex.git
cd pointflex
```

**Windows:**
```bash
./quick-install.bat
```

**Linux/Mac:**
```bash
chmod +x quick-install.sh && ./quick-install.sh
```

### 2. Développement Local
```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - RQ Worker (webhooks)
python run_worker.py
```

**Accès:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 3. Production avec Docker
```bash
# Windows
./deploy.bat

# Linux/Mac
./deploy.sh
```

**Accès:**
- Application: http://localhost
- API: http://localhost:5000

## 🔐 Comptes de Test

| Rôle | Email | Mot de passe | Accès |
|------|--------|--------------|-------|
| **SuperAdmin** | `superadmin@pointflex.com` | `superadmin123` | Gestion globale, toutes entreprises |
| **Admin** | `admin@pointflex.com` | `admin123` | Gestion employés, entreprise démo |
| **Employé** | `employee@pointflex.com` | `employee123` | Pointage, dashboard personnel |

## 🛠️ Dépannage

### Erreurs Fréquentes

**1. Erreur de build TypeScript**
```bash
# Solution: Build sans TypeScript check
npm run build
```

**2. Erreur base de données**
```bash
cd backend
python init_db.py
```

**3. Port occupé**
```bash
# Changer les ports dans .env
VITE_API_URL=http://localhost:5001/api
```

### Vérification Pré-déploiement
```bash
./check-deployment.bat  # Windows
./check-deployment.sh   # Linux/Mac
```

## 🌐 Variables d'Environnement

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-change-in-production
DATABASE_URL=sqlite:///instance/pointflex.db
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
REDIS_URL=redis://localhost:6379/0
FCM_SERVER_KEY=your_fcm_server_key
TWO_FACTOR_ENCRYPTION_KEY=base64_32_bytes_key
RATELIMIT_STORAGE_URL=redis://localhost:6379/2
```

## 🚀 Déploiement Serveur

### Option 1: VPS avec Docker
```bash
# Sur votre serveur
git clone https://github.com/patco18/pointflex.git
cd pointflex

# Configurer .env pour production
cp .env.example .env
nano .env  # Modifier les clés secrètes

# Déployer
docker-compose up -d

# Démarrer ensuite le worker RQ pour les webhooks
docker-compose exec backend python run_worker.py
```

### Option 2: Hébergement Gratuit
- **Frontend**: [Vercel](https://vercel.com), [Netlify](https://netlify.com)
- **Backend**: [Railway](https://railway.app), [Render](https://render.com)

## 📋 Checklist de Déploiement

- [ ] Cloner le repository
- [ ] Installer les dépendances (`npm install` + `pip install -r requirements.txt`)
- [ ] Configurer les variables d'environnement
- [ ] Initialiser la base de données (`python init_db.py`)
- [ ] Tester le build frontend (`npm run build`)
- [ ] Tester le backend (`python app.py`)
- [ ] Déployer en production

## 🔄 Mise à Jour

```bash
git pull origin main
npm install  # Si nouvelles dépendances
pip install -r backend/requirements.txt  # Si nouvelles dépendances
docker-compose up --build -d  # Pour Docker
```

## 🆘 Support

- **Issues**: https://github.com/patco18/pointflex/issues
- **Documentation**: Voir README.md principal
- **Contribution**: Voir CONTRIBUTING.md

---

**🎉 Félicitations ! Votre application PointFlex est maintenant déployée !**
