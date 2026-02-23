import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Investments from './pages/Investments';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

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
            <Route index element={<Dashboard />} />
            <Route path="operations" element={
              <ErrorBoundary>
                <Operations />
              </ErrorBoundary>
            } />
            {/* <Route path="inventory" element={<Inventory />} /> */}
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="investments" element={<Investments />} />
            <Route path="users" element={<Users />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
