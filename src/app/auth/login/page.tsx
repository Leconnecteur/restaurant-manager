'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

// Form validation schema
const schema = yup.object({
  email: yup.string().email('Email invalide').required('Email requis'),
  password: yup.string().required('Mot de passe requis'),
}).required();

type FormData = yup.InferType<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login(data.email, data.password);
      toast.success('Connexion réussie');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different Firebase auth errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email ou mot de passe incorrect');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer');
      }
      
      toast.error('Échec de la connexion');
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
            <h2 className="text-xl font-semibold text-center text-gray-800">Connexion</h2>
            
            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm">
                <FiAlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}
            
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
            
            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#232325] hover:bg-[#2B2B2B] text-[#F5F5F5] border border-[#FFD600] rounded-md transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD600] focus:ring-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
            
            {/* Register link */}
            <div className="text-center mt-4">
              <p className="text-gray-600 mb-2">Pas encore de compte?</p>
              <Link href="/auth/register" className="inline-block text-[#F5F5F5] bg-[#232325] hover:bg-[#2B2B2B] border border-[#FFD600] px-4 py-2 rounded-md font-medium transition-colors duration-200">
                Créer un compte
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
