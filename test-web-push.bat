@echo off
REM Ce script teste l'envoi de notifications web push via l'API PointFlex

echo Tests des notifications web push
echo ==============================

REM Vérifier les clés VAPID
python -c "from backend.config import Config; print('VAPID_PUBLIC_KEY:', bool(Config.VAPID_PUBLIC_KEY)); print('VAPID_PRIVATE_KEY:', bool(Config.VAPID_PRIVATE_KEY))"

echo.
echo Générer des clés VAPID si nécessaire:
echo python generate_vapid_keys.py
echo.
echo Après avoir généré les clés, configurez-les dans .env:
echo VAPID_PUBLIC_KEY=votre_clé_publique
echo VAPID_PRIVATE_KEY=votre_clé_privée
echo VAPID_PUBLIC_KEY_URLSAFE=votre_clé_publique_urlsafe
echo.

echo Tester la notification:
echo curl -X POST http://localhost:5000/api/push/test-notification ^
echo      -H "Content-Type: application/json" ^
echo      -H "Authorization: Bearer VOTRE_TOKEN_JWT" ^
echo      -d "{\"device_type\":\"web\"}"
echo.

echo Pour s'abonner aux notifications, utilisez /api/push/vapid-public-key pour obtenir la clé publique
echo et /api/push/subscribe pour s'abonner avec l'objet PushSubscription.
echo.
