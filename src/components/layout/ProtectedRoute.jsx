// ============================================================
// src/components/layout/ProtectedRoute.jsx
// Redireciona para /login se o usuário não estiver autenticado.
// Exibe um spinner enquanto o Firebase verifica a sessão.
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Aguarda o Firebase confirmar (ou não) a sessão salva
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Sem sessão → redireciona para login
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
