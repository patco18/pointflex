# Guide de Localisation pour la Côte d'Ivoire

Ce document décrit les modifications apportées pour adapter PointFlex au marché ivoirien.

## Formats de dates

La localisation des dates a été standardisée selon les conventions ivoiriennes :

- Format court : `d/MM/yyyy` (sans zéro initial pour les jours)
- Format long : `d MMMM yyyy` (jour + nom du mois complet + année)
- Format date/heure : `d/MM/yyyy HH:mm`

Un nouveau fichier utilitaire a été créé à `src/utils/dateFormat.ts` qui centralise tous les formattages de dates pour l'application.

## Formats des numéros de téléphone

Les numéros de téléphone ont été adaptés au format ivoirien :

- Format pour les téléphones mobiles : `+225 XX XX XX XX XX` (numéros à 10 chiffres)
- Format pour les téléphones fixes : `+225 XX XX XX XX XX` (également à 10 chiffres)

Les exemples ont été mis à jour dans tous les formulaires pour refléter ces formats.

## Exemples de noms ivoiriens

Pour une meilleure adaptation au contexte local, les placeholders et exemples ont été mis à jour avec des noms ivoiriens courants :

- Noms : Konan, Kouassi, Koné, etc.
- Prénoms : Kouamé, Serge, Aminata, etc.

## Adresses et localisations

Les exemples d'adresses ont été mis à jour pour refléter la géographie locale :

- Quartiers : Cocody, II Plateaux, etc.
- Ville principale : Abidjan
- Extensions de domaine : `.ci` au lieu de `.com`

## Éléments culturels et professionnels

- Fêtes traditionnelles et congés spécifiques à la Côte d'Ivoire
- Références aux pratiques professionnelles locales
- Codes de mission adaptés (ex: ABI2024-153)

## Modifications principales

Les fichiers suivants ont été modifiés :

1. `src/components/EnhancedOfficeManagement.tsx` - Mise à jour des placeholders pour les bureaux
2. `src/components/CompanyManagement.tsx` - Adaptation des coordonnées et exemples d'entreprises
3. `src/components/AdminProfile.tsx` - Mise à jour des formats d'adresse
4. `src/components/LeaveRequestForm.tsx` - Adaptation des motifs de congé
5. `src/components/OrganizationManagement.tsx` - Mise à jour des exemples de départements et postes
6. `src/components/Dashboard.tsx` - Format de date ivoirien
7. `src/components/AttendanceHistory.tsx` - Format de date ivoirien
8. `src/components/TeamCalendar.tsx` - Format de date ivoirien
9. `src/components/MyLeaveHistory.tsx` - Format de date ivoirien
10. `src/utils/dateFormat.ts` (nouveau) - Utilitaires de formatage standardisés

## Tâches futures de localisation

- Ajouter des jours fériés spécifiques à la Côte d'Ivoire
- Intégrer les moyens de paiement locaux (Mobile Money, etc.)
- Adapter les rapports et statistiques aux pratiques administratives locales
- Ajouter une option pour basculer entre le français et les langues locales
