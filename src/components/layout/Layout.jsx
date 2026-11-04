// ============================================================
// src/components/layout/Layout.jsx
// Shell corporativo moderno da aplicação autenticada.
// Desktop: Sidebar com navegação rápida + Topbar com breadcrumb
// Mobile:  Header superior + Bottom navigation com abas
// ============================================================

import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import imglogo from '../../assets/logo.contabilizaJa-branco.png';

// ── Ícones SVG inline ──────────────────────────────────────
const IconPropostas = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconFinanceiro = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const IconClientes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const NAV_ITEMS = [
  { to: '/consultorias', label: 'Propostas',    Icon: IconPropostas },
  { to: '/financeiro',   label: 'Financeiro',   Icon: IconFinanceiro },
  { to: '/clientes',     label: 'Clientes',     Icon: IconClientes   },
  { to: '/obrigacoes',   label: 'Obrigações',   Icon: IconCalendar   },
];

const MGMT_ITEMS = [
  { to: '/configuracoes', label: 'Configurações', Icon: IconSettings, badge: 'Perfil' },
];

const MOBILE_NAV = [
  { to: '/consultorias',  label: 'Propostas',     Icon: IconPropostas  },
  { to: '/financeiro',    label: 'Financeiro',    Icon: IconFinanceiro },
  { to: '/clientes',      label: 'Clientes',      Icon: IconClientes   },
  { to: '/obrigacoes',    label: 'Agenda',        Icon: IconCalendar   },
  { to: '/configuracoes', label: 'Ajustes',       Icon: IconSettings   },
];

function getBreadcrumb(pathname) {
  if (pathname.startsWith('/consultorias/nova')) {
    return { title: 'Nova Proposta', parent: 'Propostas', parentTo: '/consultorias' };
  }
  if (pathname.includes('/editar')) {
    return { title: 'Editar Orçamento', parent: 'Propostas', parentTo: '/consultorias' };
  }
  if (pathname.startsWith('/consultorias')) {
    return { title: 'Propostas & Orçamentos', parent: null };
  }
  if (pathname.startsWith('/clientes/novo')) {
    return { title: 'Novo Cliente', parent: 'Clientes', parentTo: '/clientes' };
  }
  if (pathname.startsWith('/clientes')) {
    return { title: 'Gestão de Clientes', parent: null };
  }
  if (pathname.startsWith('/financeiro')) {
    return { title: 'Controle Financeiro', parent: null };
  }
  if (pathname.startsWith('/obrigacoes')) {
    return { title: 'Agenda & Obrigações', parent: null };
  }
  if (pathname.startsWith('/configuracoes')) {
    return { title: 'Configurações da Empresa', parent: null };
  }
  return { title: 'Painel Geral', parent: null };
}

export default function Layout({ children }) {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  const displayName = userProfile?.fullName || user?.displayName || 'Usuário';
  const officeName = userProfile?.officeName || '';
  const avatarImage = userProfile?.logoUrl || user?.photoURL;
  const initialLetter = (displayName || officeName || 'U')[0]?.toUpperCase() || 'U';
  const breadcrumb = getBreadcrumb(location.pathname);

  return (
    <div className="app-shell">
      {/* ── Sidebar Desktop ─────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <img
              src={imglogo}
              alt="Contabiliza Já"
              style={{ width: '135px', height: 'auto', display: 'block' }}
            />
          </div>
          <div style={{
            fontSize: '11px',
            color: officeName ? 'var(--blue)' : 'var(--text-3)',
            fontWeight: 600,
            textAlign: 'center',
            letterSpacing: '0.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 8px',
          }}>
            {officeName || 'Gestão de Propostas & Serviços'}
          </div>
        </div>

        {/* Botão de Ação Rápida */}
        <div style={{ padding: '14px 12px 6px' }}>
          <button
            type="button"
            className="btn btn-primary btn-full btn-sm"
            onClick={() => navigate('/consultorias/nova')}
            style={{
              padding: '9px 14px',
              fontSize: '13px',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(47, 124, 246, 0.35)',
            }}
          >
            <span style={{ fontSize: '15px' }}>+</span> Nova Proposta
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="sidebar-nav">
          <p className="nav-label">Menu Principal</p>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}

          <p className="nav-label" style={{ marginTop: 20 }}>Gestão & Empresa</p>
          {MGMT_ITEMS.map(({ to, label, Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
              {badge && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 99,
                  background: 'var(--blue-subtle)', color: 'var(--blue)',
                  letterSpacing: '0.3px',
                }}>{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Card do Usuário Logado */}
        <div className="sidebar-footer">
          <div className="user-card">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt="Avatar"
                className="user-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="user-avatar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--blue)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                {initialLetter}
              </div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              {officeName && (
                <div style={{ fontSize: '10px', color: 'var(--blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {officeName}
                </div>
              )}
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-icon"
              title="Sair da Conta"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Top Bar Mobile ─────────────────────────────────── */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={imglogo} alt="Contabiliza Já" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            {officeName || 'Contabiliza Já'}
          </span>
        </div>
        {avatarImage ? (
          <img
            src={avatarImage}
            alt="Avatar"
            className="user-avatar"
            style={{ width: 30, height: 30 }}
            referrerPolicy="no-referrer"
            onClick={() => navigate('/configuracoes')}
          />
        ) : (
          <div
            className="user-avatar"
            onClick={() => navigate('/configuracoes')}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--blue)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {initialLetter}
          </div>
        )}
      </header>

      {/* ── Wrapper Principal + Topbar do Dashboard ────────── */}
      <div className="main-wrapper">
        <header className="app-topbar">
          {/* Breadcrumb da navegação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            {breadcrumb.parent ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(breadcrumb.parentTo || '/consultorias')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-3)',
                    cursor: 'pointer', padding: 0, fontWeight: 500,
                  }}
                >
                  {breadcrumb.parent}
                </button>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>›</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{breadcrumb.title}</span>
              </>
            ) : (
              <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px' }}>
                {breadcrumb.title}
              </span>
            )}
          </div>

          {/* Ações da Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {officeName && (
              <div
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  padding: '4px 10px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                <span>{officeName}</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/configuracoes')}
              title="Configurações da Empresa"
            >
              ⚙️ Ajustes
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/consultorias/nova')}
            >
              + Nova Proposta
            </button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* ── Bottom Nav (mobile) ────────────────────────────── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {MOBILE_NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="bottom-nav-item"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </nav>
    </div>
  );
}
