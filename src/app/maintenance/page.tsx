'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiPlus, FiFilter, FiSearch, FiCalendar, FiDownload, FiChevronDown, FiChevronUp, FiTool } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { MaintenanceRequest, MaintenanceCategory, PriorityLevel, RequestStatus } from '@/types';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';

// Filtres disponibles
const statusFilters: { value: RequestStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

const priorityFilters: { value: PriorityLevel; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'planned', label: 'Planifié' },
];

// Liste des restaurants
const restaurantOptions = [
  { id: '1', name: 'Monsieur Mouettes' },
  { id: '2', name: 'Gigio' },
  { id: '3', name: 'Tigers' },
  { id: '4', name: 'La Tétrade' },
];

const categoryFilters: { value: MaintenanceCategory; label: string }[] = [
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
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory | ''>('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  
  // État pour le tri
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MaintenanceRequest | '';
    direction: 'asc' | 'desc';
  }>({
    key: 'createdAt',
    direction: 'desc',
  });
  
  // Fonction pour récupérer les demandes de maintenance
  useEffect(() => {
    const fetchMaintenanceRequests = async () => {
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
        maintenanceData = maintenanceData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setMaintenanceRequests(maintenanceData);
        setFilteredRequests(maintenanceData);
      } catch (error) {
        console.error('Error fetching maintenance requests:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchMaintenanceRequests();
    }
  }, [userProfile]);
  
  // Appliquer les filtres
  useEffect(() => {
    let result = [...maintenanceRequests];
    
    // Filtre par terme de recherche
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(request => 
        request.id.toLowerCase().includes(lowerSearchTerm) ||
        request.description.toLowerCase().includes(lowerSearchTerm) ||
        request.location.toLowerCase().includes(lowerSearchTerm) ||
        request.comments?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filtre par statut
    if (statusFilter) {
      result = result.filter(request => request.status === statusFilter);
    }
    
    // Filtre par priorité
    if (priorityFilter) {
      result = result.filter(request => request.priority === priorityFilter);
    }
    
    // Filtre par catégorie
    if (categoryFilter) {
      result = result.filter(request => request.category === categoryFilter);
    }
    
    // Filtre par date
    if (dateRange.start && dateRange.end) {
      const startTimestamp = Timestamp.fromDate(dateRange.start);
      const endTimestamp = Timestamp.fromDate(dateRange.end);
      
      result = result.filter(request => {
        const requestDate = request.createdAt;
        return requestDate >= startTimestamp && requestDate <= endTimestamp;
      });
    }
    
    // Tri
    if (sortConfig.key) {
      // Ne trie que si la clé est une propriété valide de MaintenanceRequest
      result.sort((a, b) => {
        const keyA = a[sortConfig.key as keyof MaintenanceRequest];
        const keyB = b[sortConfig.key as keyof MaintenanceRequest];
        
        // Gestion des valeurs undefined ou null
        if (keyA === undefined || keyA === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (keyB === undefined || keyB === null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        // Comparaison des valeurs définies
        if (keyA < keyB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (keyA > keyB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredRequests(result);
  }, [maintenanceRequests, searchTerm, statusFilter, priorityFilter, categoryFilter, dateRange, sortConfig]);
  
  // Fonction pour trier les demandes
  const requestSort = (key: keyof MaintenanceRequest) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };
  
  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setDateRange({ start: null, end: null });
  };
  
  // Fonction pour exporter les demandes en CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Restaurant', 'Catégorie', 'Priorité', 'Statut', 'Emplacement', 'Description', 'Commentaires'];
    
    const csvData = filteredRequests.map(request => [
      request.id,
      formatDate(request.createdAt.toDate()),
      `Restaurant ${request.restaurantId}`,
      categoryFilters.find(c => c.value === request.category)?.label || request.category,
      priorityFilters.find(p => p.value === request.priority)?.label || request.priority,
      statusFilters.find(s => s.value === request.status)?.label || request.status,
      request.location,
      request.description,
      request.comments || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
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
  
  // État de chargement
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
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Demandes de maintenance</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="restaurant"
              onClick={() => router.push('/maintenance/new')}
              className="flex items-center"
            >
              <FiPlus className="mr-2" />
              Nouvelle demande
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FiFilter className="mr-2" />
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </Button>
            
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center"
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
            className="bg-white p-4 rounded-lg shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recherche */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Recherche
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filtre par statut */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="status"
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RequestStatus | '')}
                >
                  <option value="">Tous les statuts</option>
                  {statusFilters.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par priorité */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priorité
                </label>
                <select
                  id="priority"
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | '')}
                >
                  <option value="">Toutes les priorités</option>
                  {priorityFilters.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par catégorie */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  id="category"
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as MaintenanceCategory | '')}
                >
                  <option value="">Toutes les catégories</option>
                  {categoryFilters.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtre par date (simplifiée) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Période
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiCalendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      })}
                    />
                  </div>
                  <span>à</span>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiCalendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </motion.div>
        )}
        
        {/* Liste des demandes de maintenance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <p className="text-gray-500">Chargement des demandes...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Aucune demande de maintenance trouvée</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/maintenance/new')}
              >
                Créer une nouvelle demande
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === 'createdAt' && (
                          sortConfig.direction === 'asc' ? 
                            <FiChevronUp className="ml-1" /> : 
                            <FiChevronDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Restaurant
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('category')}
                    >
                      <div className="flex items-center">
                        Catégorie
                        {sortConfig.key === 'category' && (
                          sortConfig.direction === 'asc' ? 
                            <FiChevronUp className="ml-1" /> : 
                            <FiChevronDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Emplacement
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('priority')}
                    >
                      <div className="flex items-center">
                        Priorité
                        {sortConfig.key === 'priority' && (
                          sortConfig.direction === 'asc' ? 
                            <FiChevronUp className="ml-1" /> : 
                            <FiChevronDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center">
                        Statut
                        {sortConfig.key === 'status' && (
                          sortConfig.direction === 'asc' ? 
                            <FiChevronUp className="ml-1" /> : 
                            <FiChevronDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
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
                        {formatDate(request.createdAt.toDate())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${
                          request.restaurantId === '1' ? 'red' : 
                          request.restaurantId === '2' ? 'blue' : 
                          request.restaurantId === '3' ? 'green' : 
                          'yellow'
                        }-100 text-${
                          request.restaurantId === '1' ? 'red' : 
                          request.restaurantId === '2' ? 'blue' : 
                          request.restaurantId === '3' ? 'green' : 
                          'yellow'
                        }-800`}>
                          {restaurantOptions.find(r => r.id === request.restaurantId)?.name || `Restaurant ${request.restaurantId}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FiTool className="mr-2 text-gray-400" />
                          {categoryFilters.find(c => c.value === request.category)?.label || request.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {priorityFilters.find(p => p.value === request.priority)?.label || request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {statusFilters.find(s => s.value === request.status)?.label || request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="restaurant"
                          className="text-xs"
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
          )}
        </div>
      </div>
    </MainLayout>
  );
}
