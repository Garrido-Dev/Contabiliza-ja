// ============================================================
// src/App.jsx
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login from './pages/Login';
import QuoteList from './pages/QuoteList';
import QuoteForm from './pages/QuoteForm';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import Financial from './pages/Financial';
import Obligations from './pages/Obligations';
import PublicQuote from './pages/PublicQuote';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/orcamento/:id" element={<PublicQuote />} />
          
          <Route path="/consultorias" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
          <Route path="/consultorias/nova" element={<ProtectedRoute><QuoteForm /></ProtectedRoute>} />
          <Route path="/consultorias/:id/editar" element={<ProtectedRoute><QuoteForm /></ProtectedRoute>} />
          
          <Route path="/clientes" element={<ProtectedRoute><ClientList /></ProtectedRoute>} />
          <Route path="/clientes/novo" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
          
          <Route path="/financeiro" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
          <Route path="/obrigacoes" element={<ProtectedRoute><Obligations /></ProtectedRoute>} />
          
          {/* Módulo de Documentos (GED) removido; redirecionamento seguro */}
          <Route path="/documentos" element={<Navigate to="/consultorias" replace />} />

          {/* Módulo de Configurações e Perfil */}
          <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/consultorias" replace />} />
          <Route path="*" element={<Navigate to="/consultorias" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
