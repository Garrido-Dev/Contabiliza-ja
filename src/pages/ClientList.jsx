// ============================================================
// src/pages/ClientList.jsx
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

export default function ClientList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'clients'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => a.name.localeCompare(b.name));
        setClients(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [user]);

  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>👥 Clientes</h2>
            <p>Gerencie sua carteira de clientes.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>
            + Novo Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Carregando...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente cadastrado.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                    <td>{c.document || '—'}</td>
                    <td>
                      <div>{c.whatsapp || '—'}</div>
                      <div style={{ fontSize: 12 }}>{c.email || ''}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
