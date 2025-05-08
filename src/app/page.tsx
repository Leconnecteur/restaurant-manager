'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// import { motion } from 'framer-motion'; // Non utilisé

export default function Home() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Ajouter un petit délai pour s'assurer que l'état d'authentification est bien chargé
    const redirectTimer = setTimeout(() => {
      if (!loading) {
        if (currentUser) {
          console.log('Utilisateur authentifié, redirection vers le tableau de bord');
          router.push('/dashboard');
        } else {
          console.log('Aucun utilisateur authentifié, redirection vers la page de connexion');
          router.push('/auth/login');
        }
      }
    }, 500);
    
    return () => clearTimeout(redirectTimer);
  }, [currentUser, userProfile, loading, router]);

  return null; // plus d'UI, simple redirection
}
