'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
// import { motion } from 'framer-motion'; // Non utilisé
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { OrderCategory, PriorityLevel } from '@/types';
import toast from 'react-hot-toast';

// Définition du type OrderFormData
type OrderFormData = {
  category: string;
  priority: string;
  department: string;
  comments?: string | undefined;
  isRecurring: boolean;
  recurringFrequency?: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }[];
};

// Form validation schema
const schema = yup.object().shape({
  category: yup.string().required('Catégorie requise'),
  priority: yup.string().required('Priorité requise'),
  department: yup.string().required('Département requis'),
  comments: yup.string().nullable().transform((value) => (value === null ? undefined : value)),
  isRecurring: yup.boolean().optional().default(false),
  recurringFrequency: yup.string().when('isRecurring', {
    is: true,
    then: (schema) => schema.required('Fréquence requise'),
    otherwise: (schema) => schema.optional(),
  }),
  items: yup.array().of(
    yup.object({
      name: yup.string().required('Nom requis'),
      quantity: yup.number().required('Quantité requise').min(1, 'Minimum 1'),
      unit: yup.string().required('Unité requise'),
      notes: yup.string().optional(),
    })
  ).min(1, 'Au moins un article est requis'),
}).required();

// L'interface OrderItem est incluse dans OrderFormData

const orderCategories: { value: OrderCategory; label: string }[] = [
  { value: 'glassware', label: 'Verrerie' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'food', label: 'Produits alimentaires' },
  { value: 'cleaning_supplies', label: 'Produits d\'entretien' },
  { value: 'tableware', label: 'Vaisselle' },
  { value: 'kitchen_supplies', label: 'Fournitures de cuisine' },
  { value: 'bar_supplies', label: 'Fournitures de bar' },
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

export default function NewOrderPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<OrderFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      category: '',
      priority: 'normal',
      department: userProfile?.role === 'room_manager' ? 'room' : userProfile?.role === 'bar_manager' ? 'bar' : 'general',
      comments: '',
      isRecurring: false,
      recurringFrequency: '',
      items: [{ name: '', quantity: 1, unit: '', notes: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  
  const isRecurring = watch('isRecurring') as boolean;
  
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
  
  const onSubmit = async (data: OrderFormData) => {
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
      
      // Create order document
      const orderData = {
        type: 'order',
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
        items: data.items,
        isRecurring: data.isRecurring,
        recurringFrequency: data.isRecurring ? data.recurringFrequency : null,
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Create notification for maintenance staff
      await addDoc(collection(db, 'notifications'), {
        userId: 'maintenance', // This should be the actual maintenance staff user ID
        title: 'Nouvelle commande',
        message: `Restaurant ${userProfile.restaurantId} - ${orderCategories.find(c => c.value === data.category)?.label}`,
        createdAt: serverTimestamp(),
        read: false,
        relatedTo: {
          type: 'order',
          id: docRef.id,
        },
      });
      
      toast.success('Commande créée avec succès');
      router.push('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande');
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
          <h1 className="text-2xl font-bold">Nouvelle commande</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h2 className="text-xl font-semibold">Détails de la commande</h2>
            <p className="text-blue-100">Remplissez le formulaire ci-dessous pour créer une nouvelle commande</p>
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
                  {orderCategories.map((category) => (
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
              
              {/* Recurring Order */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="isRecurring"
                    type="checkbox"
                    {...register('isRecurring')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-700">
                    Commande récurrente
                  </label>
                </div>
                
                {isRecurring && (
                  <div className="mt-2">
                    <select
                      id="recurringFrequency"
                      {...register('recurringFrequency')}
                      className={`block w-full p-2 border ${
                        errors.recurringFrequency ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      <option value="">Sélectionner une fréquence</option>
                      <option value="daily">Quotidienne</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                    </select>
                    {errors.recurringFrequency && (
                      <p className="text-red-600 text-sm">{errors.recurringFrequency.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Comments */}
            <div className="space-y-2">
              <label htmlFor="comments" className="text-sm font-medium text-gray-700">
                Commentaires
              </label>
              <textarea
                id="comments"
                {...register('comments')}
                rows={3}
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Informations supplémentaires sur la commande..."
              />
            </div>
            
            {/* Photos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Photos (optionnel)
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
            
            {/* Order Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Articles</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: '', quantity: 1, unit: '', notes: '' })}
                >
                  <FiPlus className="mr-2" /> Ajouter un article
                </Button>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Article {index + 1}</h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Name */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register(`items.${index}.name`)}
                        className={`block w-full p-2 border ${
                          errors.items?.[index]?.name ? 'border-red-500' : 'border-gray-300'
                        } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder="Ex: Bouteilles de vin rouge"
                      />
                      {errors.items?.[index]?.name && (
                        <p className="text-red-600 text-xs">{errors.items?.[index]?.name?.message}</p>
                      )}
                    </div>
                    
                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Quantité <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        min="1"
                        className={`block w-full p-2 border ${
                          errors.items?.[index]?.quantity ? 'border-red-500' : 'border-gray-300'
                        } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-red-600 text-xs">{errors.items?.[index]?.quantity?.message}</p>
                      )}
                    </div>
                    
                    {/* Unit */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Unité <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register(`items.${index}.unit`)}
                        className={`block w-full p-2 border ${
                          errors.items?.[index]?.unit ? 'border-red-500' : 'border-gray-300'
                        } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                        placeholder="Ex: bouteilles, kg, cartons"
                      />
                      {errors.items?.[index]?.unit && (
                        <p className="text-red-600 text-xs">{errors.items?.[index]?.unit?.message}</p>
                      )}
                    </div>
                    
                    {/* Notes */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <input
                        type="text"
                        {...register(`items.${index}.notes`)}
                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Ex: marque spécifique, détails"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-red-600 text-sm flex items-center">
                  {errors.items.message}
                </p>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/orders')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="glow"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Création en cours...' : 'Créer la commande'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
