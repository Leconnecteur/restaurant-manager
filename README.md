# Windsurf - Application de Gestion des Commandes et Maintenance Multi-Restaurants

## Description

Windsurf est une application web développée pour un groupe de 4 restaurants permettant de centraliser et gérer les commandes d'approvisionnement et les demandes de maintenance. Cette application remplace les groupes WhatsApp disparates utilisés auparavant, offrant une solution plus structurée et efficace.

## Fonctionnalités

- **Authentification et profils** : Système de connexion sécurisé avec gestion des rôles utilisateurs
- **Gestion des commandes** : Création, suivi et historique des commandes d'approvisionnement
- **Gestion des demandes de maintenance** : Formulaires de demande d'intervention avec suivi d'état
- **Tableau de bord personnalisé** : Vue adaptée selon le rôle de l'utilisateur
- **Notifications en temps réel** : Alertes pour les nouvelles commandes et mises à jour
- **Rapports et statistiques** : Visualisation des données de consommation et de performance
- **Interface responsive** : Adaptée aux mobiles, tablettes et ordinateurs de bureau
- **Code couleur** : Différenciation visuelle des 4 restaurants

## Technologies utilisées

- **Frontend** : Next.js, TypeScript, Tailwind CSS, Framer Motion
- **Backend** : Firebase (Authentification, Firestore, Storage)
- **Déploiement** : Vercel

## Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-compte/windsurf-restaurant-manager.git
   cd windsurf-restaurant-manager
   ```

2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Configurer Firebase :
   - Créer un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
   - Activer l'authentification par email/mot de passe
   - Activer Firestore Database
   - Activer Storage
   - Copier les clés d'API dans un fichier `.env.local` à la racine du projet :
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=votre-cle-api
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-domaine.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-bucket.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre-app-id
   ```

4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

5. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Déploiement

L'application est configurée pour être déployée sur Vercel :

1. Connectez-vous à [Vercel](https://vercel.com)
2. Importez votre dépôt GitHub
3. Configurez les variables d'environnement
4. Déployez l'application

## Structure des utilisateurs

- **Employé de manutention** : Gère l'ensemble des commandes et réparations pour les 4 restaurants
- **Managers de restaurant** : Peuvent passer des commandes pour leur établissement
- **Managers de salle** : Passent des commandes spécifiques à la salle
- **Managers de bar** : Passent des commandes spécifiques au bar
- **Autres employés** : Accès limités selon les besoins
