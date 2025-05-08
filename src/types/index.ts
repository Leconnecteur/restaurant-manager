import { Timestamp } from 'firebase/firestore';
import { RestaurantId } from '@/contexts/AuthContext';

// Niveaux de priorité pour les commandes et demandes de maintenance
export type PriorityLevel = 'urgent' | 'normal' | 'planned';

// Statuts des commandes et demandes de maintenance
export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Catégories pour les commandes
export type OrderCategory = 
  | 'glassware' // Verrerie
  | 'alcohol' // Alcool
  | 'food' // Nourriture
  | 'drinks' // Boissons
  | 'cleaning_supplies' // Produits d'entretien
  | 'tableware' // Vaisselle
  | 'kitchen_supplies' // Fournitures de cuisine
  | 'bar_supplies' // Fournitures de bar
  | 'other'; // Autre

// Catégories pour les demandes de maintenance
export type MaintenanceCategory = 
  | 'plumbing' // Plomberie
  | 'electrical' // Électricité
  | 'hvac' // Climatisation/Chauffage
  | 'furniture' // Mobilier
  | 'appliance' // Électroménager
  | 'structural' // Structure
  | 'other'; // Autre

// Base interface for both order and maintenance requests
export interface BaseRequest {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID
  restaurantId: RestaurantId;
  status: RequestStatus;
  priority: PriorityLevel;
  comments: string;
  photoURLs: string[];
  department: 'room' | 'bar' | 'kitchen' | 'general';
}

// Order item interface
export interface OrderItem {
  name: string;
  quantity: number;
  unit: string; // e.g., 'bottles', 'kg', 'boxes'
  notes?: string;
}

// Order interface
export interface Order extends BaseRequest {
  type: 'order';
  category: OrderCategory;
  items: OrderItem[];
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  estimatedDeliveryDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  assignedTo?: string; // User ID of responsible personnel
}

// Maintenance request interface
export interface MaintenanceRequest extends BaseRequest {
  type: 'maintenance';
  category: MaintenanceCategory;
  location: string; // Specific location within the restaurant
  description: string;
  estimatedCompletionDate?: Timestamp;
  actualCompletionDate?: Timestamp;
  assignedTo?: string; // User ID of maintenance personnel
}

// Restaurant interface
export interface Restaurant {
  id: RestaurantId;
  name: string;
  address: string;
  phone: string;
  color: string; // Color code for UI differentiation
  managers: string[]; // Array of user IDs
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
  relatedTo: {
    type: 'order' | 'maintenance';
    id: string;
  };
}

// User preferences for notifications
export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  orderNotifications: boolean;
  maintenanceNotifications: boolean;
  statusUpdateNotifications: boolean;
}

// Type for combined requests (used in dashboard)
export type Request = Order | MaintenanceRequest;
