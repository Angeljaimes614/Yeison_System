import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Investments from './pages/Investments';
import Debts from './pages/Debts';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Helper component for role-based access
const RoleRoute = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  
  if (user && !roles.includes(user.role)) {
    // Redirect based on role if access denied
    if (user.role === 'inversionista') return <Navigate to="/investments" replace />;
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Wrapper for the Home Route to redirect Investors
const HomeRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Cargando...</div>;
    
    if (user?.role === 'inversionista') {
        return <Navigate to="/investments" replace />;
    }
    return <Dashboard />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Home Route with Redirection Logic */}
            <Route index element={<HomeRedirect />} />
            
            <Route path="operations" element={
              <RoleRoute roles={['admin', 'supervisor', 'cajero']}>
                <ErrorBoundary><Operations /></ErrorBoundary>
              </RoleRoute>
            } />
            
            <Route path="finance" element={
               <RoleRoute roles={['admin', 'supervisor', 'cajero']}>
                 <Finance />
               </RoleRoute>
            } />
            
            <Route path="reports" element={
               <RoleRoute roles={['admin', 'supervisor', 'cajero']}>
                 <Reports />
               </RoleRoute>
            } />
            
            <Route path="investments" element={
               <RoleRoute roles={['admin', 'supervisor', 'cajero', 'inversionista']}>
                 <Investments />
               </RoleRoute>
            } />
            
            <Route path="debts" element={
               <RoleRoute roles={['admin', 'supervisor', 'cajero']}>
                 <Debts />
               </RoleRoute>
            } />
            
            <Route path="settings" element={
               <RoleRoute roles={['admin', 'supervisor', 'cajero']}>
                 <Settings />
               </RoleRoute>
            } />
            
            <Route path="users" element={
               <RoleRoute roles={['admin']}>
                 <Users />
               </RoleRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
