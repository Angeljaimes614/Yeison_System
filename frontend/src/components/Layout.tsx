import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  Package, 
  DollarSign, 
  FileText, 
  LogOut, 
  Menu,
  X,
  Users,
  TrendingUp,
  Clock,
  Settings as SettingsIcon
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Operaciones', path: '/operations', icon: ArrowRightLeft },
    { name: 'Cartera (Deudas)', path: '/debts', icon: Clock },
    { name: 'Inversiones', path: '/investments', icon: TrendingUp },
    { name: 'Configuración', path: '/settings', icon: SettingsIcon },
    { name: 'Gestión Financiera', path: '/finance', icon: Wallet },
    { name: 'Reportes', path: '/reports', icon: FileText },
    // Only show Users menu to admins
    ...(user?.role === 'admin' ? [{ name: 'Usuarios', path: '/users', icon: Users }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-slate-900 text-white transition-all duration-300">
        <div className="p-4 bg-slate-800 flex items-center justify-center">
          <h1 className="text-xl font-bold tracking-wider">ERP SYSTEM</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                    location.pathname === item.path 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
              <span className="font-bold text-sm">{user?.username.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-300 bg-slate-900/50 hover:bg-red-900/20 hover:text-red-200 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex justify-between items-center p-4 bg-slate-800">
          <h1 className="text-xl font-bold">ERP SYSTEM</h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Same Nav as Desktop */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                    location.pathname === item.path 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 bg-slate-800 border-t border-slate-700">
             <button
            onClick={handleLogout}
            className="flex items-center w-full text-red-300 hover:text-red-200"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Salir
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between p-4 bg-white shadow-sm z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold text-gray-800">ERP System</span>
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
             {user?.username.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
