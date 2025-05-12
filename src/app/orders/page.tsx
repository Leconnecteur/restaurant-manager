'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiPlus, FiFilter, FiSearch, FiCalendar, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { Order, OrderCategory, PriorityLevel, RequestStatus } from '@/types';
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

const categoryFilters: { value: OrderCategory; label: string }[] = [
  { value: 'glassware', label: 'Verrerie' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'food', label: 'Produits alimentaires' },
  { value: 'cleaning_supplies', label: 'Produits d\'entretien' },
  { value: 'tableware', label: 'Vaisselle' },
  { value: 'kitchen_supplies', label: 'Fournitures de cuisine' },
  { value: 'bar_supplies', label: 'Fournitures de bar' },
  { value: 'other', label: 'Autre' },
];

export default function OrdersPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // États pour les filtres
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<OrderCategory | ''>('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  
  // État pour le tri
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Order | '';
    direction: 'asc' | 'desc';
  }>({
    key: 'createdAt',
    direction: 'desc',
  });
  
  // Fonction pour récupérer les commandes
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userProfile) return;
      
      try {
        setIsLoading(true);
        
        // Paramètres de requête basés sur le restaurant sélectionné
        // Si un restaurant est sélectionné (pour tous les rôles, y compris manutentionnaires)
        const restaurantFilter = userProfile.restaurantId 
          ? where('restaurantId', '==', userProfile.restaurantId) 
          : null;
        
        // Requête pour récupérer les commandes (sans orderBy pour éviter les erreurs d'index)
        const ordersQuery = query(
          collection(db, 'orders'),
          ...(restaurantFilter ? [restaurantFilter] : [])
          // Tri effectué côté client
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        let ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        // Tri côté client par date de création (du plus récent au plus ancien)
        ordersData = ordersData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchOrders();
    }
  }, [userProfile]);
  
  // Appliquer les filtres
  useEffect(() => {
    let result = [...orders];
    
    // Filtre par terme de recherche
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(lowerSearchTerm) ||
        order.items.some(item => item.name.toLowerCase().includes(lowerSearchTerm)) ||
        order.comments?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filtre par statut
    if (statusFilter) {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Filtre par priorité
    if (priorityFilter) {
      result = result.filter(order => order.priority === priorityFilter);
    }
    
    // Filtre par catégorie
    if (categoryFilter) {
      result = result.filter(order => order.category === categoryFilter);
    }
    
    // Filtre par date
    if (dateRange.start && dateRange.end) {
      const startTimestamp = Timestamp.fromDate(dateRange.start);
      const endTimestamp = Timestamp.fromDate(dateRange.end);
      
      result = result.filter(order => {
        const orderDate = order.createdAt;
        return orderDate >= startTimestamp && orderDate <= endTimestamp;
      });
    }
    
    // Tri
    if (sortConfig.key) {
      result.sort((a, b) => {
        const keyA = a[sortConfig.key as keyof Order];
        const keyB = b[sortConfig.key as keyof Order];
        
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
    
    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, priorityFilter, categoryFilter, dateRange, sortConfig]);
  
  // Fonction pour trier les commandes
  const requestSort = (key: keyof Order) => {
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
  
  // Fonction pour exporter les commandes en CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Restaurant', 'Catégorie', 'Priorité', 'Statut', 'Articles', 'Commentaires'];
    
    const csvData = filteredOrders.map(order => [
      order.id,
      formatDate(order.createdAt.toDate()),
      `Restaurant ${order.restaurantId}`,
      categoryFilters.find(c => c.value === order.category)?.label || order.category,
      priorityFilters.find(p => p.value === order.priority)?.label || order.priority,
      statusFilters.find(s => s.value === order.status)?.label || order.status,
      order.items.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', '),
      order.comments || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
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
          <h1 className="text-2xl font-bold">Liste des commandes</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="restaurant"
              onClick={() => router.push('/orders/new')}
              className="flex items-center"
            >
              <FiPlus className="mr-2" />
              Nouvelle commande
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
                  onChange={(e) => setCategoryFilter(e.target.value as OrderCategory | '')}
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
        
        {/* Liste des commandes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <p className="text-gray-500">Chargement des commandes...</p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Aucune commande trouvée</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/orders/new')}
              >
                Créer une nouvelle commande
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
                      Articles
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
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/orders/detail?id=${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt.toDate())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${
                          order.restaurantId === '1' ? 'red' : 
                          order.restaurantId === '2' ? 'blue' : 
                          order.restaurantId === '3' ? 'green' : 
                          'yellow'
                        }-100 text-${
                          order.restaurantId === '1' ? 'red' : 
                          order.restaurantId === '2' ? 'blue' : 
                          order.restaurantId === '3' ? 'green' : 
                          'yellow'
                        }-800`}>
                          {restaurantOptions.find(r => r.id === order.restaurantId)?.name || `Restaurant ${order.restaurantId}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {categoryFilters.find(c => c.value === order.category)?.label || order.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items.length} article(s)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {priorityFilters.find(p => p.value === order.priority)?.label || order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {statusFilters.find(s => s.value === order.status)?.label || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="restaurant"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/orders/detail?id=${order.id}`);
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
