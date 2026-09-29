// ============================================================
// src/App.jsx
// ============================================================

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login from './pages/Login';
import QuoteList from './pages/QuoteList';
import QuoteForm from './pages/QuoteForm';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import Financial from './pages/Financial';
import Documents from './pages/Documents';
import Obligations from './pages/Obligations';
import PublicQuote from './pages/PublicQuote';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/orcamento/:id" element={<PublicQuote />} />
          
          <Route path="/consultorias" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
          <Route path="/consultorias/nova" element={<ProtectedRoute><QuoteForm /></ProtectedRoute>} />
          
          <Route path="/clientes" element={<ProtectedRoute><ClientList /></ProtectedRoute>} />
          <Route path="/clientes/novo" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
          
          <Route path="/financeiro" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/obrigacoes" element={<ProtectedRoute><Obligations /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><div style={{padding:40,color:'var(--text)'}}>⚙️ Configurações — Em breve</div></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/consultorias" replace />} />
          <Route path="*" element={<Navigate to="/consultorias" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}