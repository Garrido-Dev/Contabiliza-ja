// ============================================================
// src/pages/Login.jsx
// Autenticação completa: Login e Cadastro da Empresa ou Profissional
// Suporte a E-mail/Senha com perfil inicial + Google OAuth
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import imglogo from '../assets/logo.contabilizaJa-branco.png';

// Máscaras de entrada amigáveis
function formatPhone(v) {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCnpjCpf(v) {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Formulário de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Formulário de Cadastro
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    officeName: '',
    cnpj: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Se já autenticado, redireciona para consultorias
  useEffect(() => {
    if (!loading && user) {
      navigate('/consultorias', { replace: true });
    }
  }, [user, loading, navigate]);

  function handleSignupChange(e) {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'phone') formattedValue = formatPhone(value);
    if (name === 'cnpj') formattedValue = formatCnpjCpf(value);
    setSignupForm(prev => ({ ...prev, [name]: formattedValue }));
  }

  function parseAuthError(err) {
    console.error('Erro de autenticação:', err);
    const code = err?.code || '';
    if (code.includes('email-already-in-use')) {
      return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar".';
    }
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (code.includes('weak-password')) {
      return 'A senha deve possuir pelo menos 6 caracteres.';
    }
    if (code.includes('invalid-email')) {
      return 'Por favor, informe um endereço de e-mail válido.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'A janela de autenticação do Google foi fechada.';
    }
    return err?.message || 'Ocorreu um erro ao processar. Tente novamente.';
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    if (!loginEmail.trim() || !loginPassword) {
      setError('Informe seu e-mail e senha para entrar.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      navigate('/consultorias');
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');

    if (!signupForm.email.trim() || !signupForm.password) {
      setError('E-mail e senha são obrigatórios para criar sua conta.');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await signUpWithEmail(signupForm.email, signupForm.password, {
        fullName: signupForm.fullName,
        officeName: signupForm.officeName,
        cnpj: signupForm.cnpj,
        phone: signupForm.phone,
        email: signupForm.email,
      });
      navigate('/consultorias');
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/consultorias');
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: mode === 'signup' ? '540px' : '420px', transition: 'max-width 0.2s' }}>
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <img
              src={imglogo}
              alt="Contabiliza Já"
              style={{
                maxWidth: '210px',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
            Gestão Estratégica de Serviços, Consultorias & Propostas
          </p>
        </div>

        {/* Card Principal */}
        <div className="card" style={{ padding: mode === 'signup' ? '30px 28px' : '28px 24px' }}>
          {/* Abas Alternadoras */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-3)',
              borderRadius: 'var(--radius)',
              padding: '4px',
              marginBottom: '24px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '8px',
                background: mode === 'login' ? 'var(--blue)' : 'transparent',
                color: mode === 'login' ? '#fff' : 'var(--text-2)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '8px',
                background: mode === 'signup' ? 'var(--blue)' : 'transparent',
                color: mode === 'signup' ? '#fff' : 'var(--text-2)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Criar Cadastro
            </button>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div
              style={{
                background: 'var(--red-subtle)',
                color: 'var(--red)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                fontSize: '13px',
                marginBottom: '18px',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          {/* ── MODO LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Sua senha de acesso"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-full"
                style={{ marginTop: '8px', padding: '12px' }}
              >
                {submitting ? 'Entrando...' : 'Entrar no Sistema'}
              </button>
            </form>
          )}

          {/* ── MODO CADASTRO (CRIAR CONTA) ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                  Cadastro da Empresa ou Profissional
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 14px' }}>
                  Preencha seus dados para começar a emitir orçamentos e propostas comerciais personalizadas.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                  Nome do Responsável / Profissional
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Ex: Carlos Silva, Dra. Juliana Mendes..."
                  value={signupForm.fullName}
                  onChange={handleSignupChange}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                  Nome da Empresa / Escritório / Razão Social
                </label>
                <input
                  type="text"
                  name="officeName"
                  placeholder="Ex: Silva Consultoria, Mendes Advocacia, Alpha Soluções..."
                  value={signupForm.officeName}
                  onChange={handleSignupChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={signupForm.cnpj}
                    onChange={handleSignupChange}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="(11) 99999-9999"
                    value={signupForm.phone}
                    onChange={handleSignupChange}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="contato@empresa.com.br"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  autoComplete="email"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                    Senha *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Mín. 6 caracteres"
                    value={signupForm.password}
                    onChange={handleSignupChange}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="Repita a senha"
                    value={signupForm.confirmPassword}
                    onChange={handleSignupChange}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, marginTop: '2px' }}>
                💡 Você poderá adicionar logotipo, registro profissional de classe (OAB, CRC, CREA, CRA, etc.) e endereço completo na tela de <strong>Configurações</strong> a qualquer momento.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-full"
                style={{ marginTop: '6px', padding: '12px' }}
              >
                {submitting ? 'Criando conta...' : 'Cadastrar e Acessar'}
              </button>
            </form>
          )}

          {/* Divisor */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0 16px',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>ou continue com</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={submitting}
            className="btn btn-full"
            style={{
              background: '#fff',
              color: '#1a1a1a',
              fontWeight: '600',
              fontSize: '14px',
              padding: '11px',
              gap: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20H24v8h11.3C33.6 33 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.5-3-11.3-7.4l-6.6 5.1C9.8 39.8 16.4 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"
              />
            </svg>
            {mode === 'login' ? 'Entrar com Google' : 'Criar conta com Google'}
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '22px',
            fontSize: '12px',
            color: 'var(--text-3)',
          }}
        >
          © {new Date().getFullYear()} Contabiliza Já — Plataforma de Gestão de Propostas e Serviços
        </p>
      </div>
    </div>
  );
}
