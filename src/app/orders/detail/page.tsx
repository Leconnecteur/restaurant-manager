'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { FiArrowLeft, FiEdit2, FiCheck, FiX, FiClock, FiUser, FiMapPin, FiImage, FiPackage, FiRepeat } from 'react-icons/fi';
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
  { value: 'food', label: 'Produits alimentaires' },
  { value: 'drinks', label: 'Boissons' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'cleaning_supplies', label: 'Produits d\'entretien' },
  { value: 'tableware', label: 'Vaisselle' },
  { value: 'glassware', label: 'Verrerie' },
  { value: 'kitchen_supplies', label: 'Fournitures de cuisine' },
  { value: 'bar_supplies', label: 'Fournitures de bar' },
  { value: 'other', label: 'Autre' },
];

export default function OrderDetailPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // États pour l'édition
  const [editStatus, setEditStatus] = useState<RequestStatus>('pending');
  const [editPriority, setEditPriority] = useState<PriorityLevel>('normal');
  const [editComments, setEditComments] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurringFrequency, setEditRecurringFrequency] = useState('');
  const [editEstimatedDeliveryDate, setEditEstimatedDeliveryDate] = useState<string>('');
  const [editActualDeliveryDate, setEditActualDeliveryDate] = useState<string>('');
  
  // Récupérer les détails de la commande
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!userProfile || !id) {
        router.push('/orders');
        return;
      }
      
      try {
        setIsLoading(true);
        
        const orderDoc = await getDoc(doc(db, 'orders', id));
        
        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
          setOrder(orderData);
          
          // Initialiser les états d'édition
          setEditStatus(orderData.status);
          setEditPriority(orderData.priority);
          setEditComments(orderData.comments || '');
          setEditAssignedTo(orderData.assignedTo || '');
          setEditIsRecurring(orderData.isRecurring || false);
          setEditRecurringFrequency(orderData.recurringFrequency || '');
          
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
        toast.error('Erreur lors du chargement des détails');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchOrderDetails();
    }
  }, [userProfile, id, router]);
  
  // Fonction pour mettre à jour la commande
  const handleUpdateOrder = async () => {
    if (!order || !userProfile || !id) return;
    
    try {
      setIsUpdating(true);
      
      // Définir le type plus précis que any
      const updateData: Record<string, string | boolean | Timestamp | undefined> = {
        status: editStatus,
        priority: editPriority,
        comments: editComments,
        isRecurring: editIsRecurring,
        recurringFrequency: editIsRecurring ? editRecurringFrequency : undefined,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile.uid,
      };
      
      // Mise à jour des données conditionnelles
      if (editAssignedTo.trim()) {
        updateData.assignedTo = editAssignedTo;
      }
      
      if (editEstimatedDeliveryDate) {
        updateData.estimatedDeliveryDate = Timestamp.fromDate(new Date(editEstimatedDeliveryDate));
      }
      
      if (editActualDeliveryDate && editStatus === 'completed') {
        updateData.actualDeliveryDate = Timestamp.fromDate(new Date(editActualDeliveryDate));
      }
      
      // Mise à jour de la commande
      await updateDoc(doc(db, 'orders', id), updateData);
      
      // Mise à jour de l'état local
      setOrder({
        ...order,
        ...updateData,
      });
      
      setIsEditing(false);
      toast.success('Commande mise à jour avec succès');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Fonction pour annuler l'édition
  const handleCancelEdit = () => {
    if (!order) return;
    
    // Réinitialiser les états d'édition
    setEditStatus(order.status);
    setEditPriority(order.priority);
    setEditComments(order.comments || '');
    setEditAssignedTo(order.assignedTo || '');
    setEditIsRecurring(order.isRecurring || false);
    setEditRecurringFrequency(order.recurringFrequency || '');
    
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
    
    // Les admins (rôle maintenance) peuvent éditer toutes les commandes
    if (userProfile.role === 'maintenance') return true;
    
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
  
  // Si la commande n'est pas trouvée
  if (!order) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg text-gray-600 mb-4">Commande non trouvée</p>
          <Button onClick={() => router.push('/orders')}>
            Retour à la liste
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  // Récupérer les labels
  const statusLabel = statusOptions.find(s => s.value === order.status)?.label || order.status;
  const priorityLabel = priorityOptions.find(p => p.value === order.priority)?.label || order.priority;
  const categoryLabel = categoryOptions.find(c => c.value === order.category)?.label || order.category;
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/orders')}
              className="mr-2"
            >
              <FiArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {categoryLabel}
            </h1>
          </div>
          
          {canEditOrder() && (
            <div>
              {isEditing ? (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    <FiX className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateOrder}
                    disabled={isUpdating}
                  >
                    <FiCheck className="h-4 w-4 mr-1" />
                    {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:space-x-8">
              {/* Informations générales */}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
                
                <div className="space-y-4">
                  <div className="flex">
                    <FiPackage className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Catégorie</p>
                      <p className="text-sm text-gray-900">{categoryLabel}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Département</p>
                      <p className="text-sm text-gray-900">{order.department}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiUser className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Créé par</p>
                      <p className="text-sm text-gray-900">{order.createdBy || 'Non spécifié'}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date de création</p>
                      <p className="text-sm text-gray-900">{formatDateTime(order.createdAt.toDate())}</p>
                    </div>
                  </div>
                  
                  {order.isRecurring && (
                    <div className="flex">
                      <FiRepeat className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fréquence de réapprovisionnement</p>
                        <p className="text-sm text-gray-900">{order.recurringFrequency}</p>
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
                      <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                        Assigné à
                      </label>
                      <input
                        type="text"
                        id="assignedTo"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                        placeholder="Nom ou identifiant"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isRecurring"
                        className="mr-2"
                        checked={editIsRecurring}
                        onChange={(e) => setEditIsRecurring(e.target.checked)}
                      />
                      <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                        Commande récurrente
                      </label>
                    </div>
                    
                    {editIsRecurring && (
                      <div>
                        <label htmlFor="recurringFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                          Fréquence de réapprovisionnement
                        </label>
                        <select
                          id="recurringFrequency"
                          className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          value={editRecurringFrequency}
                          onChange={(e) => setEditRecurringFrequency(e.target.value)}
                        >
                          <option value="">Sélectionner...</option>
                          <option value="daily">Quotidienne</option>
                          <option value="weekly">Hebdomadaire</option>
                          <option value="biweekly">Bimensuelle</option>
                          <option value="monthly">Mensuelle</option>
                        </select>
                      </div>
                    )}
                    
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
                    
                    {editStatus === 'completed' && (
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
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex">
                      <div className={`h-5 w-5 rounded-full ${getStatusColor(order.status)} mt-0.5 mr-3`} />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Statut</p>
                        <p className="text-sm text-gray-900">{statusLabel}</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className={`h-5 w-5 rounded-full ${getPriorityColor(order.priority)} mt-0.5 mr-3`} />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Priorité</p>
                        <p className="text-sm text-gray-900">{priorityLabel}</p>
                      </div>
                    </div>
                    
                    {order.assignedTo && (
                      <div className="flex">
                        <FiUser className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Assigné à</p>
                          <p className="text-sm text-gray-900">{order.assignedTo}</p>
                        </div>
                      </div>
                    )}
                    
                    {order.estimatedDeliveryDate && (
                      <div className="flex">
                        <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date de livraison estimée</p>
                          <p className="text-sm text-gray-900">{formatDate(order.estimatedDeliveryDate.toDate())}</p>
                        </div>
                      </div>
                    )}
                    
                    {order.actualDeliveryDate && (
                      <div className="flex">
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
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {order.comments || 'Aucun commentaire'}
              </p>
            )}
          </div>
          
          {/* Articles commandés */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Articles commandés</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items && order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
          
          {/* Photos */}
          {order.photoURLs && order.photoURLs.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {order.photoURLs.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative cursor-pointer h-24"
                    onClick={() => setSelectedImage(url)}
                  >
                    <div className="relative h-24 w-full rounded-md shadow-sm overflow-hidden">
                      <Image
                        src={url}
                        alt={`Photo ${index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized={url.startsWith('data:')}
                      />
                    </div>
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
                    <div className="relative h-[80vh] w-full">
                      <Image 
                        src={selectedImage} 
                        alt="Image agrandie" 
                        fill
                        style={{ objectFit: 'contain' }}
                        unoptimized={selectedImage.startsWith('data:')}
                        className="rounded-md"
                      />
                    </div>
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
