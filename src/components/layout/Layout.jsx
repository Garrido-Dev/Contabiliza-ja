// ============================================================
// src/components/layout/Layout.jsx
// Shell da aplicação autenticada.
// Desktop: Sidebar fixa à esquerda
// Mobile:  Bottom navigation
// ============================================================

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import imglogo from '../../assets/logo.contabilizaJa-branco.png'

// ── Ícones SVG inline ──────────────────────────────────────
const IconConsultorias = () => (
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
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconDocuments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
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

const NAV_ITEMS = [
  { to: '/consultorias', label: 'Consultorias', Icon: IconConsultorias },
  { to: '/financeiro',   label: 'Financeiro',   Icon: IconFinanceiro   },
  { to: '/clientes',     label: 'Clientes',     Icon: IconClientes     },
  { to: '/documentos',   label: 'Documentos',   Icon: IconDocuments    },
  { to: '/obrigacoes',   label: 'Obrigações',   Icon: IconCalendar     },
];

const MGMT_ITEMS = [
  { to: '/configuracoes', label: 'Configurações', Icon: IconSettings, badge: 'Free' },
];

const MOBILE_NAV = [
  { to: '/consultorias', label: 'Consultorias', Icon: IconConsultorias },
  { to: '/financeiro',   label: 'Financeiro',   Icon: IconFinanceiro   },
  { to: '/clientes',     label: 'Clientes',     Icon: IconClientes     },
  { to: '/documentos',   label: 'Documentos',   Icon: IconDocuments    },
  { to: '/obrigacoes',   label: 'Agenda',        Icon: IconCalendar     },
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ padding: '18px 16px', textAlign: 'center' }}>
          <div style={{
            // background: '#ffffff',
            // borderRadius: '12px',
            // padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            marginBottom: '10px'
          }}>
            <img
              src={imglogo}
              alt="Contabiliza Já"
              style={{ width: '135px', height: 'auto', display: 'block' }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.3px' }}>
            Gestão de Consultorias
          </span>
        </div>

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
          <p className="nav-label" style={{ marginTop: 20 }}>Gestão</p>
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
                }}>Plano Free</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Dados do usuário logado */}
        <div className="sidebar-footer">
          <div className="user-card">
            {user?.photoURL && (
              <img src={user.photoURL} alt="Avatar" className="user-avatar" referrerPolicy="no-referrer" />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName ?? 'Usuário'}
              </div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-icon"
              title="Sair"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Top Bar (mobile) ────────────────────────────────── */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={imglogo} alt="Contabiliza Já" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Contabiliza Já
          </span>
        </div>
        {user?.photoURL && (
          <img src={user.photoURL} alt="Avatar" className="user-avatar" style={{ width: 30, height: 30 }} referrerPolicy="no-referrer" />
        )}
      </header>

      {/* ── Conteúdo principal ─────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>

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
