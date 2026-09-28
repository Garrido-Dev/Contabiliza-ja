// ============================================================
// src/pages/Financial.jsx
// Dashboard Financeiro Executivo & Analítico
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(val) {
  const d = parseDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const DONUT_COLORS = [
  '#2f7cf6', // Azul
  '#22c55e', // Verde
  '#f59e0b', // Amarelo
  '#a78bfa', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#f97316', // Laranja
  '#64748b'  // Slate
];

export default function Financial() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Período
  const [periodPreset, setPeriodPreset] = useState('all'); // 'this_month' | 'last_3_months' | 'this_year' | 'all' | 'custom_month'
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Filtros da Tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pago' | 'pendente' | 'parcial'
  const [clientFilter, setClientFilter] = useState(null); // Para filtrar ao clicar no Top Client
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Hover state do gráfico
  const [hoveredMonth, setHoveredMonth] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'quotes'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordena por data decrescente
        data.sort((a, b) => {
          const tA = parseDate(a.createdAt)?.getTime() || 0;
          const tB = parseDate(b.createdAt)?.getTime() || 0;
          return tB - tA;
        });
        setQuotes(data);
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
      alert('Erro ao atualizar status de pagamento.');
    }
  }

  // Meses únicos disponíveis nos registros
  const availableMonths = useMemo(() => {
    const set = new Set();
    quotes.forEach(q => {
      const d = parseDate(q.createdAt);
      if (d) set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [quotes]);

  // Filtragem dos quotes pelo período selecionado
  const filteredQuotesByPeriod = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return quotes.filter(q => {
      const d = parseDate(q.createdAt);
      if (!d) return periodPreset === 'all';

      const qYear = d.getFullYear();
      const qMonthStr = `${qYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (periodPreset === 'this_month') {
        return qMonthStr === currentMonthStr;
      }
      if (periodPreset === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 2);
        threeMonthsAgo.setDate(1);
        return d >= threeMonthsAgo && d <= now;
      }
      if (periodPreset === 'this_year') {
        return qYear === currentYear;
      }
      if (periodPreset === 'custom_month') {
        return selectedMonth === 'all' || qMonthStr === selectedMonth;
      }
      return true; // 'all'
    });
  }, [quotes, periodPreset, selectedMonth]);

  // ── 1. KPI Cards Expandidos ─────────────────────────────────
  const { totalRecebido, totalPendente, totalGeral, ticketMedio, taxaInadimplencia, previsaoMes } = useMemo(() => {
    let rec = 0;
    let pend = 0;
    let total = 0;
    let countPagos = 0;

    filteredQuotesByPeriod.forEach(q => {
      const val = Number(q.totalValue || 0);
      total += val;
      if (q.paymentStatus === 'pago') {
        rec += val;
        countPagos += 1;
      } else {
        pend += val;
      }
    });

    const tMedio = countPagos > 0 ? rec / countPagos : (total / (filteredQuotesByPeriod.length || 1));
    const taxaInad = total > 0 ? (pend / total) * 100 : 0;

    // Previsão do Mês Atual (soma de recebidos + a receber com data no mês corrente)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMes = quotes
      .filter(q => {
        const d = parseDate(q.createdAt);
        return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
      })
      .reduce((acc, q) => acc + (Number(q.totalValue) || 0), 0);

    return {
      totalRecebido: rec,
      totalPendente: pend,
      totalGeral: total,
      ticketMedio: tMedio,
      taxaInadimplencia: taxaInad,
      previsaoMes: prevMes,
    };
  }, [filteredQuotesByPeriod, quotes]);

  // ── 2. Evolução Mensal (Receita x A Receber) ────────────────
  const monthlySeries = useMemo(() => {
    const map = {};
    quotes.forEach(q => {
      const d = parseDate(q.createdAt);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const label = `${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}/${String(d.getFullYear()).slice(2)}`;
      const val = Number(q.totalValue || 0);

      if (!map[key]) {
        map[key] = { key, label, paid: 0, pending: 0, total: 0 };
      }
      if (q.paymentStatus === 'pago') {
        map[key].paid += val;
      } else {
        map[key].pending += val;
      }
      map[key].total += val;
    });

    // Pega os últimos 6 ou 12 meses ordenados
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-8);
  }, [quotes]);

  const maxBarValue = useMemo(() => {
    return Math.max(...monthlySeries.map(m => Math.max(m.paid, m.pending, m.total)), 1);
  }, [monthlySeries]);

  // ── 3. Top Clientes (LTV - Lifetime Value) ──────────────────
  const topClients = useMemo(() => {
    const map = {};
    filteredQuotesByPeriod.forEach(q => {
      const name = q.clientName?.trim() || 'Cliente Não Identificado';
      const val = Number(q.totalValue || 0);
      if (!map[name]) {
        map[name] = { name, total: 0, count: 0, paid: 0 };
      }
      map[name].total += val;
      map[name].count += 1;
      if (q.paymentStatus === 'pago') map[name].paid += val;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredQuotesByPeriod]);

  // ── 4. Distribuição por Tipos de Serviço (Donut Chart) ──────
  const serviceDistribution = useMemo(() => {
    const map = {};
    let total = 0;
    filteredQuotesByPeriod.forEach(q => {
      const type = q.type || 'Outros';
      const val = Number(q.totalValue || 0);
      total += val;
      map[type] = (map[type] || 0) + val;
    });

    const list = Object.entries(map).map(([type, value], idx) => ({
      type,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      color: DONUT_COLORS[idx % DONUT_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return { list, total };
  }, [filteredQuotesByPeriod]);

  // ── 5. Filtragem e Paginação da Tabela de Lançamentos ────────
  const filteredTableData = useMemo(() => {
    return filteredQuotesByPeriod.filter(q => {
      if (clientFilter && q.clientName?.trim() !== clientFilter) return false;
      if (statusFilter !== 'all' && (q.paymentStatus || 'pendente') !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const cMatch = q.clientName?.toLowerCase().includes(term);
        const tMatch = q.type?.toLowerCase().includes(term);
        return cMatch || tMatch;
      }
      return true;
    });
  }, [filteredQuotesByPeriod, clientFilter, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTableData, currentPage]);

  // ── 6. Lembrete / Cobrança no WhatsApp ───────────────────────
  function handleWhatsAppReminder(q) {
    const rawPhone = (q.whatsapp || '').replace(/\D/g, '');
    if (!rawPhone) {
      alert('Telefone ou WhatsApp deste cliente não foi informado no cadastro.');
      return;
    }
    const phone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const msg = `Olá, ${q.clientName}! Tudo bem? Passando para lembrar sobre a consultoria de *${q.type || 'Serviços Contábeis'}*, no valor de *${fmt(q.totalValue)}*. Caso já tenha efetuado o pagamento, por favor desconsidere este aviso. Conte sempre conosco!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // ── 7. Exportação de Relatório CSV ───────────────────────────
  function exportCSV() {
    if (filteredTableData.length === 0) {
      alert('Nenhum dado para exportar no período selecionado.');
      return;
    }

    const headers = ['Data', 'Cliente', 'WhatsApp', 'Servico', 'Valor', 'Status_Pagamento'];
    const rows = filteredTableData.map(q => [
      formatDate(q.createdAt),
      `"${(q.clientName || '').replace(/"/g, '""')}"`,
      `"${q.whatsapp || ''}"`,
      `"${(q.type || '').replace(/"/g, '""')}"`,
      Number(q.totalValue || 0).toFixed(2),
      q.paymentStatus || 'pendente'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatMonthLabel(m) {
    if (m === 'all') return 'Todos os períodos';
    const [year, month] = m.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  return (
    <Layout>
      {/* Cabeçalho & Filtro de Período Superior */}
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>💰 Dashboard Financeiro & Lucratividade</h2>
            <p>Controle estratégico de receitas, fluxo de recebimentos e rentabilidade por serviço.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={exportCSV}
              title="Baixar planilha CSV com lançamentos do período"
              style={{ borderColor: 'var(--border-light)' }}
            >
              📥 Exportar CSV
            </button>

            {/* Seletor Rápido de Período */}
            <div className="filter-tabs">
              <button
                type="button"
                className={`filter-tab ${periodPreset === 'this_month' ? 'active' : ''}`}
                onClick={() => setPeriodPreset('this_month')}
              >
                Este Mês
              </button>
              <button
                type="button"
                className={`filter-tab ${periodPreset === 'last_3_months' ? 'active' : ''}`}
                onClick={() => setPeriodPreset('last_3_months')}
              >
                Últimos 3 Meses
              </button>
              <button
                type="button"
                className={`filter-tab ${periodPreset === 'this_year' ? 'active' : ''}`}
                onClick={() => setPeriodPreset('this_year')}
              >
                {new Date().getFullYear()}
              </button>
              <button
                type="button"
                className={`filter-tab ${periodPreset === 'all' ? 'active' : ''}`}
                onClick={() => setPeriodPreset('all')}
              >
                Todos
              </button>
            </div>

            {/* Mês Específico Opcional */}
            <select
              value={periodPreset === 'custom_month' ? selectedMonth : ''}
              onChange={e => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setPeriodPreset('custom_month');
                }
              }}
              style={{ width: 'auto', minWidth: 150, padding: '7px 12px', fontSize: 13 }}
            >
              <option value="" disabled={periodPreset === 'custom_month'}>Mês específico...</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Carregando dados financeiros...</p>
        </div>
      ) : (
        <>
          {/* ── 1. KPI Cards Expandidos ── */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-label">Total Recebido</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>
                {fmt(totalRecebido)}
              </div>
              <div className="stat-sub">
                {totalGeral > 0 ? `${((totalRecebido / totalGeral) * 100).toFixed(0)}% do faturamento total` : '0%'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">A Receber / Pendente</div>
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>
                {fmt(totalPendente)}
              </div>
              <div className="stat-sub">
                Aguardando quitação
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Ticket Médio</div>
              <div className="stat-value" style={{ color: 'var(--blue)' }}>
                {fmt(ticketMedio)}
              </div>
              <div className="stat-sub">
                Por consultoria faturada
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Taxa de Pendência</div>
              <div className="stat-value" style={{ color: taxaInadimplencia > 30 ? 'var(--red)' : 'var(--text)' }}>
                {taxaInadimplencia.toFixed(1)}%
              </div>
              <div className="stat-sub">
                {100 - taxaInadimplencia > 0 ? `${(100 - taxaInadimplencia).toFixed(1)}% taxa de recebimento` : '0%'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Previsão do Mês Atual</div>
              <div className="stat-value" style={{ color: '#38bdf8' }}>
                {fmt(previsaoMes)}
              </div>
              <div className="stat-sub">
                Mês de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
              </div>
            </div>
          </div>

          {/* ── 2 & 4. Grid de Gráficos (Evolução Mensal + Donut por Serviço) ── */}
          <div className="dash-grid-2">
            {/* Gráfico 1: Evolução Mensal (Barras Duplas: Recebido x Pendente) */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    📈 Evolução Mensal (Receita x A Receber)
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    Comparativo entre valores quitados e valores pendentes
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--green)' }} /> Recebido
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--yellow)' }} /> Pendente
                  </div>
                </div>
              </div>

              {monthlySeries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-3)' }}>
                  Nenhum dado mensal disponível no período.
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Container de Barras */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 16,
                    height: 220,
                    paddingBottom: 32,
                    borderBottom: '1px solid var(--border)',
                    overflowX: 'auto',
                    paddingTop: 15
                  }}>
                    {monthlySeries.map((m, idx) => {
                      const paidHeight = Math.max(Math.round((m.paid / maxBarValue) * 100), m.paid > 0 ? 6 : 0);
                      const pendingHeight = Math.max(Math.round((m.pending / maxBarValue) * 100), m.pending > 0 ? 6 : 0);
                      const isHovered = hoveredMonth === idx;

                      return (
                        <div
                          key={m.key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            minWidth: 54,
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={() => setHoveredMonth(idx)}
                          onMouseLeave={() => setHoveredMonth(null)}
                        >
                          {/* Tooltip Hover */}
                          {isHovered && (
                            <div style={{
                              position: 'absolute',
                              bottom: `calc(${Math.max(paidHeight, pendingHeight)}% + 40px)`,
                              background: '#090b10',
                              border: '1px solid var(--border-light)',
                              boxShadow: 'var(--shadow-lg)',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 11,
                              whiteSpace: 'nowrap',
                              zIndex: 20,
                              pointerEvents: 'none',
                              textAlign: 'left'
                            }}>
                              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{m.label}</div>
                              <div style={{ color: 'var(--green)', display: 'flex', gap: 6 }}>
                                <span>Recebido:</span> <strong>{fmt(m.paid)}</strong>
                              </div>
                              <div style={{ color: 'var(--yellow)', display: 'flex', gap: 6 }}>
                                <span>Pendente:</span> <strong>{fmt(m.pending)}</strong>
                              </div>
                              <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                                Total: {fmt(m.total)}
                              </div>
                            </div>
                          )}

                          {/* Barras Duplas (Verde / Amarela) */}
                          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: '100%' }}>
                            {/* Barra Recebido */}
                            <div
                              style={{
                                width: 16,
                                height: `${paidHeight}%`,
                                background: 'linear-gradient(180deg, var(--green), #15803d)',
                                borderRadius: '3px 3px 0 0',
                                transition: 'height 0.3s ease, filter 0.2s',
                                filter: isHovered ? 'brightness(1.2)' : 'none'
                              }}
                              title={`Recebido: ${fmt(m.paid)}`}
                            />
                            {/* Barra Pendente */}
                            <div
                              style={{
                                width: 16,
                                height: `${pendingHeight}%`,
                                background: 'linear-gradient(180deg, var(--yellow), #b45309)',
                                borderRadius: '3px 3px 0 0',
                                transition: 'height 0.3s ease, filter 0.2s',
                                filter: isHovered ? 'brightness(1.2)' : 'none'
                              }}
                              title={`Pendente: ${fmt(m.pending)}`}
                            />
                          </div>

                          {/* Label do Mês Abaixo */}
                          <span style={{
                            position: 'absolute',
                            bottom: 6,
                            fontSize: 11,
                            fontWeight: isHovered ? 700 : 500,
                            color: isHovered ? 'var(--text)' : 'var(--text-3)',
                            whiteSpace: 'nowrap'
                          }}>
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico 2: Donut Chart (Distribuição por Tipo de Serviço) */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                🍩 Faturamento por Serviço
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, marginBottom: 16 }}>
                Representatividade dos principais serviços prestados
              </p>

              {serviceDistribution.list.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-3)' }}>
                  Nenhum serviço registrado.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: 160, height: 160 }}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {(() => {
                        let accumulatedPercent = 0;
                        const radius = 60;
                        const circumference = 2 * Math.PI * radius; // ~376.99

                        return serviceDistribution.list.map((item, idx) => {
                          const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                          accumulatedPercent += item.percent;

                          return (
                            <circle
                              key={item.type + idx}
                              cx="80"
                              cy="80"
                              r={radius}
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="20"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              transform="rotate(-90 80 80)"
                              style={{ transition: 'stroke-dasharray 0.5s ease' }}
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* Texto Central do Donut */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Total
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                        {fmt(serviceDistribution.total)}
                      </span>
                    </div>
                  </div>

                  {/* Legenda do Donut */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    width: '100%',
                    marginTop: 18,
                    maxHeight: 140,
                    overflowY: 'auto'
                  }}>
                    {serviceDistribution.list.slice(0, 5).map(item => (
                      <div
                        key={item.type}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: item.color,
                            flexShrink: 0
                          }} />
                          <span style={{
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 160
                          }}>
                            {item.type}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                            {fmt(item.value)}
                          </span>
                          <span style={{ color: 'var(--text-3)', width: 38, textAlign: 'right' }}>
                            {item.percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Top Clientes (LTV) & Filtro Ativo ── */}
          <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  🏆 Top 5 Clientes por Faturamento (LTV)
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  Clientes mais lucrativos no período selecionado. Clique em qualquer um para filtrar a tabela abaixo.
                </p>
              </div>

              {clientFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-andamento" style={{ fontSize: 12 }}>
                    Filtrado por: {clientFilter}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setClientFilter(null)}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    ✕ Limpar Filtro
                  </button>
                </div>
              )}
            </div>

            {topClients.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Nenhum faturamento registrado.</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}>
                {topClients.map((c, index) => {
                  const medals = ['🥇', '🥈', '🥉', '4º', '5º'];
                  const isSelected = clientFilter === c.name;

                  return (
                    <div
                      key={c.name}
                      onClick={() => setClientFilter(isSelected ? null : c.name)}
                      style={{
                        background: isSelected ? 'var(--blue-subtle)' : 'var(--bg-3)',
                        border: isSelected ? '1px solid var(--blue)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'transform 0.15s, border-color 0.15s'
                      }}
                      title="Clique para filtrar apenas os lançamentos deste cliente"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14 }}>{medals[index]}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {c.count} serviço(s)
                        </span>
                      </div>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                        {fmt(c.total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 5. Tabela Principal de Lançamentos Recentes com Filtros & Ações ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Barra de Ferramentas da Tabela */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: 'var(--bg-2)'
            }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  📋 Lançamentos e Cobranças ({filteredTableData.length})
                </h3>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Busca */}
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente ou serviço..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: 220, padding: '7px 12px', fontSize: 13 }}
                />

                {/* Filtro de Status */}
                <select
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: 140, padding: '7px 12px', fontSize: 13 }}
                >
                  <option value="all">Todos os Status</option>
                  <option value="pago">Quitados (Pago)</option>
                  <option value="pendente">Pendentes</option>
                  <option value="parcial">Parciais</option>
                </select>
              </div>
            </div>

            {/* Tabela de Dados */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Valor</th>
                    <th>Status Pagamento</th>
                    <th style={{ textAlign: 'right' }}>Ações / Cobrança</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(q => {
                    const isPending = q.paymentStatus === 'pendente' || !q.paymentStatus;

                    return (
                      <tr key={q.id}>
                        <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                          {formatDate(q.createdAt)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{q.clientName}</div>
                          {q.whatsapp && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.whatsapp}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>{q.type || 'Consultoria'}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                          {fmt(q.totalValue)}
                        </td>
                        <td>
                          <select
                            value={q.paymentStatus || 'pendente'}
                            onChange={e => updatePaymentStatus(q.id, e.target.value)}
                            style={{
                              padding: '5px 10px',
                              width: 'auto',
                              fontSize: 12,
                              fontWeight: 600,
                              borderColor: q.paymentStatus === 'pago' ? 'var(--green)' : 'var(--border)'
                            }}
                          >
                            <option value="pendente">⏳ Pendente</option>
                            <option value="parcial">🔄 Parcial</option>
                            <option value="pago">✅ Pago</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            {isPending && q.whatsapp && (
                              <button
                                type="button"
                                className="btn btn-whatsapp btn-sm"
                                onClick={() => handleWhatsAppReminder(q)}
                                title="Enviar lembrete de cobrança no WhatsApp deste cliente"
                                style={{ padding: '5px 10px', fontSize: 12 }}
                              >
                                💬 Cobrar no WhatsApp
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-state" style={{ padding: '40px 20px' }}>
                        Nenhum registro encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-2)',
                fontSize: 13,
                color: 'var(--text-2)'
              }}>
                <div>
                  Mostrando página {currentPage} de {totalPages} ({filteredTableData.length} registros)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  >
                    ◀ Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  >
                    Próximo ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
