// ============================================================
// src/components/ClientDetailModal.jsx
// Modal de detalhes, financeiro e edição dos dados do cliente
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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

export default function ClientDetailModal({ 
  client: initialClient, 
  quotes = [], 
  initialTab = 'info', 
  startEditing = false,
  onClose,
  onClientUpdated 
}) {
  const navigate = useNavigate();
  const [client, setClient] = useState(initialClient);
  const [tab, setTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(startEditing);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Formulário de edição
  const [editForm, setEditForm] = useState({
    name: initialClient?.name || '',
    document: initialClient?.document || '',
    whatsapp: initialClient?.whatsapp || '',
    email: initialClient?.email || '',
    address: initialClient?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setClient(initialClient);
    setEditForm({
      name: initialClient?.name || '',
      document: initialClient?.document || '',
      whatsapp: initialClient?.whatsapp || '',
      email: initialClient?.email || '',
      address: initialClient?.address || '',
    });
  }, [initialClient]);

  if (!client) return null;

  // Filtra as consultorias pertencentes a este cliente
  const clientQuotes = quotes.filter(q => 
    (q.clientId && q.clientId === client.id) ||
    (q.clientName && client.name && q.clientName.trim().toLowerCase() === client.name.trim().toLowerCase())
  );

  // Cálculos financeiros
  const totalFaturado = clientQuotes.reduce((acc, q) => acc + (Number(q.totalValue) || 0), 0);
  const totalPago = clientQuotes
    .filter(q => q.paymentStatus === 'pago')
    .reduce((acc, q) => acc + (Number(q.totalValue) || 0), 0);
  const totalPendente = clientQuotes
    .filter(q => q.paymentStatus === 'pendente' || !q.paymentStatus)
    .reduce((acc, q) => acc + (Number(q.totalValue) || 0), 0);
  const ticketMedio = clientQuotes.length > 0 ? totalFaturado / clientQuotes.length : 0;

  // Agrupamento mensal para o gráfico de lucratividade / faturamento
  const monthlyDataMap = {};
  clientQuotes.forEach(q => {
    const d = parseDate(q.createdAt) || new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${String(d.getFullYear()).slice(2)}`;
    
    const val = Number(q.totalValue || 0);
    const isPaid = q.paymentStatus === 'pago';

    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = { key, label, total: 0, paid: 0, count: 0 };
    }
    monthlyDataMap[key].total += val;
    if (isPaid) monthlyDataMap[key].paid += val;
    monthlyDataMap[key].count += 1;
  });

  const monthlyList = Object.values(monthlyDataMap).sort((a, b) => a.key.localeCompare(b.key));
  const maxMonthlyVal = Math.max(...monthlyList.map(m => m.total), 1);

  // Formatação de telefone para link do WhatsApp
  const cleanPhone = (client.whatsapp || '').replace(/\D/g, '');
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone}` 
    : null;

  function handleCreateQuoteForClient() {
    navigate('/consultorias/nova', {
      state: {
        clientId: client.id,
        clientName: client.name,
        whatsapp: client.whatsapp || ''
      }
    });
  }

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSaveClient(e) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setSaveError('O nome do cliente é obrigatório.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updatedData = {
        name: editForm.name.trim(),
        document: editForm.document.trim(),
        whatsapp: editForm.whatsapp.replace(/\D/g, ''),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
      };

      await updateDoc(doc(db, 'clients', client.id), updatedData);
      
      const newClientObj = { ...client, ...updatedData };
      setClient(newClientObj);
      if (onClientUpdated) {
        onClientUpdated(newClientObj);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setSaveError('Erro ao salvar dados do cliente. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // Iniciais para o avatar
  const initials = (client.name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        {/* Topo do Modal */}
        <div className="modal-header" style={{ alignItems: 'flex-start', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(47,124,246,0.3)'
            }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 className="modal-title" style={{ fontSize: 18 }}>{client.name}</h3>
                {client.document && (
                  <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                    {client.document}
                  </span>
                )}
                {saveSuccess && (
                  <span className="badge badge-concluido">
                    ✓ Dados atualizados com sucesso!
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 2 }}>
                Cadastrado em {formatDate(client.createdAt)} • {clientQuotes.length} consultoria(s)
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEditing && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsEditing(true);
                  setTab('info');
                }}
                title="Editar dados cadastrais do cliente"
                style={{ borderColor: 'var(--border-light)', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                ✏️ Editar Dados
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-ghost btn-sm btn-icon"
              style={{ fontSize: 16, width: 32, height: 32, borderRadius: '50%' }}
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Abas (Informações / Financeiro) */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20 }}>
          <button
            type="button"
            className={`filter-tab ${tab === 'info' ? 'active' : ''}`}
            onClick={() => {
              setTab('info');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
          >
            <span>👤</span> {isEditing ? 'Editar Dados Cadastrais' : 'Informações Gerais'}
          </button>
          <button
            type="button"
            className={`filter-tab ${tab === 'financial' ? 'active' : ''}`}
            onClick={() => {
              setTab('financial');
              setIsEditing(false);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
          >
            <span>💰</span> Financeiro & Lucratividade
            {clientQuotes.length > 0 && (
              <span className="badge badge-concluido" style={{ padding: '1px 6px', fontSize: 11 }}>
                {fmt(totalFaturado)}
              </span>
            )}
          </button>
        </div>

        {/* ── ABA 1: Informações Gerais / Modo Edição ── */}
        {tab === 'info' && (
          isEditing ? (
            /* Formulário de Edição */
            <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'var(--bg-3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                  ✏️ Alterar Informações de {client.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Todos os campos são atualizados em tempo real
                </span>
              </div>

              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label">Nome Completo / Razão Social *</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleFieldChange}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF / CNPJ</label>
                  <input
                    name="document"
                    value={editForm.document}
                    onChange={handleFieldChange}
                    placeholder="000.000.000-00 ou CNPJ"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp (com DDD)</label>
                  <input
                    name="whatsapp"
                    value={editForm.whatsapp}
                    onChange={handleFieldChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleFieldChange}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço Completo</label>
                  <input
                    name="address"
                    value={editForm.address}
                    onChange={handleFieldChange}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </div>

              {saveError && (
                <div style={{ color: 'var(--red)', background: 'var(--red-subtle)', padding: 10, borderRadius: 'var(--radius)', fontSize: 13 }}>
                  ⚠️ {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                </button>
              </div>
            </form>
          ) : (
            /* Visualização das Informações */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Grid de Informações de Contato */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14
              }}>
                <div className="card card-sm" style={{ background: 'var(--bg-3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Documento (CPF / CNPJ)
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
                    {client.document || 'Não informado'}
                  </div>
                </div>

                <div className="card card-sm" style={{ background: 'var(--bg-3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    WhatsApp / Telefone
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {client.whatsapp || 'Não informado'}
                    </span>
                    {waUrl && (
                      <a 
                        href={waUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-whatsapp btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        💬 Mensagem
                      </a>
                    )}
                  </div>
                </div>

                <div className="card card-sm" style={{ background: 'var(--bg-3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    E-mail
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
                    {client.email ? (
                      <a href={`mailto:${client.email}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                        {client.email}
                      </a>
                    ) : (
                      'Não informado'
                    )}
                  </div>
                </div>

                <div className="card card-sm" style={{ background: 'var(--bg-3)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Endereço
                  </span>
                  <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>
                    {client.address || 'Não informado'}
                  </div>
                </div>
              </div>

              {/* Resumo da relação comercial */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(47,124,246,0.08), rgba(34,197,94,0.08))',
                border: '1px solid rgba(47,124,246,0.2)',
                borderRadius: 'var(--radius)',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    Histórico Financeiro Resumido
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 2 }}>
                    Faturado: <strong style={{ color: 'var(--green)' }}>{fmt(totalFaturado)}</strong> ({clientQuotes.length} consultoria(s))
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setIsEditing(true);
                    }}
                    style={{ borderColor: 'var(--border-light)' }}
                  >
                    ✏️ Editar Dados
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setTab('financial')}
                    style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}
                  >
                    Ver Relatório Financeiro Completo ➔
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── ABA 2: Financeiro & Lucratividade ── */}
        {tab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Grid de Cards de Estatísticas */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Lucro / Faturado</div>
                <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>
                  {fmt(totalFaturado)}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Total Recebido</div>
                <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>
                  {fmt(totalPago)}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">A Receber</div>
                <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 20 }}>
                  {fmt(totalPendente)}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label">Ticket Médio</div>
                <div className="stat-value" style={{ color: 'var(--text)', fontSize: 20 }}>
                  {fmt(ticketMedio)}
                </div>
              </div>
            </div>

            {/* Gráfico Mensal de Lucratividade / Faturamento */}
            <div className="card" style={{ background: 'var(--bg-3)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    📊 Evolução Mensal de Lucratividade / Receita
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Faturamento mês a mês com este cliente
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue)' }} /> Faturado
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} /> Recebido
                  </div>
                </div>
              </div>

              {monthlyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-3)' }}>
                  <p style={{ fontSize: 13 }}>Nenhuma consultoria registrada para este cliente ainda.</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Crie a primeira consultoria para começar a acompanhar o lucro!</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingTop: 20 }}>
                  {/* Container das Barras */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 16,
                    height: 180,
                    paddingBottom: 28,
                    borderBottom: '1px solid var(--border)',
                    overflowX: 'auto',
                    paddingTop: 10
                  }}>
                    {monthlyList.map((item, idx) => {
                      const barHeightPercent = Math.max(Math.round((item.total / maxMonthlyVal) * 100), 8);
                      const paidHeightPercent = item.total > 0 
                        ? Math.round((item.paid / item.total) * 100)
                        : 0;

                      const isHovered = hoveredBar === idx;

                      return (
                        <div
                          key={item.key}
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
                          onMouseEnter={() => setHoveredBar(idx)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Tooltip no Hover */}
                          {isHovered && (
                            <div style={{
                              position: 'absolute',
                              bottom: `calc(${barHeightPercent}% + 34px)`,
                              background: '#090b10',
                              border: '1px solid var(--border-light)',
                              boxShadow: 'var(--shadow)',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              whiteSpace: 'nowrap',
                              zIndex: 10,
                              pointerEvents: 'none',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                              <div style={{ color: 'var(--blue)' }}>Total: {fmt(item.total)}</div>
                              <div style={{ color: 'var(--green)' }}>Pago: {fmt(item.paid)}</div>
                              <div style={{ color: 'var(--text-3)', fontSize: 10 }}>{item.count} consultoria(s)</div>
                            </div>
                          )}

                          {/* Valor no Topo da Barra */}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: isHovered ? 'var(--blue)' : 'var(--text-2)',
                            marginBottom: 4,
                            transition: 'color 0.15s'
                          }}>
                            {item.total >= 1000 ? `R$ ${(item.total / 1000).toFixed(1)}k` : `R$ ${item.total}`}
                          </span>

                          {/* Barra Principal (Total) */}
                          <div style={{
                            width: 32,
                            height: `${barHeightPercent}%`,
                            background: isHovered 
                              ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)' 
                              : 'linear-gradient(180deg, var(--blue), var(--blue-dark))',
                            borderRadius: '4px 4px 0 0',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'height 0.3s ease, filter 0.2s',
                            boxShadow: isHovered ? '0 0 10px rgba(47,124,246,0.5)' : 'none'
                          }}>
                            {/* Barra interna correspondente ao valor já Pago */}
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${paidHeightPercent}%`,
                              background: 'linear-gradient(180deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9))',
                              borderRadius: paidHeightPercent === 100 ? '4px 4px 0 0' : 0,
                              transition: 'height 0.3s ease'
                            }} />
                          </div>

                          {/* Label do Mês Abaixo */}
                          <span style={{
                            position: 'absolute',
                            bottom: 4,
                            fontSize: 11,
                            fontWeight: isHovered ? 700 : 500,
                            color: isHovered ? 'var(--text)' : 'var(--text-3)',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Lista das Consultorias deste Cliente */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                Consultorias Realizadas ({clientQuotes.length})
              </h4>
              {clientQuotes.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Nenhum serviço registrado.</p>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-3)' }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Serviço</th>
                          <th>Valor</th>
                          <th>Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientQuotes.map(q => (
                          <tr key={q.id}>
                            <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                              {formatDate(q.createdAt)}
                            </td>
                            <td style={{ fontWeight: 600 }}>{q.type || 'Consultoria'}</td>
                            <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {fmt(q.totalValue)}
                            </td>
                            <td>
                              <span className={`badge badge-${q.paymentStatus === 'pago' ? 'pago' : q.paymentStatus === 'parcial' ? 'parcial' : 'pendente'}`}>
                                {q.paymentStatus || 'pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateQuoteForClient}
          >
            + Nova Consultoria p/ {client.name.split(' ')[0]}
          </button>
          
          <div style={{ display: 'flex', gap: 8 }}>
            {!isEditing && tab === 'info' && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Editar Dados
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
