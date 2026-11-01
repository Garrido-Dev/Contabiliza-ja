// ============================================================
// src/pages/QuoteList.jsx
// Lista de consultorias/orçamentos.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { migrateLegacyQuotes } from '../services/publicQuotes';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function QuoteList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [migrationError, setMigrationError] = useState('');

  async function fetchQuotes() {
    if (!user) return;
    setLoading(true);
    setMigrationError('');
    try {
      const q = query(
        collection(db, 'quotes'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setQuotes(data);

      try {
        const migratedQuotes = await migrateLegacyQuotes(data, user.uid);
        setQuotes(migratedQuotes);
      } catch (migrationErr) {
        console.error('Não foi possível migrar os links antigos para a coleção pública.', migrationErr);
        setMigrationError('Não foi possível preparar os links públicos. Confira as regras do Firestore e tente novamente.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  const filteredQuotes = quotes.filter(q => {
    if (filter === 'todos') return true;
    return q.status === filter;
  });

  async function updateStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, 'quotes', id), { status: newStatus });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    }
  }

  async function handleDeleteQuote(id, clientName) {
    const confirmMsg = `Deseja realmente excluir o orçamento de "${clientName || 'Cliente'}"?\n\nEsta ação apagará o orçamento e não poderá ser desfeita.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const quote = quotes.find(item => item.id === id);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'quotes', id));

      if (quote?.shareId) {
        batch.delete(doc(db, 'publicQuotes', quote.shareId));
        batch.delete(doc(db, 'quoteShares', quote.shareId));
      }

      await batch.commit();
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir orçamento. Verifique sua conexão e tente novamente.');
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>📋 Consultorias</h2>
            <p>Gerencie seus orçamentos e serviços em andamento.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/consultorias/nova')}>
            + Nova Consultoria
          </button>
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 24 }}>
        {['todos', 'pendente', 'em_andamento', 'concluido'].map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'todos' ? 'Todas' : f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {migrationError && (
        <div role="alert" className="card" style={{ marginBottom: 20, color: 'var(--red)' }}>
          <p>{migrationError}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchQuotes}>
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <p>Carregando...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma consultoria encontrada.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map(q => (
                  <tr key={q.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{q.clientName}</div>
                      <div style={{ fontSize: 12 }}>{q.whatsapp}</div>
                    </td>
                    <td>{q.type}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(q.totalValue)}</td>
                    <td>
                      <select
                        value={q.status}
                        onChange={e => updateStatus(q.id, e.target.value)}
                        style={{ padding: '4px 8px', width: 'auto' }}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/orcamento/${q.shareId || q.id}`)}
                          title="Ver proposta do orçamento"
                        >
                          👁️ Ver
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteQuote(q.id, q.clientName)}
                          title="Excluir este orçamento"
                          style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.25)' }}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
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
