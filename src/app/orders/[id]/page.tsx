'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheck, FiX, FiClock, FiUser, FiMapPin, FiPackage, FiRepeat, FiImage } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { Order, OrderCategory, PriorityLevel, RequestStatus } from '@/types';
import { formatDate, formatDateTime, getPriorityColor, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

// Statuts disponibles
const statusOptions: { value: RequestStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

// Priorités disponibles
const priorityOptions: { value: PriorityLevel; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'planned', label: 'Planifié' },
];

// Catégories disponibles
const categoryOptions: { value: OrderCategory; label: string }[] = [
  { value: 'glassware', label: 'Verrerie' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'food', label: 'Produits alimentaires' },
  { value: 'cleaning_supplies', label: 'Produits d\'entretien' },
  { value: 'tableware', label: 'Vaisselle' },
  { value: 'kitchen_supplies', label: 'Fournitures de cuisine' },
  { value: 'bar_supplies', label: 'Fournitures de bar' },
  { value: 'other', label: 'Autre' },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // États pour l'édition
  const [editStatus, setEditStatus] = useState<RequestStatus>('pending');
  const [editPriority, setEditPriority] = useState<PriorityLevel>('normal');
  const [editComments, setEditComments] = useState('');
  const [editEstimatedDeliveryDate, setEditEstimatedDeliveryDate] = useState<string>('');
  const [editActualDeliveryDate, setEditActualDeliveryDate] = useState<string>('');
  
  // Récupérer les détails de la commande
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!userProfile) return;
      
      try {
        setIsLoading(true);
        
        const orderDoc = await getDoc(doc(db, 'orders', params.id));
        
        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
          setOrder(orderData);
          
          // Initialiser les états d'édition
          setEditStatus(orderData.status);
          setEditPriority(orderData.priority);
          setEditComments(orderData.comments || '');
          
          if (orderData.estimatedDeliveryDate) {
            const date = orderData.estimatedDeliveryDate.toDate();
            setEditEstimatedDeliveryDate(date.toISOString().split('T')[0]);
          }
          
          if (orderData.actualDeliveryDate) {
            const date = orderData.actualDeliveryDate.toDate();
            setEditActualDeliveryDate(date.toISOString().split('T')[0]);
          }
        } else {
          toast.error('Commande non trouvée');
          router.push('/orders');
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Erreur lors de la récupération des détails de la commande');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchOrderDetails();
    }
  }, [userProfile, params.id, router]);
  
  // Fonction pour mettre à jour la commande
  const handleUpdateOrder = async () => {
    if (!order) return;
    
    setIsUpdating(true);
    
    try {
      const orderRef = doc(db, 'orders', order.id);
      
      const updates: any = {
        status: editStatus,
        priority: editPriority,
        comments: editComments,
        updatedAt: Timestamp.now(),
      };
      
      if (editEstimatedDeliveryDate) {
        updates.estimatedDeliveryDate = Timestamp.fromDate(new Date(editEstimatedDeliveryDate));
      }
      
      if (editActualDeliveryDate) {
        updates.actualDeliveryDate = Timestamp.fromDate(new Date(editActualDeliveryDate));
      }
      
      await updateDoc(orderRef, updates);
      
      // Créer une notification pour le créateur de la commande
      if (order.status !== editStatus) {
        // Ici, vous pourriez créer une notification pour informer le créateur
        // du changement de statut de sa commande
      }
      
      toast.success('Commande mise à jour avec succès');
      
      // Mettre à jour l'état local
      setOrder({
        ...order,
        ...updates,
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la mise à jour de la commande');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Fonction pour annuler l'édition
  const handleCancelEdit = () => {
    if (!order) return;
    
    setEditStatus(order.status);
    setEditPriority(order.priority);
    setEditComments(order.comments || '');
    
    if (order.estimatedDeliveryDate) {
      const date = order.estimatedDeliveryDate.toDate();
      setEditEstimatedDeliveryDate(date.toISOString().split('T')[0]);
    } else {
      setEditEstimatedDeliveryDate('');
    }
    
    if (order.actualDeliveryDate) {
      const date = order.actualDeliveryDate.toDate();
      setEditActualDeliveryDate(date.toISOString().split('T')[0]);
    } else {
      setEditActualDeliveryDate('');
    }
    
    setIsEditing(false);
  };
  
  // Vérifier si l'utilisateur peut éditer la commande
  const canEditOrder = () => {
    if (!userProfile || !order) return false;
    
    // L'employé de manutention peut toujours éditer
    if (userProfile.role === 'maintenance') return true;
    
    // Le créateur de la commande peut l'éditer si elle est en attente
    if (order.createdBy === userProfile.uid && order.status === 'pending') return true;
    
    // Les managers de restaurant peuvent éditer les commandes de leur restaurant
    if (
      (userProfile.role === 'restaurant_manager' || 
       userProfile.role === 'room_manager' || 
       userProfile.role === 'bar_manager') && 
      order.restaurantId === userProfile.restaurantId
    ) return true;
    
    return false;
  };
  
  // État de chargement
  if (isLoading || !userProfile) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-center">
            <p className="text-lg text-gray-600">Chargement des détails de la commande...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Si la commande n'existe pas
  if (!order) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg text-gray-600 mb-4">Commande non trouvée</p>
          <Button
            variant="outline"
            onClick={() => router.push('/orders')}
            className="flex items-center"
          >
            <FiArrowLeft className="mr-2" />
            Retour à la liste des commandes
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={() => router.push('/orders')}
              className="mr-4"
            >
              <FiArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Détails de la commande</h1>
          </div>
          
          {canEditOrder() && !isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="glow"
                onClick={() => setIsEditing(true)}
                className="flex items-center"
              >
                <FiEdit2 className="mr-2" />
                Modifier
              </Button>
            </div>
          )}
          
          {isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex items-center"
                disabled={isUpdating}
              >
                <FiX className="mr-2" />
                Annuler
              </Button>
              <Button
                variant="glow"
                onClick={handleUpdateOrder}
                className="flex items-center"
                disabled={isUpdating}
              >
                <FiCheck className="mr-2" />
                {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </div>
        
        {/* Informations principales */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Commande #{order.id.substring(0, 6)}</h2>
                <p className="text-blue-100">
                  {categoryOptions.find(c => c.value === order.category)?.label || order.category}
                </p>
              </div>
              <div className="mt-2 sm:mt-0 flex flex-col sm:items-end">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                  {priorityOptions.find(p => p.value === order.priority)?.label || order.priority}
                </span>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {statusOptions.find(s => s.value === order.status)?.label || order.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date de création</p>
                      <p className="text-sm text-gray-900">{formatDateTime(order.createdAt.toDate())}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <FiUser className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Créée par</p>
                      <p className="text-sm text-gray-900">ID: {order.createdBy}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <FiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Restaurant</p>
                      <p className="text-sm text-gray-900">Restaurant {order.restaurantId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <FiPackage className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Département</p>
                      <p className="text-sm text-gray-900">
                        {order.department === 'room' ? 'Salle' : 
                         order.department === 'bar' ? 'Bar' : 
                         order.department === 'kitchen' ? 'Cuisine' : 'Général'}
                      </p>
                    </div>
                  </div>
                  
                  {order.isRecurring && (
                    <div className="flex items-start">
                      <FiRepeat className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Commande récurrente</p>
                        <p className="text-sm text-gray-900">
                          {order.recurringFrequency === 'daily' ? 'Quotidienne' : 
                           order.recurringFrequency === 'weekly' ? 'Hebdomadaire' : 
                           order.recurringFrequency === 'monthly' ? 'Mensuelle' : 'Non spécifié'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Dates et statut */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Suivi de la commande</h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        id="status"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as RequestStatus)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priorité
                      </label>
                      <select
                        id="priority"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="estimatedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Date de livraison estimée
                      </label>
                      <input
                        type="date"
                        id="estimatedDeliveryDate"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editEstimatedDeliveryDate}
                        onChange={(e) => setEditEstimatedDeliveryDate(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="actualDeliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Date de livraison réelle
                      </label>
                      <input
                        type="date"
                        id="actualDeliveryDate"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editActualDeliveryDate}
                        onChange={(e) => setEditActualDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`h-4 w-4 rounded-full ${
                          order.status === 'completed' ? 'bg-green-500' : 
                          order.status === 'cancelled' ? 'bg-red-500' : 
                          order.status === 'in_progress' ? 'bg-blue-500' : 
                          'bg-yellow-500'
                        }`}></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {statusOptions.find(s => s.value === order.status)?.label || order.status}
                        </p>
                        <p className="text-sm text-gray-500">
                          Dernière mise à jour: {formatDateTime(order.updatedAt.toDate())}
                        </p>
                      </div>
                    </div>
                    
                    {order.estimatedDeliveryDate && (
                      <div className="flex items-start">
                        <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date de livraison estimée</p>
                          <p className="text-sm text-gray-900">{formatDate(order.estimatedDeliveryDate.toDate())}</p>
                        </div>
                      </div>
                    )}
                    
                    {order.actualDeliveryDate && (
                      <div className="flex items-start">
                        <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date de livraison réelle</p>
                          <p className="text-sm text-gray-900">{formatDate(order.actualDeliveryDate.toDate())}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Articles */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Articles commandés</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unité
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Commentaires */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Commentaires</h3>
            
            {isEditing ? (
              <textarea
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                value={editComments}
                onChange={(e) => setEditComments(e.target.value)}
                placeholder="Ajoutez des commentaires sur cette commande..."
              />
            ) : (
              <p className="text-sm text-gray-600">
                {order.comments || 'Aucun commentaire'}
              </p>
            )}
          </div>
          
          {/* Photos */}
          {order.photoURLs && order.photoURLs.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {order.photoURLs.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative cursor-pointer"
                    onClick={() => setSelectedImage(url)}
                  >
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="h-32 w-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-md">
                      <FiImage className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Modal pour afficher l'image en grand */}
              {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
                  <div className="relative max-w-4xl w-full">
                    <button
                      className="absolute top-2 right-2 bg-white rounded-full p-2"
                      onClick={() => setSelectedImage(null)}
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                    <img
                      src={selectedImage}
                      alt="Image agrandie"
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
