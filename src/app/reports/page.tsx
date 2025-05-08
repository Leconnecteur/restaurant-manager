'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Order, MaintenanceRequest } from '@/types';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FiDownload, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

// Types pour les filtres
type DateRange = 'day' | 'week' | 'month' | 'year' | 'custom';
type FilterState = {
  dateRange: DateRange;
  startDate: Date;
  endDate: Date;
  restaurantId: string | null;
  category: string | null;
};

// Couleurs pour les graphiques
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    restaurantId: null,
    category: null,
  });

  // Données pour les restaurants
  const restaurants = [
    { id: '1', name: 'Monsieur Mouettes' },
    { id: '2', name: 'Gigio' },
    { id: '3', name: 'Tigers' },
    { id: '4', name: 'La Tétrade' },
  ];

  // Récupérer les données
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;
      
      setIsLoading(true);
      
      try {
        // Déterminer les contraintes de date
        const startTimestamp = Timestamp.fromDate(filters.startDate);
        const endTimestamp = Timestamp.fromDate(filters.endDate);
        
        // Récupérer les commandes
        let ordersQuery = query(
          collection(db, 'orders'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp)
        );
        
        // Ajouter le filtre de restaurant si spécifié
        if (filters.restaurantId && userProfile.role === 'maintenance') {
          ordersQuery = query(
            ordersQuery,
            where('restaurantId', '==', filters.restaurantId)
          );
        } else if (userProfile.role !== 'maintenance') {
          // Si l'utilisateur n'est pas un employé de manutention, il ne voit que son restaurant
          ordersQuery = query(
            ordersQuery,
            where('restaurantId', '==', userProfile.restaurantId)
          );
        }
        
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        setOrders(ordersData);
        
        // Récupérer les demandes de maintenance
        let maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp)
        );
        
        // Ajouter le filtre de restaurant si spécifié
        if (filters.restaurantId && userProfile.role === 'maintenance') {
          maintenanceQuery = query(
            maintenanceQuery,
            where('restaurantId', '==', filters.restaurantId)
          );
        } else if (userProfile.role !== 'maintenance') {
          // Si l'utilisateur n'est pas un employé de manutention, il ne voit que son restaurant
          maintenanceQuery = query(
            maintenanceQuery,
            where('restaurantId', '==', userProfile.restaurantId)
          );
        }
        
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const maintenanceData = maintenanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaintenanceRequest[];
        
        setMaintenanceRequests(maintenanceData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userProfile) {
      fetchData();
    }
  }, [userProfile, filters]);
  
  // Mettre à jour les filtres de date en fonction de la plage sélectionnée
  const handleDateRangeChange = (range: DateRange) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Pour 'custom', on garde les dates actuelles
        return;
    }
    
    setFilters({
      ...filters,
      dateRange: range,
      startDate,
      endDate: now,
    });
  };
  
  // Exporter les données au format CSV
  const exportToCSV = (dataType: 'orders' | 'maintenance') => {
    const data = dataType === 'orders' ? orders : maintenanceRequests;
    
    if (data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    // Convertir les données en format CSV
    const headers = Object.keys(data[0]).filter(key => 
      !['photoURLs', 'items'].includes(key)
    );
    
    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        headers.map(header => {
          const value = item[header as keyof typeof item];
          
          // Formater les timestamps
          if (value instanceof Timestamp) {
            return formatDate(value.toDate());
          }
          
          // Gérer les objets et tableaux
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value).replace(/,/g, ';');
          }
          
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Créer un blob et télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataType}_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Préparer les données pour les graphiques
  
  // 1. Commandes par restaurant
  const ordersByRestaurant = restaurants.map(restaurant => ({
    name: restaurant.name,
    value: orders.filter(order => order.restaurantId === restaurant.id).length
  }));
  
  // 2. Commandes par catégorie
  const ordersByCategory = orders.reduce((acc, order) => {
    const category = order.category;
    const existingCategory = acc.find(item => item.name === category);
    
    if (existingCategory) {
      existingCategory.value += 1;
    } else {
      acc.push({ name: category, value: 1 });
    }
    
    return acc;
  }, [] as { name: string; value: number }[]);
  
  // 3. Demandes de maintenance par statut
  const maintenanceByStatus = maintenanceRequests.reduce((acc, request) => {
    const status = request.status;
    const existingStatus = acc.find(item => item.name === status);
    
    if (existingStatus) {
      existingStatus.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    
    return acc;
  }, [] as { name: string; value: number }[]);
  
  // 4. Demandes de maintenance par catégorie
  const maintenanceByCategory = maintenanceRequests.reduce((acc, request) => {
    const category = request.category;
    const existingCategory = acc.find(item => item.name === category);
    
    if (existingCategory) {
      existingCategory.value += 1;
    } else {
      acc.push({ name: category, value: 1 });
    }
    
    return acc;
  }, [] as { name: string; value: number }[]);
  
  // 5. Temps moyen de résolution des demandes de maintenance (en jours)
  const completedRequests = maintenanceRequests.filter(
    request => request.status === 'completed' && request.actualCompletionDate
  );
  
  const averageResolutionTime = completedRequests.length > 0
    ? completedRequests.reduce((sum, request) => {
        const creationDate = request.createdAt.toDate();
        const completionDate = request.actualCompletionDate!.toDate();
        const diffTime = Math.abs(completionDate.getTime() - creationDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / completedRequests.length
    : 0;
  
  // Statistiques générales
  const stats = [
    {
      title: 'Commandes totales',
      value: orders.length,
      color: 'bg-blue-500',
    },
    {
      title: 'Demandes de maintenance',
      value: maintenanceRequests.length,
      color: 'bg-green-500',
    },
    {
      title: 'Temps moyen de résolution',
      value: `${averageResolutionTime.toFixed(1)} jours`,
      color: 'bg-purple-500',
    },
    {
      title: 'Demandes en attente',
      value: maintenanceRequests.filter(req => req.status === 'pending').length,
      color: 'bg-yellow-500',
    },
  ];
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Rapports et Statistiques</h1>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleDateRangeChange(filters.dateRange)}
              className="flex items-center"
            >
              <FiRefreshCw className="mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
        
        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période
              </label>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.dateRange === 'day' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleDateRangeChange('day')}
                >
                  Jour
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.dateRange === 'week' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleDateRangeChange('week')}
                >
                  Semaine
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.dateRange === 'month' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleDateRangeChange('month')}
                >
                  Mois
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.dateRange === 'year' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleDateRangeChange('year')}
                >
                  Année
                </button>
              </div>
            </div>
            
            {userProfile?.role === 'maintenance' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant
                </label>
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.restaurantId || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    restaurantId: e.target.value || null
                  })}
                >
                  <option value="">Tous les restaurants</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dates personnalisées
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.startDate.toISOString().split('T')[0]}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: 'custom',
                    startDate: new Date(e.target.value)
                  })}
                />
                <input
                  type="date"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.endDate.toISOString().split('T')[0]}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: 'custom',
                    endDate: new Date(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistiques générales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.color} rounded-lg shadow p-4 text-white`}>
              <h3 className="text-lg font-medium">{stat.title}</h3>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse text-center">
              <p className="text-lg text-gray-600">Chargement des données...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commandes par restaurant */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Commandes par restaurant</h2>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV('orders')}
                    className="flex items-center text-sm"
                  >
                    <FiDownload className="mr-1" />
                    Exporter
                  </Button>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ordersByRestaurant}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Commandes" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Commandes par catégorie */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-medium mb-4">Commandes par catégorie</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ordersByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ordersByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Demandes de maintenance par statut */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Demandes par statut</h2>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV('maintenance')}
                    className="flex items-center text-sm"
                  >
                    <FiDownload className="mr-1" />
                    Exporter
                  </Button>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={maintenanceByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          const statusLabels: Record<string, string> = {
                            pending: 'En attente',
                            in_progress: 'En cours',
                            completed: 'Terminé',
                            cancelled: 'Annulé'
                          };
                          return `${statusLabels[name] || name}: ${(percent * 100).toFixed(0)}%`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {maintenanceByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Demandes de maintenance par catégorie */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-medium mb-4">Demandes par catégorie</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={maintenanceByCategory}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Demandes" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
