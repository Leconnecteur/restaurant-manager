'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Define user roles
export type RestaurantId = '1' | '2' | '3' | '4';
export type UserRole = 'maintenance' | 'restaurant_manager' | 'room_manager' | 'bar_manager' | 'employee';

// Define user profile structure
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  restaurantId: RestaurantId | null;
  photoURL?: string | null;
}

// Define auth context type
interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<User>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  setActiveRestaurant: (restaurantId: RestaurantId) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      } else {
        // Create a default profile if none exists
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'employee', // Default role
          restaurantId: null,
          photoURL: user.photoURL
        };
        
        await setDoc(userDocRef, defaultProfile);
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Signup function
  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName });
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'employee', // Default role
        restaurantId: null,
        photoURL: null
      };
      
      try {
        // Essayer de créer le profil utilisateur dans Firestore
        await setDoc(doc(db, 'users', user.uid), userProfile);
      } catch (firestoreError) {
        console.error('Erreur lors de la création du profil dans Firestore:', firestoreError);
        // Continuer malgré l'erreur Firestore - l'utilisateur est quand même créé dans Authentication
      }
      
      return user;
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No user is logged in');
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { ...userProfile, ...data }, { merge: true });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
      
      // Update display name in Firebase Auth if provided
      if (data.displayName && currentUser) {
        await updateProfile(currentUser, { 
          displayName: data.displayName,
          photoURL: data.photoURL || currentUser.photoURL
        });
      }
    } catch (error) {
      throw error;
    }
  };

  // Set active restaurant
  const setActiveRestaurant = async (restaurantId: RestaurantId) => {
    if (!currentUser) throw new Error('No user is logged in');
    
    return updateUserProfile({ restaurantId });
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    setActiveRestaurant
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
