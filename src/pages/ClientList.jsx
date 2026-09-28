// ============================================================
// src/pages/ClientList.jsx
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import ClientDetailModal from '../components/ClientDetailModal';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ClientList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado do Modal de Detalhes / Financeiro / Edição
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'financial'
  const [startEditing, setStartEditing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Carrega clientes
        const qClients = query(
          collection(db, 'clients'),
          where('userId', '==', user.uid)
        );
        const clientsSnap = await getDocs(qClients);
        const clientsData = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        clientsData.sort((a, b) => a.name.localeCompare(b.name));
        setClients(clientsData);

        // Carrega consultorias para cruzar financeiro e métricas
        const qQuotes = query(
          collection(db, 'quotes'),
          where('userId', '==', user.uid)
        );
        const quotesSnap = await getDocs(qQuotes);
        setQuotes(quotesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Atualiza cliente localmente quando salvo no modal
  function handleClientUpdated(updatedClient) {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c));
    setSelectedClient(updatedClient);
  }

  // Mapa de métricas financeiras por cliente para exibição rápida na tabela
  const clientFinancialMap = useMemo(() => {
    const map = {};
    quotes.forEach(q => {
      const cId = q.clientId;
      const cName = q.clientName?.trim().toLowerCase();
      const val = Number(q.totalValue || 0);

      if (cId) {
        if (!map[cId]) map[cId] = { total: 0, count: 0 };
        map[cId].total += val;
        map[cId].count += 1;
      }
      if (cName) {
        if (!map[cName]) map[cName] = { total: 0, count: 0 };
        map[cName].total += val;
        map[cName].count += 1;
      }
    });
    return map;
  }, [quotes]);

  function getClientStats(client) {
    const byId = clientFinancialMap[client.id];
    if (byId) return byId;
    const byName = client.name ? clientFinancialMap[client.name.trim().toLowerCase()] : null;
    return byName || { total: 0, count: 0 };
  }

  function handleOpenClient(client, tab = 'info', edit = false) {
    setSelectedClient(client);
    setModalTab(tab);
    setStartEditing(edit);
  }

  const filteredClients = clients.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.document?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.whatsapp?.includes(term)
    );
  });

  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>👥 Clientes</h2>
            <p>Gerencie sua carteira, consulte dados cadastrais e veja a lucratividade de cada cliente.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Barra de Busca rápida */}
      <div style={{ marginBottom: 18, maxWidth: 360 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nome, CPF/CNPJ, e-mail..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Carregando clientes e financeiro...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente cadastrado.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 14 }}
            onClick={() => navigate('/clientes/novo')}
          >
            Cadastrar Primeiro Cliente
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente encontrado para "{searchTerm}".</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Lucro / Faturado</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(c => {
                  const stats = getClientStats(c);
                  return (
                    <tr
                      key={c.id}
                      className="clickable-row"
                      onClick={() => handleOpenClient(c, 'info', false)}
                      title="Clique para ver os dados deste cliente"
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                        {stats.count > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {stats.count} consultoria(s) contratada(s)
                          </div>
                        )}
                      </td>
                      <td>{c.document || '—'}</td>
                      <td>
                        <div>{c.whatsapp || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.email || ''}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: stats.total > 0 ? 'var(--green)' : 'var(--text-3)' }}>
                          {stats.total > 0 ? fmt(stats.total) : 'R$ 0,00'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenClient(c, 'financial', false)}
                            title="Ver análise de lucratividade e gráficos"
                            style={{ borderColor: 'rgba(47,124,246,0.3)', color: 'var(--blue)' }}
                          >
                            💰 Financeiro
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenClient(c, 'info', true)}
                            title="Editar dados cadastrais deste cliente"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenClient(c, 'info', false)}
                            title="Ver dados completos do cliente"
                          >
                            👁️ Dados
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes, Financeiro e Edição do Cliente */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          quotes={quotes}
          initialTab={modalTab}
          startEditing={startEditing}
          onClose={() => {
            setSelectedClient(null);
            setStartEditing(false);
          }}
          onClientUpdated={handleClientUpdated}
        />
      )}
    </Layout>
  );
}
