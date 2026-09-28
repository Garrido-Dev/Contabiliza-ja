// ============================================================
// src/components/layout/Layout.jsx
// Shell da aplicação autenticada.
// Desktop: Sidebar fixa à esquerda
// Mobile:  Bottom navigation
// ============================================================

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

const NAV_ITEMS = [
  { to: '/consultorias', label: 'Consultorias', Icon: IconConsultorias },
  { to: '/financeiro',   label: 'Financeiro',   Icon: IconFinanceiro   },
  { to: '/clientes',     label: 'Clientes',     Icon: IconClientes     },
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
        <div className="sidebar-logo">
          <h1>📊 Contabiliza Já</h1>
          <span>Gestão de Consultorias</span>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Menu</p>
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

      {/* ── Conteúdo principal ─────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Bottom Nav (mobile) ────────────────────────────── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
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
