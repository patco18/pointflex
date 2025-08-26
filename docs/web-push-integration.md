# Guide d'intégration des notifications Web Push

## Introduction

Ce guide explique comment intégrer les notifications Web Push dans l'application PointFlex.

## Prérequis

- Clés VAPID générées avec `generate_vapid_keys.py`
- Configuration des clés VAPID dans le backend (fichier `.env`)
- Configuration de la clé publique VAPID dans le frontend (variables d'environnement Vite)

## Configuration Backend

1. Générer les clés VAPID :
```bash
python generate_vapid_keys.py
```

2. Ajouter les clés VAPID au fichier `.env` :
```
VAPID_PUBLIC_KEY=votre_clé_publique
VAPID_PRIVATE_KEY=votre_clé_privée
VAPID_EMAIL=email@votre-domaine.com
```

3. Exécuter la migration pour mettre à jour le modèle de données :
```bash
python -m backend.cli_commands apply-migration add_webpush_subscription_fields
```

## Configuration Frontend

1. Ajouter la clé publique VAPID (format URL safe) au fichier `.env` :
```
VITE_VAPID_PUBLIC_KEY=votre_clé_publique_urlsafe
```

2. Mettre à jour le service worker Firebase (`public/firebase-messaging-sw.js`) avec la configuration appropriée.

3. Implémenter la gestion des abonnements Web Push dans le frontend :

```typescript
// src/services/notificationService.ts

import { getMessaging, getToken } from "firebase/messaging";
import { firebaseApp } from "../firebaseInit";

export async function requestNotificationPermission() {
  try {
    const messaging = getMessaging(firebaseApp);
    
    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission non accordée');
    }
    
    // Pour Web Push avec VAPID
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    
    // Récupérer l'abonnement Push via l'API Service Worker
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey
    });
    
    // Envoyer l'abonnement au serveur
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        device_type: 'web',
        subscription: subscription.toJSON()
      })
    });
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la demande de permission pour les notifications:", error);
    return false;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Désabonner du service worker
      await subscription.unsubscribe();
      
      // Informer le serveur
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Erreur lors du désabonnement des notifications:", error);
    return false;
  }
}

export async function getNotificationStatus() {
  // Vérifier si les notifications sont supportées
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  // Vérifier la permission
  const permission = Notification.permission;
  if (permission === 'granted') {
    // Vérifier si on a un abonnement actif
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'permission-granted';
  }
  
  return permission === 'denied' ? 'denied' : 'default';
}
```

## Test des notifications

1. Utiliser le script `test-web-push.bat` pour tester l'envoi de notifications.
2. Tester l'abonnement et la réception des notifications dans l'interface utilisateur.

## Dépannage

- Vérifier les logs du navigateur pour les erreurs liées aux Service Workers
- Vérifier les logs du backend pour les erreurs d'envoi de notifications
- Utiliser l'outil de développement "Application > Service Workers" dans Chrome pour déboguer

## Ressources supplémentaires

- [Documentation Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Documentation Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)
- [Documentation pywebpush](https://github.com/web-push-libs/pywebpush)
