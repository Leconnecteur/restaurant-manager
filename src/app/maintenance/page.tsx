'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiPlus, FiFilter, FiSearch, FiDownload, FiTool } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { MaintenanceRequest, PriorityLevel, RequestStatus } from '@/types';

// Filtres disponibles
const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

const priorityLevels = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'planned', label: 'Planifié' },
];

// const departments = [
//   { value: 'room', label: 'Salle' },
//   { value: 'bar', label: 'Bar' },
//   { value: 'kitchen', label: 'Cuisine' },
//   { value: 'general', label: 'Général' },
// ];

// Liste des restaurants
const restaurantOptions = [
  { id: '1', name: 'Monsieur Mouettes' },
  { id: '2', name: 'Gigio' },
  { id: '3', name: 'Tigers' },
  { id: '4', name: 'La Tétrade' },
];

const maintenanceCategories = [
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'hvac', label: 'Climatisation/Chauffage' },
  { value: 'furniture', label: 'Mobilier' },
  { value: 'appliance', label: 'Appareils' },
  { value: 'structural', label: 'Structure' },
  { value: 'other', label: 'Autre' },
];

export default function MaintenancePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // États pour les filtres
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Removing unused state variables below
  // const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  // const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('');
  // const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory | ''>('');
  // const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    // start: null,
    // end: null,
  // });
  
  // Filtres combinés
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    date: '',
    category: '',
  });

  // Mettre à jour les filtres
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Réinitialiser les filtres
  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      date: '',
      category: '',
    });
    setSearchTerm('');
  };
  
  // État pour le tri
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MaintenanceRequest | '';
    direction: 'asc' | 'desc';
  }>({
    key: 'createdAt',
    direction: 'desc',
  });
  
  // Fonction pour récupérer les demandes de maintenance
  const fetchMaintenanceRequests = useCallback(async () => {
    if (!userProfile) return;
    
    try {
      setIsLoading(true);
      
      // Paramètres de requête basés sur le restaurant sélectionné
      // Si un restaurant est sélectionné (pour tous les rôles, y compris manutentionnaires)
      const restaurantFilter = userProfile.restaurantId 
        ? where('restaurantId', '==', userProfile.restaurantId) 
        : null;
      
      // Requête pour récupérer les demandes de maintenance (sans orderBy pour éviter les erreurs d'index)
      const maintenanceQuery = query(
        collection(db, 'maintenance'),
        ...(restaurantFilter ? [restaurantFilter] : [])
        // Tri effectué côté client
      );
      
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      let maintenanceData = maintenanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceRequest[];
      
      // Tri côté client par date de création (du plus récent au plus ancien)
      maintenanceData = maintenanceData.sort((a, b) => 
        b.createdAt && a.createdAt 
          ? b.createdAt.seconds - a.createdAt.seconds
          : 0
      );
      
      setMaintenanceRequests(maintenanceData);
      setFilteredRequests(maintenanceData);
    } catch (error: any) {
      console.error("Erreur lors de la récupération des demandes de maintenance", error);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);
  
  // Récupérer les demandes de maintenance au chargement et lorsque le profil change
  useEffect(() => {
    if (userProfile) {
      fetchMaintenanceRequests();
    }
  }, [userProfile]);
  
  // Mise à jour des filtres et affichage des demandes filtrées
  useEffect(() => {
    // Appliquer les filtres de recherche aux demandes
    let filtered = [...maintenanceRequests];

    // Filtre par recherche textuelle
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.description.toLowerCase().includes(termLower) ||
        req.id.toLowerCase().includes(termLower) ||
        req.location.toLowerCase().includes(termLower)
      );
    }
    
    // Appliquer les filtres additionnels
    if (filters.status) {
      filtered = filtered.filter(req => req.status === filters.status);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(req => req.priority === filters.priority);
    }
    
    if (filters.category) {
      filtered = filtered.filter(req => req.category === filters.category);
    }
    
    // Tri des résultats
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // @ts-expect-error - le typage est difficile ici car les champs sont variés
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        // @ts-expect-error - le typage est difficile ici car les champs sont variés
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredRequests(filtered);
  }, [maintenanceRequests, filters, searchTerm, sortConfig]);
  
  // Fonction pour trier les demandes (utilisée depuis le tableau)
  // Conservons cette fonction mais marquons-la comme utilisée pour le linter
  /* istanbul ignore next */
  const requestSort = (key: keyof MaintenanceRequest) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Fonction pour exporter les demandes en CSV
  const exportToCSV = () => {
    if (!filteredRequests.length) return;
    
    const headers = ['ID', 'Date', 'Restaurant', 'Catégorie', 'Localisation', 'Priorité', 'Statut'];
    
    const rows = filteredRequests.map(request => [
      request.id,
      request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : '',
      restaurantOptions.find(r => r.id === request.restaurantId)?.name || request.restaurantId,
      maintenanceCategories.find(c => c.value === request.category)?.label || request.category,
      request.location,
      priorityLevels.find(p => p.value === request.priority)?.label || request.priority,
      statusOptions.find(s => s.value === request.status)?.label || request.status,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper pour formater les dates
  const formatDateShort = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  // Helper pour les couleurs selon statut
  const getStatusColorClass = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper pour les couleurs selon priorité
  const getPriorityColorClass = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="space-y-6">
        {/* En-tête - optimisé pour mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold">Demandes de maintenance</h1>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
            <Button
              variant="restaurant"
              onClick={() => router.push('/maintenance/new')}
              className="flex items-center justify-center py-3 text-base"
            >
              <FiPlus className="mr-2" />
              Nouvelle
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center py-3 text-base"
            >
              <FiFilter className="mr-2" />
              Filtres
            </Button>
            
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center justify-center py-3 text-base col-span-2 sm:col-span-1"
            >
              <FiDownload className="mr-2" />
              Exporter
            </Button>
          </div>
        </div>
        
        {/* Filtres */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-3 md:p-4 rounded-lg shadow"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Recherche */}
              <div className="space-y-1">
                <label htmlFor="search" className="block text-base font-medium text-gray-700">
                  Recherche
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    className="block w-full pl-10 pr-3 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filtre par statut */}
              <div className="space-y-1">
                <label htmlFor="status" className="block text-base font-medium text-gray-700">
                  Statut
                </label>
                <select
                  id="status"
                  className="w-full p-3 text-base border border-gray-300 rounded-lg"
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                >
                  <option value="">Tous les statuts</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par priorité */}
              <div className="space-y-1">
                <label htmlFor="priority" className="block text-base font-medium text-gray-700">
                  Priorité
                </label>
                <select
                  id="priority"
                  className="w-full p-3 text-base border border-gray-300 rounded-lg"
                  value={filters.priority}
                  onChange={(e) => updateFilters({ priority: e.target.value })}
                >
                  <option value="">Toutes les priorités</option>
                  {priorityLevels.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par catégorie */}
              <div className="space-y-1">
                <label htmlFor="category" className="block text-base font-medium text-gray-700">
                  Catégorie
                </label>
                <select
                  id="category"
                  className="w-full p-3 text-base border border-gray-300 rounded-lg"
                  value={filters.category}
                  onChange={(e) => updateFilters({ category: e.target.value })}
                >
                  <option value="">Toutes les catégories</option>
                  {maintenanceCategories.map(category => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par date */}
              <div className="space-y-1">
                <label htmlFor="date" className="block text-base font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  className="w-full p-3 text-base border border-gray-300 rounded-lg"
                  value={filters.date}
                  onChange={(e) => updateFilters({ date: e.target.value })}
                />
              </div>
              
              {/* Boutons de filtres */}
              <div className="flex justify-end mt-4 col-span-1 sm:col-span-2 md:col-span-3">
                <Button
                  variant="outline"
                  className="mr-2 py-3 px-4 text-base"
                  onClick={clearFilters}
                >
                  Réinitialiser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(false)}
                  className="py-3 px-4 text-base"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Liste des demandes - version mobile et desktop */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-pulse">
              <p className="text-gray-500">Chargement des demandes...</p>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Aucune demande trouvée</p>
            <Button
              variant="restaurant"
              className="mt-4 py-3 px-4 text-base"
              onClick={() => router.push('/maintenance/new')}
            >
              Créer une nouvelle demande
            </Button>
          </div>
        ) : (
          <>
            {/* Vue mobile : cards */}
            <div className="md:hidden space-y-4">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-[#232325]"
                  onClick={() => router.push(`/maintenance/detail?id=${request.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{request.id.slice(-5)}</span>
                      <h3 className="font-medium mt-1">
                        {restaurantOptions.find(r => r.id === request.restaurantId)?.name || request.restaurantId}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-gray-500">{formatDateShort(request.createdAt)}</span>
                      <span className={`text-sm mt-1 font-medium px-2 py-1 rounded-full ${getPriorityColorClass(request.priority)}`}>
                        {priorityLevels.find(p => p.value === request.priority)?.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="text-xs text-gray-500">Catégorie</span>
                      <div className="text-sm">
                        {maintenanceCategories.find(c => c.value === request.category)?.label}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Statut</span>
                      <div className={`text-sm font-medium ${getStatusColorClass(request.status).replace('bg-', 'text-').replace('-100', '-600')}`}>
                        {statusOptions.find(s => s.value === request.status)?.label}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500">Localisation</span>
                    <div className="text-sm">
                      {request.location}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2 mt-2 border-t border-gray-100">
                    <Button
                      variant="restaurant"
                      size="sm"
                      className="text-sm py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/maintenance/detail?id=${request.id}`);
                      }}
                    >
                      Voir détails
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Vue desktop : tableau */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Localisation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priorité
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((request) => (
                      <tr 
                        key={request.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/maintenance/detail?id=${request.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.id.slice(-5)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {restaurantOptions.find(r => r.id === request.restaurantId)?.name || `Restaurant ${request.restaurantId}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateShort(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <FiTool className="mr-2 text-gray-400" />
                            {maintenanceCategories.find(c => c.value === request.category)?.label}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColorClass(request.priority)}`}>
                            {priorityLevels.find(p => p.value === request.priority)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(request.status)}`}>
                            {statusOptions.find(s => s.value === request.status)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="restaurant"
                            className="text-xs py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/maintenance/detail?id=${request.id}`);
                            }}
                          >
                            Voir détails
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
