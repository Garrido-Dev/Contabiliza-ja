// ============================================================
// src/pages/Financial.jsx
// Dashboard financeiro simplificado
// ============================================================

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Financial() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'quotes'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  async function updatePaymentStatus(id, status) {
    try {
      await updateDoc(doc(db, 'quotes', id), { paymentStatus: status });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, paymentStatus: status } : q));
    } catch (err) {
      console.error(err);
    }
  }

  // Calcula meses disponíveis (ex: '2023-10')
  const availableMonths = [...new Set(quotes.map(q => {
    if (!q.createdAt) return null;
    const d = q.createdAt.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).filter(Boolean))].sort().reverse();

  // Filtra as consultorias pelo mês selecionado
  const filteredQuotes = selectedMonth === 'all' 
    ? quotes 
    : quotes.filter(q => {
        if (!q.createdAt) return false;
        const d = q.createdAt.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === selectedMonth;
      });

  const totalPago = filteredQuotes.filter(q => q.paymentStatus === 'pago').reduce((a, b) => a + b.totalValue, 0);
  const totalPendente = filteredQuotes.filter(q => q.paymentStatus === 'pendente').reduce((a, b) => a + b.totalValue, 0);

  // Helper para mostrar nome do mês (ex: Outubro 2023)
  function formatMonthLabel(m) {
    if (m === 'all') return 'Todos os períodos';
    const [year, month] = m.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>💰 Financeiro</h2>
            <p>Acompanhamento de recebimentos das consultorias.</p>
          </div>
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 'auto', minWidth: 200 }}
          >
            <option value="all">Todos os períodos</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Recebido</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{fmt(totalPago)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">A Receber</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{fmt(totalPendente)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Status Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(q => (
                <tr key={q.id}>
                  <td>{q.clientName}</td>
                  <td>{q.type}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(q.totalValue)}</td>
                  <td>
                    <select
                      value={q.paymentStatus || 'pendente'}
                      onChange={e => updatePaymentStatus(q.id, e.target.value)}
                      style={{ padding: '4px 8px', width: 'auto' }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="parcial">Parcial</option>
                      <option value="pago">Pago</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr><td colSpan="4" className="empty-state">Nenhum registro para o período selecionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
