'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiBriefcase, FiMapPin } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// Import supprimé car non utilisé
import toast from 'react-hot-toast';

// Form validation schema
const schema = yup.object({
  name: yup.string().required('Nom requis'),
  email: yup.string().email('Email invalide').required('Email requis'),
  password: yup
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .required('Mot de passe requis'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Les mots de passe ne correspondent pas')
    .required('Confirmation du mot de passe requise'),
  role: yup.string().required('Rôle requis'),
  restaurantId: yup.string().when('role', {
    is: (val: string) => val !== 'maintenance',
    then: (schema) => schema.required('Restaurant requis'),
    otherwise: (schema) => schema.notRequired(),
  }),
}).required();

type FormData = yup.InferType<typeof schema>;

// Options des restaurants
const restaurantOptions = [
  { value: '1', label: 'Monsieur Mouettes' },
  { value: '2', label: 'Gigio' },
  { value: '3', label: 'Tigers' },
  { value: '4', label: 'La Tétrade' },
];

// Options des rôles
const roleOptions = [
  { value: 'employee', label: 'Employé' },
  { value: 'room_manager', label: 'Responsable de Salle' },
  { value: 'bar_manager', label: 'Responsable de Bar' },
  { value: 'restaurant_manager', label: 'Gérant de Restaurant' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function RegisterPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Tentative d'inscription
      const user = await signup(data.email, data.password, data.name);
      
      // Mettre à jour le profil avec le rôle et le restaurant
      if (user) {
        try {
          const profileData: {
            role: string;
            restaurantId: string | null;
          } = {
            role: data.role,
            restaurantId: null // Valeur initiale qui sera mise à jour ci-dessous
          };
          
          // Si ce n'est pas un rôle de maintenance, ajouter le restaurant
          if (data.role !== 'maintenance') {
            // Utiliser le restaurant sélectionné ou attribuer automatiquement le premier restaurant
            // pour éviter la page de sélection de restaurant après l'inscription
            profileData.restaurantId = data.restaurantId || '1';
          } else {
            // Pour la maintenance, pas de restaurant spécifique (accès à tous)
            profileData.restaurantId = null;
          }
          
          await updateDoc(doc(db, 'users', user.uid), profileData);
        } catch (profileError) {
          console.error('Erreur lors de la mise à jour du profil:', profileError);
          // Continuer malgré l'erreur
        }
      }
      
      // Si l'inscription réussit, afficher un message de succès
      toast.success('Compte créé avec succès');
      console.log('Utilisateur créé:', user);
      
      // Redirection immédiate vers le tableau de bord
      router.push('/dashboard');
      
      // En cas de problème avec la redirection immédiate, essayer avec un délai
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      
      // Gérer différentes erreurs Firebase Auth
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message?: string };
        
        if (firebaseError.code === 'auth/email-already-in-use') {
          setError('Cet email est déjà utilisé');
        } else if (firebaseError.code === 'auth/invalid-email') {
          setError('Email invalide');
        } else if (firebaseError.code === 'auth/weak-password') {
          setError(`Mot de passe trop faible: ${firebaseError.message || ''}`);
        } else if (firebaseError.code === 'auth/too-many-requests') {
          setError('Trop de tentatives, réessayez plus tard');
        } else {
          setError(`Erreur lors de l'inscription: ${firebaseError.message || 'Erreur inconnue'}`);
        }
      } else {
        setError('Une erreur inattendue est survenue');
      }
      
      toast.error('Échec de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#232325] p-6 text-[#F5F5F5] text-center">
            <h1 className="text-2xl font-bold">Restaurant Manager</h1>
            <p className="text-[#A9A9A9]">Gestion des Commandes & Maintenance</p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">Créer un compte</h2>
            
            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm">
                <FiAlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}
            
            {/* Name field */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                  placeholder="Jean Dupont"
                />
              </div>
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>
            
            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                  placeholder="votre@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm">{errors.email.message}</p>
              )}
            </div>
            
            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm">{errors.password.message}</p>
              )}
            </div>
            
            {/* Confirm Password field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            {/* Role field */}
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-gray-700">
                Rôle <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiBriefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="role"
                  {...register('role')}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                  defaultValue=""
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="" disabled>Sélectionnez votre rôle</option>
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {errors.role && (
                <p className="text-red-600 text-sm">{errors.role.message}</p>
              )}
            </div>
            
            {/* Restaurant field - masqué pour le rôle maintenance */}
            {selectedRole !== 'maintenance' && (
              <div className="space-y-2">
                <label htmlFor="restaurantId" className="text-sm font-medium text-gray-700">
                  Restaurant <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="restaurantId"
                    {...register('restaurantId')}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.restaurantId ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:ring-[#FFD600] focus:border-[#FFD600]`}
                    defaultValue=""
                  >
                    <option value="" disabled>Sélectionnez votre restaurant</option>
                    {restaurantOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                {errors.restaurantId && (
                  <p className="text-red-600 text-sm">{errors.restaurantId.message}</p>
                )}
              </div>
            )}
            
            {/* Message informatif pour le rôle maintenance */}
            {selectedRole === 'maintenance' && (
              <div className="p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  En tant que personnel de maintenance, vous aurez accès à toutes les demandes de tous les restaurants.
                </p>
              </div>
            )}
            
            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#232325] hover:bg-[#2B2B2B] text-[#F5F5F5] border border-[#FFD600] rounded-md transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:ring-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Création en cours...' : 'Créer un compte'}
            </button>
            
            {/* Login link */}
            <div className="text-center mt-4">
              <p className="text-gray-600 mb-2">Déjà un compte?</p>
              <Link href="/auth/login" className="inline-block text-[#F5F5F5] bg-[#232325] hover:bg-[#2B2B2B] border border-[#FFD600] px-4 py-2 rounded-md font-medium transition-colors duration-200">
                Se connecter
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
