'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
// import { motion } from 'framer-motion'; // Non utilisé
import { FiArrowLeft, FiEdit2, FiCheck, FiX, FiClock, FiUser, FiMapPin, FiTool, FiImage } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { MaintenanceRequest, MaintenanceCategory, PriorityLevel, RequestStatus } from '@/types';
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
const categoryOptions: { value: MaintenanceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'hvac', label: 'Climatisation/Chauffage' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'appliance', label: 'Appareils' },
  { value: 'structural', label: 'Structure' },
  { value: 'other', label: 'Autre' },
];

export default function MaintenanceDetailClient({ id }: { id: string }) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // États pour l'édition
  const [editStatus, setEditStatus] = useState<RequestStatus>('pending');
  const [editPriority, setEditPriority] = useState<PriorityLevel>('normal');
  const [editComments, setEditComments] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editEstimatedCompletionDate, setEditEstimatedCompletionDate] = useState<string>('');
  const [editActualCompletionDate, setEditActualCompletionDate] = useState<string>('');
  
  // Récupérer les détails de la demande de maintenance
  useEffect(() => {
    const fetchMaintenanceDetails = async () => {
      if (!userProfile) return;
      
      try {
        setIsLoading(true);
        
        const requestDoc = await getDoc(doc(db, 'maintenance', id));
        
        if (requestDoc.exists()) {
          const requestData = { id: requestDoc.id, ...requestDoc.data() } as MaintenanceRequest;
          setRequest(requestData);
          
          // Initialiser les états d'édition
          setEditStatus(requestData.status);
          setEditPriority(requestData.priority);
          setEditComments(requestData.comments || '');
          setEditAssignedTo(requestData.assignedTo || '');
          
          if (requestData.estimatedCompletionDate) {
            const date = requestData.estimatedCompletionDate.toDate();
            setEditEstimatedCompletionDate(date.toISOString().split('T')[0]);
          }
          
          if (requestData.actualCompletionDate) {
            const date = requestData.actualCompletionDate.toDate();
            setEditActualCompletionDate(date.toISOString().split('T')[0]);
          }
        } else {
          toast.error('Demande non trouvée');
          router.push('/maintenance');
        }
      } catch (error) {
        console.error('Error fetching maintenance details:', error);
        toast.error('Erreur lors du chargement des détails');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchMaintenanceDetails();
    }
  }, [userProfile, id, router]);
  
  // Fonction pour mettre à jour la demande
  const handleUpdateRequest = async () => {
    if (!request || !userProfile) return;
    
    try {
      setIsUpdating(true);
      
      const updateData: Record<string, any> = {
        status: editStatus,
        priority: editPriority,
        comments: editComments,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile.uid,
      };
      
      // Mise à jour des données conditionnelles
      if (editAssignedTo.trim()) {
        updateData.assignedTo = editAssignedTo;
      }
      
      if (editEstimatedCompletionDate) {
        updateData.estimatedCompletionDate = Timestamp.fromDate(new Date(editEstimatedCompletionDate));
      }
      
      if (editActualCompletionDate && editStatus === 'completed') {
        updateData.actualCompletionDate = Timestamp.fromDate(new Date(editActualCompletionDate));
      }
      
      // Mise à jour de la demande
      await updateDoc(doc(db, 'maintenance', request.id), updateData);
      
      // Mise à jour de l'état local
      setRequest({
        ...request,
        ...updateData,
      });
      
      setIsEditing(false);
      toast.success('Demande mise à jour avec succès');
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Fonction pour annuler l'édition
  const handleCancelEdit = () => {
    if (!request) return;
    
    // Réinitialiser les états d'édition
    setEditStatus(request.status);
    setEditPriority(request.priority);
    setEditComments(request.comments || '');
    setEditAssignedTo(request.assignedTo || '');
    
    if (request.estimatedCompletionDate) {
      const date = request.estimatedCompletionDate.toDate();
      setEditEstimatedCompletionDate(date.toISOString().split('T')[0]);
    } else {
      setEditEstimatedCompletionDate('');
    }
    
    if (request.actualCompletionDate) {
      const date = request.actualCompletionDate.toDate();
      setEditActualCompletionDate(date.toISOString().split('T')[0]);
    } else {
      setEditActualCompletionDate('');
    }
    
    setIsEditing(false);
  };
  
  // Vérifier si l'utilisateur peut éditer la demande
  const canEditRequest = () => {
    if (!userProfile || !request) return false;
    
    // Les administrateurs peuvent éditer toutes les demandes
    if (userProfile.role === 'admin' || userProfile.role === 'maintenance') return true;
    
    // Les managers de restaurant peuvent éditer les demandes de leur restaurant
    if (
      (userProfile.role === 'restaurant_manager' || 
       userProfile.role === 'room_manager' || 
       userProfile.role === 'bar_manager') && 
      request.restaurantId === userProfile.restaurantId
    ) return true;
    
    return false;
  };
  
  // État de chargement
  if (isLoading || !userProfile) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-center">
            <p className="text-lg text-gray-600">Chargement des détails de la demande...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Si la demande n'est pas trouvée
  if (!request) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg text-gray-600 mb-4">Demande non trouvée</p>
          <Button onClick={() => router.push('/maintenance')}>
            Retour à la liste
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  // Récupérer le label de statut et priorité
  const statusLabel = statusOptions.find(s => s.value === request.status)?.label || request.status;
  const priorityLabel = priorityOptions.find(p => p.value === request.priority)?.label || request.priority;
  const categoryLabel = categoryOptions.find(c => c.value === request.category)?.label || request.category;
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/maintenance')}
              className="mr-2"
            >
              <FiArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {request.title}
            </h1>
          </div>
          
          {canEditRequest() && (
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
                    onClick={handleUpdateRequest}
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
                    <FiTool className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Catégorie</p>
                      <p className="text-sm text-gray-900">{categoryLabel}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Emplacement</p>
                      <p className="text-sm text-gray-900">{request.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiUser className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Créé par</p>
                      <p className="text-sm text-gray-900">{request.createdByName || 'Non spécifié'}</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date de création</p>
                      <p className="text-sm text-gray-900">{formatDateTime(request.createdAt.toDate())}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dates et statut */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Suivi de la demande</h3>
                
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
                    
                    <div>
                      <label htmlFor="estimatedCompletionDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Date d'achèvement estimée
                      </label>
                      <input
                        type="date"
                        id="estimatedCompletionDate"
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editEstimatedCompletionDate}
                        onChange={(e) => setEditEstimatedCompletionDate(e.target.value)}
                      />
                    </div>
                    
                    {editStatus === 'completed' && (
                      <div>
                        <label htmlFor="actualCompletionDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Date d'achèvement réelle
                        </label>
                        <input
                          type="date"
                          id="actualCompletionDate"
                          className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          value={editActualCompletionDate}
                          onChange={(e) => setEditActualCompletionDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex">
                      <div className={`h-5 w-5 rounded-full ${getStatusColor(request.status)} mt-0.5 mr-3`} />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Statut</p>
                        <p className="text-sm text-gray-900">{statusLabel}</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className={`h-5 w-5 rounded-full ${getPriorityColor(request.priority)} mt-0.5 mr-3`} />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Priorité</p>
                        <p className="text-sm text-gray-900">{priorityLabel}</p>
                      </div>
                    </div>
                    
                    {request.assignedTo && (
                      <div className="flex">
                        <FiUser className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Assigné à</p>
                          <p className="text-sm text-gray-900">{request.assignedTo}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.estimatedCompletionDate && (
                      <div className="flex">
                        <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date d&apos;achèvement estimée</p>
                          <p className="text-sm text-gray-900">{formatDate(request.estimatedCompletionDate.toDate())}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.actualCompletionDate && (
                      <div className="flex">
                        <FiClock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date d&apos;achèvement réelle</p>
                          <p className="text-sm text-gray-900">{formatDate(request.actualCompletionDate.toDate())}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Description */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description du problème</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{request.description}</p>
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
                placeholder="Ajoutez des commentaires sur cette demande..."
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {request.comments || 'Aucun commentaire'}
              </p>
            )}
          </div>
          
          {/* Photos */}
          {request.photoURLs && request.photoURLs.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {request.photoURLs.map((url, index) => (
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
