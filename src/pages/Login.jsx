// ============================================================
// src/pages/Login.jsx
// Tela de login com Google — design corporativo sério.
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Se já está autenticado, redireciona direto para consultorias
  useEffect(() => {
    if (!loading && user) navigate('/consultorias', { replace: true });
  }, [user, loading, navigate]);

  async function handleGoogleLogin() {
    try {
      await signInWithGoogle();
      navigate('/consultorias');
    } catch (err) {
      console.error('Erro no login:', err);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>📊</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Contabiliza Já
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>
            Gestão de Consultorias Contábeis
          </p>
        </div>

        {/* Card de login */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
            Acesse sua conta
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '28px' }}>
            Use sua conta Google para entrar no sistema.
          </p>

          <button
            onClick={handleGoogleLogin}
            className="btn btn-full"
            style={{
              background: '#fff',
              color: '#1a1a1a',
              fontWeight: '600',
              fontSize: '15px',
              padding: '13px',
              gap: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Logo Google SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.5-3-11.3-7.4l-6.6 5.1C9.8 39.8 16.4 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Entrar com Google
          </button>

          <hr className="divider" />
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Apenas usuários autorizados têm acesso ao sistema.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-3)' }}>
          © {new Date().getFullYear()} Contabiliza Já
        </p>
      </div>
    </div>
  );
}
