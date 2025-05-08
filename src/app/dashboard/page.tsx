'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiTool, FiClock } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { Order, MaintenanceRequest, Request } from '@/types';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceRequest[]>([]);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !userProfile) {
      router.push('/auth/login');
    }
  }, [userProfile, loading, router]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;

      try {
        setIsLoading(true);
        
        // Query parameters based on user role
        // Toujours filtrer par le restaurant sélectionné dans l'interface
        // Pour que le personnel de maintenance voit uniquement les demandes du restaurant sélectionné
        const restaurantFilter = userProfile.restaurantId 
          ? where('restaurantId', '==', userProfile.restaurantId) 
          : null;
        
        // Fetch pending orders - sans orderBy pour éviter les erreurs d'index
        const ordersQuery = query(
          collection(db, 'orders'),
          where('status', '==', 'pending'),
          ...(restaurantFilter ? [restaurantFilter] : [])
          // Tri effectué côté client
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        let ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        // Tri côté client par date de création (du plus récent au plus ancien)
        ordersData = ordersData
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, 5); // Limiter à 5 résultats
        
        setPendingOrders(ordersData);
        
        // Fetch pending maintenance requests - sans orderBy pour éviter les erreurs d'index
        const maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('status', '==', 'pending'),
          ...(restaurantFilter ? [restaurantFilter] : [])
          // Tri effectué côté client
        );
        
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        let maintenanceData = maintenanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaintenanceRequest[];
        
        // Tri côté client par date de création (du plus récent au plus ancien)
        maintenanceData = maintenanceData
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, 5); // Limiter à 5 résultats
        
        setPendingMaintenance(maintenanceData);
        
        // Fetch recent requests (both orders and maintenance) - sans orderBy pour éviter les erreurs d'index
        const recentOrdersQuery = query(
          collection(db, 'orders'),
          ...(restaurantFilter ? [restaurantFilter] : [])
          // Tri effectué côté client
        );
        
        const recentMaintenanceQuery = query(
          collection(db, 'maintenance'),
          ...(restaurantFilter ? [restaurantFilter] : [])
          // Tri effectué côté client
        );
        
        const [recentOrdersSnapshot, recentMaintenanceSnapshot] = await Promise.all([
          getDocs(recentOrdersQuery),
          getDocs(recentMaintenanceQuery)
        ]);
        
        const recentOrdersData = recentOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        const recentMaintenanceData = recentMaintenanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaintenanceRequest[];
        
        // Combine and sort by createdAt
        const combinedRecent = [...recentOrdersData, ...recentMaintenanceData]
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, 5);
        
        setRecentRequests(combinedRecent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userProfile) {
      fetchData();
    }
  }, [userProfile]);

  // Loading state
  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-center">
          <p className="text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Nous avons supprimé la page de sélection de restaurant
  // Le restaurant est déjà attribué lors de l'inscription

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Tableau de bord
            {userProfile.restaurantId && userProfile.role !== 'maintenance' && (
              <span className="ml-2 text-gray-500">
                - {userProfile.restaurantId === '1' ? 'Monsieur Mouettes' :
                   userProfile.restaurantId === '2' ? 'Gigio' :
                   userProfile.restaurantId === '3' ? 'Tigers' :
                   userProfile.restaurantId === '4' ? 'La Tétrade' :
                   `Restaurant ${userProfile.restaurantId}`}
              </span>
            )}
          </h1>
          
          <div className="flex space-x-2">
            <Button
              variant="glow"
              className="mr-2"
              onClick={() => router.push('/orders/new')}
            >
              Nouvelle commande
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/maintenance/new')}
            >
              Demande de maintenance
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Commandes en attente</h2>
              <FiShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold mt-2">{pendingOrders.length}</p>
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/orders')}
              >
                Voir toutes les commandes
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Maintenance en attente</h2>
              <FiTool className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold mt-2">{pendingMaintenance.length}</p>
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/maintenance')}
              >
                Voir toutes les demandes
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Activité récente</h2>
              <FiClock className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold mt-2">{recentRequests.length}</p>
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/activity')}
              >
                Voir toute l'activité
              </Button>
            </div>
          </motion.div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Activité récente</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-pulse">
                <h1 className="text-xl font-semibold mb-6">Activité récente</h1>
                <div className="text-center py-4">Chargement...</div>
              </div>
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-center py-4 text-gray-500">Aucune activité récente</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {request.type === 'order' ? (
                        <FiShoppingCart className="h-5 w-5 text-blue-500 mr-3" />
                      ) : (
                        <FiTool className="h-5 w-5 text-green-500 mr-3" />
                      )}
                      <div>
                        <p className="font-medium">
                          {request.type === 'order' 
                            ? `Commande - ${(request as Order).category === 'glassware' ? 'Verrerie' :
                               (request as Order).category === 'alcohol' ? 'Alcool' :
                               (request as Order).category === 'food' ? 'Nourriture' :
                               (request as Order).category === 'cleaning_supplies' ? 'Produits d\'entretien' :
                               (request as Order).category === 'tableware' ? 'Vaisselle' :
                               (request as Order).category === 'kitchen_supplies' ? 'Fournitures de cuisine' :
                               (request as Order).category === 'bar_supplies' ? 'Fournitures de bar' : 'Autre'}` 
                            : `Maintenance - ${(request as MaintenanceRequest).category === 'plumbing' ? 'Plomberie' :
                               (request as MaintenanceRequest).category === 'electrical' ? 'Électricité' :
                               (request as MaintenanceRequest).category === 'hvac' ? 'Climatisation/Chauffage' :
                               (request as MaintenanceRequest).category === 'furniture' ? 'Mobilier' :
                               (request as MaintenanceRequest).category === 'appliance' ? 'Appareils' :
                               (request as MaintenanceRequest).category === 'structural' ? 'Structure' : 'Autre'}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.restaurantId === '1' ? 'Monsieur Mouettes' :
                           request.restaurantId === '2' ? 'Gigio' :
                           request.restaurantId === '3' ? 'Tigers' :
                           request.restaurantId === '4' ? 'La Tétrade' :
                           `Restaurant ${request.restaurantId}`} - {formatDate(request.createdAt.toDate())}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(request.priority)}`}>
                        {request.priority === 'urgent' ? 'Urgent' :
                         request.priority === 'normal' ? 'Normal' : 'Planifié'}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                        {request.status === 'pending' ? 'En attente' :
                         request.status === 'in_progress' ? 'En cours' :
                         request.status === 'completed' ? 'Terminé' :
                         'Annulé'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Commandes en attente</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-pulse">
                <h1 className="text-xl font-semibold mb-6">Commandes en attente</h1>
                <div className="text-center py-4">Chargement...</div>
              </div>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-center py-4 text-gray-500">Aucune commande en attente</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Commande {order.id.substring(0, 6)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.restaurantId === '1' ? 'Monsieur Mouettes' :
                         order.restaurantId === '2' ? 'Gigio' :
                         order.restaurantId === '3' ? 'Tigers' :
                         order.restaurantId === '4' ? 'La Tétrade' :
                         `Restaurant ${order.restaurantId}`} - {formatDate(order.createdAt.toDate())}
                      </p>
                      <p className="text-sm mt-1">
                        {order.items.length} article(s) - {order.category === 'glassware' ? 'Verrerie' :
                         order.category === 'alcohol' ? 'Alcool' :
                         order.category === 'food' ? 'Nourriture' :
                         order.category === 'cleaning_supplies' ? 'Produits d\'entretien' :
                         order.category === 'tableware' ? 'Vaisselle' :
                         order.category === 'kitchen_supplies' ? 'Fournitures de cuisine' :
                         order.category === 'bar_supplies' ? 'Fournitures de bar' : 'Autre'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                      <Button
                        variant="outline"
                        className="ml-4"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        Voir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
