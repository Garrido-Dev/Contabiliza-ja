// ============================================================
// src/App.jsx
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

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
      <BrowserRouter>
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
          <Route path="/configuracoes" element={
            <ProtectedRoute>
              <Layout>
                <div className="page-header">
                  <div className="header-row">
                    <div>
                      <h2>⚙️ Configurações</h2>
                      <p>Preferências da conta e dados da empresa</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
                    ⚙️ Módulo de configurações da conta e dados corporativos estará disponível em breve.
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/consultorias" replace />} />
          <Route path="*" element={<Navigate to="/consultorias" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}