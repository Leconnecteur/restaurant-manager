import React, { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import toast from 'react-hot-toast';
import { 
  FiHome, 
  FiShoppingCart, 
  FiTool, 
  FiUser, 
  FiBell, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiBarChart2
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { userProfile, logout, setActiveRestaurant } = useAuth();
  // Utiliser useNotifications() pour maintenir la cohérence, mais sans utiliser ses valeurs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _notificationContext = useNotifications();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Palette moderne avec dégradé
  const getRestaurantBg = () => 'bg-[#232325]';

  // Couleur de texte principale
  const getTextColor = () => 'text-[#F5F5F5]';

  // Liste des restaurants disponibles
  const restaurantOptions = [
    { id: '1', name: 'Monsieur Mouettes' },
    { id: '2', name: 'Gigio' },
    { id: '3', name: 'Tigers' },
    { id: '4', name: 'La Tétrade' },
  ];

  // Dropdown pour changer de restaurant
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const handleSelectRestaurant = async (id: string) => {
    // Vérifier si l'utilisateur a le droit de changer de restaurant
    if (userProfile?.role === 'maintenance' || id === userProfile?.restaurantId) {
      if (userProfile?.restaurantId !== id) {
        // Le type RestaurantId nécessite un cast
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await setActiveRestaurant(id as any);
        setDropdownOpen(false);
      }
    } else {
      // Afficher une notification d'erreur si l'utilisateur tente d'accéder à un restaurant non autorisé
      toast.error("Vous n'avez pas les droits pour accéder à ce restaurant.");
      setDropdownOpen(false);
    }
  };

  const navItems = [
    {
      name: 'Tableau de bord',
      href: '/dashboard',
      icon: <FiHome className="w-5 h-5" />,
      allowedRoles: ['maintenance', 'restaurant_manager', 'room_manager', 'bar_manager', 'employee'],
    },
    {
      name: 'Commandes',
      href: '/orders',
      icon: <FiShoppingCart className="w-5 h-5" />,
      allowedRoles: ['maintenance', 'restaurant_manager', 'room_manager', 'bar_manager', 'employee'],
    },
    {
      name: 'Maintenance',
      href: '/maintenance',
      icon: <FiTool className="w-5 h-5" />,
      allowedRoles: ['maintenance', 'restaurant_manager', 'room_manager', 'bar_manager', 'employee'],
    },
    {
      name: 'Rapports',
      href: '/reports',
      icon: <FiBarChart2 className="w-5 h-5" />,
      allowedRoles: ['maintenance', 'restaurant_manager'],
    },
    {
      name: 'Profil',
      href: '/profile',
      icon: <FiUser className="w-5 h-5" />,
      allowedRoles: ['maintenance', 'restaurant_manager', 'room_manager', 'bar_manager', 'employee'],
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !userProfile?.role || item.allowedRoles.includes(userProfile.role)
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col w-64 ${getRestaurantBg()} ${getTextColor()} transition-colors duration-300`}>
        <div className="p-4 border-b border-white/10 flex flex-col gap-2">
  <h1 className="text-xl font-bold">Restaurant Manager</h1>
  {/* Dropdown de sélection de restaurant */}
  <div className="relative">
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
      onClick={() => setDropdownOpen(!dropdownOpen)}
      type="button"
    >
      <span className="font-medium">
        {userProfile?.restaurantId
          ? restaurantOptions.find(r => r.id === userProfile.restaurantId)?.name || 'Sélectionner'
          : 'Sélectionner'}
      </span>
      <svg className={`w-4 h-4 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
    {dropdownOpen && (
      <motion.ul
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute left-0 mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-lg z-20 overflow-hidden"
      >
        {/* Filtrer les restaurants en fonction du rôle de l'utilisateur */}
        {restaurantOptions
          .filter(option => 
            // Pour le personnel de maintenance, afficher tous les restaurants
            // Pour les autres rôles, afficher uniquement le restaurant assigné
            userProfile?.role === 'maintenance' || option.id === userProfile?.restaurantId
          )
          .map(option => (
  <li key={option.id}>
    <button
      className={`w-full flex items-center gap-2 text-left px-4 py-2 transition-colors
        ${userProfile?.restaurantId === option.id
          ? 'bg-[#2B2B2B] text-[#FFD600] font-bold'
          : 'text-white hover:bg-gray-700'}
      `}
      onClick={() => handleSelectRestaurant(option.id)}
    >
      {userProfile?.restaurantId === option.id && (
        <span className="inline-block w-2 h-2 rounded-full bg-[#FFD600] mr-2"></span>
      )}
      {option.name}
    </button>
  </li>
))}
      </motion.ul>
    )}
  </div>
</div>
        
        <nav className="flex-1 p-4 space-y-2">
          {filteredNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-[#2B2B2B] text-[#FFD600]'
                  : 'text-[#F5F5F5]/80 hover:bg-[#2B2B2B]'
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => logout()}
          >
            <FiLogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 bg-[#232325] text-white shadow-md sticky top-0 z-10">
          <div className="flex items-center">
            <button 
              onClick={toggleMobileMenu} 
              className="text-white focus:outline-none md:hidden p-2"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="w-7 h-7" />
              ) : (
                <FiMenu className="w-7 h-7" />
              )}
            </button>
            
            <div className="md:hidden text-lg font-bold ml-2">Restaurant Manager</div>
          </div>
          
          {/* Notifications et profil */}
          <div className="flex items-center space-x-5">
            <button className="relative text-white focus:outline-none p-2" aria-label="Notifications">
              <FiBell className="w-7 h-7" />
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="hidden md:block">
              <span className="font-medium">{userProfile?.displayName}</span>
            </div>
          </div>
        </header>
        
        {/* Mobile Menu - optimisé pour mobile */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-50 ${getRestaurantBg()} text-white md:hidden`}
          >
            <div className="flex flex-col h-full">
              <div className="py-5 px-4 border-b border-white/10 flex justify-between items-center">
                <h1 className="text-xl font-bold">Restaurant Manager</h1>
                <button onClick={toggleMobileMenu} className="p-2" aria-label="Fermer le menu">
                  <FiX className="w-7 h-7" />
                </button>
              </div>

              {/* Sélecteur de restaurant pour mobile - optimisé */}
              {userProfile?.role === 'maintenance' && (
                <div className="py-4 px-4 border-b border-white/10">
                  <p className="text-base font-semibold mb-3 text-white/90">Restaurant actif</p>
                  <div className="grid grid-cols-1 gap-3">
                    {restaurantOptions.map(option => (
                      <button
                        key={option.id}
                        className={`py-3 px-4 rounded-lg text-base font-medium transition-colors ${userProfile?.restaurantId === option.id
                          ? 'bg-white/20 text-[#FFD600] font-bold border-l-4 border-[#FFD600]'
                          : 'text-white/90 bg-white/10 hover:bg-white/15'
                        }`}
                        onClick={() => {
                          handleSelectRestaurant(option.id);
                          toggleMobileMenu();
                        }}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <nav className="flex-1 py-2 px-4 space-y-3 overflow-y-auto">
                {filteredNavItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`flex items-center px-4 py-4 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-white/20 text-[#FFD600]'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                    onClick={toggleMobileMenu}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="ml-3 text-base">{item.name}</span>
                  </Link>
                ))}
              </nav>
              
              <div className="py-5 px-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/15 py-4 text-base"
                  onClick={() => {
                    logout();
                    toggleMobileMenu();
                  }}
                >
                  <FiLogOut className="w-6 h-6 mr-3" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Page Content - optimisé pour mobile */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
