// ============================================================
// src/pages/QuoteList.jsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function QuoteList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'quotes'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordenação local para contornar a necessidade de índice composto
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setQuotes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  async function updateStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, 'quotes', id), { status: newStatus });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteQuote(id, clientName) {
    const confirmed = window.confirm(`Deseja realmente excluir o orçamento de "${clientName}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'quotes', id));
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Erro ao excluir orçamento:', err);
      alert('Não foi possível excluir o orçamento. Tente novamente.');
    }
  }

  const filteredQuotes = filter === 'todos' 
    ? quotes 
    : quotes.filter(q => q.status === filter);

  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>📋 Propostas & Orçamentos</h2>
            <p>Gerencie seus orçamentos, propostas e serviços em andamento.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/consultorias/nova')}>
            + Nova Proposta
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

      {loading ? (
        <div className="empty-state">
          <p>Carregando propostas...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma proposta encontrada.</p>
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
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{q.whatsapp}</div>
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
                          onClick={() => navigate(`/orcamento/${q.id}`)}
                          title="Ver proposta do cliente"
                        >
                          👁️ Ver
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/consultorias/${q.id}/editar`)}
                          title="Editar este orçamento"
                        >
                          ✏️ Editar
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
