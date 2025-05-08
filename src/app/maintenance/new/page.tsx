'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
// import { motion } from 'framer-motion'; // Non utilisé
import { FiX } from 'react-icons/fi';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { MaintenanceCategory, PriorityLevel } from '@/types';
import toast from 'react-hot-toast';

// Définition du type FormData
type FormData = {
  category: string;
  priority: string;
  department: string;
  location: string;
  description: string;
  comments?: string | null;
};

// Form validation schema
const schema = yup.object().shape({
  category: yup.string().required('Catégorie requise'),
  priority: yup.string().required('Priorité requise'),
  department: yup.string().required('Département requis'),
  location: yup.string().required('Emplacement requis'),
  description: yup.string().required('Description requise'),
  comments: yup.string().nullable().optional(),
});

// Le type FormData est défini ci-dessus

const maintenanceCategories: { value: MaintenanceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'hvac', label: 'Climatisation/Chauffage' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'appliance', label: 'Appareils' },
  { value: 'structural', label: 'Structure' },
  { value: 'other', label: 'Autre' },
];

const priorityLevels: { value: PriorityLevel; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'planned', label: 'Planifié' },
];

const departments = [
  { value: 'room', label: 'Salle' },
  { value: 'bar', label: 'Bar' },
  { value: 'kitchen', label: 'Cuisine' },
  { value: 'general', label: 'Général' },
];

export default function NewMaintenancePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      category: '',
      priority: 'normal',
      department: userProfile?.role === 'room_manager' ? 'room' : userProfile?.role === 'bar_manager' ? 'bar' : 'general',
      location: '',
      description: '',
      comments: '',
    },
  });
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!userProfile) {
      router.push('/auth/login');
    }
  }, [userProfile, router]);
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      
      // Limit to 5 photos total
      const totalPhotos = [...photos, ...newPhotos].slice(0, 5);
      setPhotos(totalPhotos);
      
      // Create preview URLs
      const newPreviewUrls = totalPhotos.map(file => URL.createObjectURL(file));
      setPhotoPreviewUrls(newPreviewUrls);
    }
  };
  
  const removePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    setPhotos(updatedPhotos);
    
    // Update preview URLs
    const updatedPreviewUrls = [...photoPreviewUrls];
    URL.revokeObjectURL(updatedPreviewUrls[index]);
    updatedPreviewUrls.splice(index, 1);
    setPhotoPreviewUrls(updatedPreviewUrls);
  };
  
  const onSubmit = async (data: any) => {
    if (!userProfile || !userProfile.restaurantId) {
      toast.error('Vous devez sélectionner un restaurant');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convertir les photos en base64 au lieu de les télécharger vers Firebase Storage
      const photoURLs: string[] = [];
      
      if (photos.length > 0) {
        const convertPromises = photos.map((photo) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Le résultat est une URL data:image en base64
              const base64String = reader.result as string;
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(photo);
          });
        });
        
        const base64Images = await Promise.all(convertPromises);
        photoURLs.push(...base64Images);
      }
      
      // Create maintenance document
      const maintenanceData = {
        type: 'maintenance',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userProfile.uid,
        restaurantId: userProfile.restaurantId,
        status: 'pending',
        priority: data.priority,
        comments: data.comments,
        photoURLs,
        department: data.department,
        category: data.category,
        location: data.location,
        description: data.description,
      };
      
      const docRef = await addDoc(collection(db, 'maintenance'), maintenanceData);
      
      // Create notification for maintenance staff
      await addDoc(collection(db, 'notifications'), {
        userId: 'maintenance', // This should be the actual maintenance staff user ID
        title: 'Nouvelle demande de maintenance',
        message: `Restaurant ${userProfile.restaurantId} - ${maintenanceCategories.find(c => c.value === data.category)?.label}`,
        createdAt: serverTimestamp(),
        read: false,
        relatedTo: {
          type: 'maintenance',
          id: docRef.id,
        },
      });
      
      toast.success('Demande de maintenance créée avec succès');
      router.push('/maintenance');
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      toast.error('Erreur lors de la création de la demande de maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-center">
          <p className="text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nouvelle demande de maintenance</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h2 className="text-xl font-semibold">Détails de la demande</h2>
            <p className="text-blue-100">Remplissez le formulaire ci-dessous pour créer une nouvelle demande de maintenance</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  {...register('category')}
                  className={`block w-full p-2 border ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {maintenanceCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm">{errors.category.message}</p>
                )}
              </div>
              
              {/* Priority */}
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium text-gray-700">
                  Priorité <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  {...register('priority')}
                  className={`block w-full p-2 border ${
                    errors.priority ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  {priorityLevels.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <p className="text-red-600 text-sm">{errors.priority.message}</p>
                )}
              </div>
              
              {/* Department */}
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium text-gray-700">
                  Département <span className="text-red-500">*</span>
                </label>
                <select
                  id="department"
                  {...register('department')}
                  className={`block w-full p-2 border ${
                    errors.department ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-600 text-sm">{errors.department.message}</p>
                )}
              </div>
              
              {/* Location */}
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium text-gray-700">
                  Emplacement précis <span className="text-red-500">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  {...register('location')}
                  className={`block w-full p-2 border ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder="Ex: Cuisine, près du four"
                />
                {errors.location && (
                  <p className="text-red-600 text-sm">{errors.location.message}</p>
                )}
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description du problème <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className={`block w-full p-2 border ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                placeholder="Décrivez le problème en détail..."
              />
              {errors.description && (
                <p className="text-red-600 text-sm">{errors.description.message}</p>
              )}
            </div>
            
            {/* Comments */}
            <div className="space-y-2">
              <label htmlFor="comments" className="text-sm font-medium text-gray-700">
                Commentaires additionnels
              </label>
              <textarea
                id="comments"
                {...register('comments')}
                rows={3}
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Informations supplémentaires sur la demande..."
              />
            </div>
            
            {/* Photos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Photos (recommandé)
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <label className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <span>Ajouter des photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
                <span className="text-xs text-gray-500">
                  {photos.length} / 5 photos
                </span>
              </div>
              
              {photoPreviewUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <div className="relative h-24 w-full">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="rounded-md"
                          unoptimized={url.startsWith('data:')}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/maintenance')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="glow"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Création en cours...' : 'Créer la demande'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
