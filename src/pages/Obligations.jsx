// ============================================================
// src/pages/Obligations.jsx — Calendário & Obrigações Fiscais
// ============================================================

import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, updateDoc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

// ── Obrigações padrão do calendário fiscal brasileiro ──────
const FISCAL_DEFAULTS = [
  { title: 'DASN-SIMEI (MEI anual)', type: 'fiscal', recurrence: 'yearly', dayOfYear: '05-31', priority: 'high' },
  { title: 'DIRF', type: 'fiscal', recurrence: 'yearly', dayOfYear: '02-28', priority: 'high' },
  { title: 'ECF', type: 'fiscal', recurrence: 'yearly', dayOfYear: '07-31', priority: 'high' },
  { title: 'DCTF Mensal', type: 'fiscal', recurrence: 'monthly', dayOfMonth: 15, priority: 'medium' },
  { title: 'DAS Simples Nacional', type: 'fiscal', recurrence: 'monthly', dayOfMonth: 20, priority: 'high' },
  { title: 'FGTS', type: 'fiscal', recurrence: 'monthly', dayOfMonth: 7, priority: 'medium' },
  { title: 'GPS (INSS Empresa)', type: 'fiscal', recurrence: 'monthly', dayOfMonth: 20, priority: 'medium' },
];

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS_COLORS = {
  pendente: { bg: 'var(--yellow-subtle)', color: 'var(--yellow)', label: 'Pendente' },
  concluido: { bg: 'var(--green-subtle)', color: 'var(--green)', label: 'Concluído' },
  atrasado: { bg: 'var(--red-subtle)', color: 'var(--red)', label: 'Atrasado' },
};
const PRIORITY_COLORS = {
  high: { color: '#ef4444', label: 'Alta' },
  medium: { color: '#f59e0b', label: 'Média' },
  low: { color: '#22c55e', label: 'Baixa' },
};
const TYPE_EMOJIS = {
  fiscal: '📋',
  cliente: '👤',
  interno: '⚙️',
  reuniao: '🤝',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function parseDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(ts);
}
function formatDateBR(d) {
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const EMPTY_FORM = {
  title: '', type: 'fiscal', dueDate: '', priority: 'high',
  clientName: '', notes: '', status: 'pendente',
};

export default function Obligations() {
  const { user } = useAuth();
  const today = new Date();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(query(
      collection(db, 'obligations'),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc'),
    )).then(s => {
      setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  // Auto-detecta atrasados
  const eventsWithStatus = events.map(e => {
    if (e.status === 'concluido') return e;
    const due = parseDate(e.dueDate);
    if (due && due < today && !isSameDay(due, today)) {
      return { ...e, status: 'atrasado' };
    }
    return e;
  });

  // Filtragem lista
  const filteredEvents = eventsWithStatus.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterType !== 'all' && e.type !== filterType) return false;
    return true;
  });

  // Eventos do mês atual do calendário
  const eventsThisMonth = eventsWithStatus.filter(e => {
    const d = parseDate(e.dueDate);
    return d && d.getFullYear() === calYear && d.getMonth() === calMonth;
  });

  // Eventos do dia selecionado
  const dayEvents = selectedDay
    ? eventsWithStatus.filter(e => {
        const d = parseDate(e.dueDate);
        return d && isSameDay(d, selectedDay);
      })
    : [];

  // Map: dia -> eventos (para o calendário)
  const eventsMap = {};
  eventsThisMonth.forEach(e => {
    const d = parseDate(e.dueDate);
    if (!d) return;
    const key = d.getDate();
    if (!eventsMap[key]) eventsMap[key] = [];
    eventsMap[key].push(e);
  });

  // KPIs
  const totalPendente = eventsWithStatus.filter(e => e.status === 'pendente').length;
  const totalAtrasado = eventsWithStatus.filter(e => e.status === 'atrasado').length;
  const totalConcluido = eventsWithStatus.filter(e => e.status === 'concluido').length;
  const upcoming7 = eventsWithStatus.filter(e => {
    if (e.status === 'concluido') return false;
    const d = parseDate(e.dueDate);
    if (!d) return false;
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  async function saveEvent() {
    if (!form.title || !form.dueDate) return alert('Preencha o título e a data.');
    const data = {
      userId: user.uid,
      title: form.title,
      type: form.type,
      dueDate: new Date(form.dueDate + 'T12:00:00'),
      priority: form.priority,
      clientName: form.clientName,
      notes: form.notes,
      status: form.status,
      updatedAt: serverTimestamp(),
    };
    if (editId) {
      await updateDoc(doc(db, 'obligations', editId), data);
      setEvents(p => p.map(e => e.id === editId ? { ...e, ...data, dueDate: { toDate: () => new Date(form.dueDate + 'T12:00:00') } } : e));
    } else {
      data.createdAt = serverTimestamp();
      const ref2 = await addDoc(collection(db, 'obligations'), data);
      setEvents(p => [...p, { id: ref2.id, ...data, dueDate: { toDate: () => new Date(form.dueDate + 'T12:00:00') } }]);
    }
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null);
  }

  async function deleteEvent(id) {
    if (!confirm('Excluir esta obrigação?')) return;
    await deleteDoc(doc(db, 'obligations', id));
    setEvents(p => p.filter(e => e.id !== id));
  }

  async function toggleStatus(e) {
    const newStatus = e.status === 'concluido' ? 'pendente' : 'concluido';
    await updateDoc(doc(db, 'obligations', e.id), { status: newStatus });
    setEvents(p => p.map(x => x.id === e.id ? { ...x, status: newStatus } : x));
  }

  function openEdit(e) {
    const d = parseDate(e.dueDate);
    const ds = d ? d.toISOString().split('T')[0] : '';
    setForm({ title: e.title, type: e.type || 'fiscal', dueDate: ds,
      priority: e.priority || 'high', clientName: e.clientName || '',
      notes: e.notes || '', status: e.status || 'pendente' });
    setEditId(e.id);
    setShowForm(true);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // ── Render calendário ──────────────────────────────────────
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return (
    <Layout>
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
              🗓️ Obrigações & Agenda
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Calendário fiscal e prazos regulatórios</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
              {[['calendar','📅 Calendário'],['list','📋 Lista']].map(([v,l]) => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: viewMode === v ? 'var(--blue)' : 'transparent',
                    color: viewMode === v ? '#fff' : 'var(--text-2)',
                    transition: 'all 0.2s',
                  }}>{l}</button>
              ))}
            </div>
            <button className="btn btn-primary"
              onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>
              + Nova Obrigação
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Pendentes', value: totalPendente, color: 'var(--yellow)', bg: 'var(--yellow-subtle)', icon: '⏳' },
            { label: 'Atrasados', value: totalAtrasado, color: 'var(--red)', bg: 'var(--red-subtle)', icon: '🚨' },
            { label: 'Concluídos', value: totalConcluido, color: 'var(--green)', bg: 'var(--green-subtle)', icon: '✅' },
            { label: 'Próximos 7 dias', value: upcoming7, color: 'var(--blue)', bg: 'var(--blue-subtle)', icon: '📅' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: k.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Calendário ── */}
        {viewMode === 'calendar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
            <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20 }}>
              {/* Nav mês */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button className="btn btn-ghost btn-icon" onClick={prevMonth}>←</button>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  {MONTHS_FULL[calMonth]} {calYear}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={nextMonth}>→</button>
              </div>
              {/* Dias da semana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {WEEKDAYS.map(w => (
                  <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-3)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {w}
                  </div>
                ))}
              </div>
              {/* Células */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDay + 1;
                  if (dayNum < 1 || dayNum > daysInMonth) {
                    return <div key={i} style={{ aspectRatio: '1', padding: 6, borderRadius: 8 }} />;
                  }
                  const cellDate = new Date(calYear, calMonth, dayNum);
                  const isToday = isSameDay(cellDate, today);
                  const isSelected = selectedDay && isSameDay(cellDate, selectedDay);
                  const cellEvents = eventsMap[dayNum] || [];
                  const hasUrgent = cellEvents.some(e => e.status === 'atrasado' || e.priority === 'high');

                  return (
                    <div key={i}
                      onClick={() => setSelectedDay(isSameDay(cellDate, selectedDay) ? null : cellDate)}
                      style={{
                        aspectRatio: '1', padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                        background: isSelected ? 'var(--blue)' : isToday ? 'var(--blue-subtle)' : 'transparent',
                        border: isToday ? '1px solid var(--blue)' : '1px solid transparent',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}>
                      <span style={{
                        fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500,
                        color: isSelected ? '#fff' : isToday ? 'var(--blue)' : 'var(--text)',
                      }}>{dayNum}</span>
                      {cellEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {cellEvents.slice(0, 3).map((ev, idx) => (
                            <div key={idx} style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: ev.status === 'concluido' ? 'var(--green)' :
                                ev.status === 'atrasado' ? 'var(--red)' :
                                ev.priority === 'high' ? 'var(--yellow)' : 'var(--blue)',
                            }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel lateral */}
            <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20, overflowY: 'auto', maxHeight: 520 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                {selectedDay
                  ? `📅 ${selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                  : `📅 ${MONTHS_FULL[calMonth]} — ${eventsThisMonth.length} eventos`}
              </h3>
              {(selectedDay ? dayEvents : eventsThisMonth).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                  {selectedDay ? 'Nenhuma obrigação neste dia.' : 'Nenhuma obrigação este mês.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(selectedDay ? dayEvents : eventsThisMonth).map(e => (
                    <EventCard key={e.id} event={e} onEdit={openEdit} onDelete={deleteEvent} onToggle={toggleStatus} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {viewMode === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <select className="input" style={{ fontSize: 13, padding: '7px 12px' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
              </select>
              <select className="input" style={{ fontSize: 13, padding: '7px 12px' }}
                value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">Todos os tipos</option>
                <option value="fiscal">Fiscal</option>
                <option value="cliente">Cliente</option>
                <option value="interno">Interno</option>
                <option value="reuniao">Reunião</option>
              </select>
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 13, alignSelf: 'center' }}>
                {filteredEvents.length} obrigações
              </span>
            </div>
            {loading ? (
              <div className="loading-state">Carregando...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="docs-empty-state">
                <div className="empty-icon">🗓️</div>
                <h3>Nenhuma obrigação encontrada</h3>
                <p>Adicione obrigações fiscais e prazos clicando em + Nova Obrigação.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredEvents.map(e => (
                  <EventCard key={e.id} event={e} onEdit={openEdit} onDelete={deleteEvent} onToggle={toggleStatus} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Formulário ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Obrigação' : 'Nova Obrigação'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Título *</label>
                <input className="input" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: DAS Simples Nacional — Outubro" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Tipo</label>
                  <select className="input" value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="fiscal">📋 Fiscal</option>
                    <option value="cliente">👤 Cliente</option>
                    <option value="interno">⚙️ Interno</option>
                    <option value="reuniao">🤝 Reunião</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Prioridade</label>
                  <select className="input" value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="high">🔴 Alta</option>
                    <option value="medium">🟡 Média</option>
                    <option value="low">🟢 Baixa</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Data de vencimento *</label>
                  <input className="input" type="date" value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="pendente">⏳ Pendente</option>
                    <option value="concluido">✅ Concluído</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Cliente (opcional)</label>
                <input className="input" value={form.clientName}
                  onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                  placeholder="Nome do cliente relacionado" />
              </div>
              <div>
                <label className="form-label">Observações</label>
                <textarea className="input" rows={3} value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Informações adicionais..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveEvent}>
                  {editId ? 'Salvar Alterações' : 'Criar Obrigação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── EventCard ──────────────────────────────────────────────
function EventCard({ event: e, onEdit, onDelete, onToggle, compact }) {
  const status = STATUS_COLORS[e.status] || STATUS_COLORS.pendente;
  const priority = PRIORITY_COLORS[e.priority] || PRIORITY_COLORS.medium;
  const due = e.dueDate?.toDate ? e.dueDate.toDate() : (e.dueDate ? new Date(e.dueDate) : null);
  const typeEmoji = TYPE_EMOJIS[e.type] || '📋';

  return (
    <div style={{
      background: 'var(--bg-3)', borderRadius: 'var(--radius)',
      border: `1px solid ${e.status === 'atrasado' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      padding: compact ? '10px 12px' : '14px 16px',
      display: 'flex', alignItems: compact ? 'center' : 'flex-start',
      gap: 10, transition: 'border-color 0.2s',
    }}>
      {/* Checkbox / Toggle */}
      <button
        onClick={() => onToggle(e)}
        style={{
          width: 20, height: 20, borderRadius: 6, border: `2px solid ${priority.color}`,
          background: e.status === 'concluido' ? priority.color : 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', marginTop: compact ? 0 : 2,
        }}>
        {e.status === 'concluido' ? '✓' : ''}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--text)',
            textDecoration: e.status === 'concluido' ? 'line-through' : 'none',
            opacity: e.status === 'concluido' ? 0.6 : 1 }}>
            {typeEmoji} {e.title}
          </span>
          <span style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 99,
            background: status.bg, color: status.color, fontWeight: 600,
          }}>{status.label}</span>
        </div>
        {!compact && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {due && (
              <span style={{ fontSize: 12, color: e.status === 'atrasado' ? 'var(--red)' : 'var(--text-3)' }}>
                📅 {due.toLocaleDateString('pt-BR')}
              </span>
            )}
            {e.clientName && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👤 {e.clientName}</span>
            )}
            <span style={{ fontSize: 12, color: priority.color, fontWeight: 600 }}>
              ● {priority.label}
            </span>
          </div>
        )}
        {compact && due && (
          <div style={{ fontSize: 11, color: e.status === 'atrasado' ? 'var(--red)' : 'var(--text-3)', marginTop: 2 }}>
            {due.toLocaleDateString('pt-BR')}
            {e.clientName ? ` · ${e.clientName}` : ''}
          </div>
        )}
        {!compact && e.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
            {e.notes}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => onEdit(e)}
          style={{ width: 28, height: 28, fontSize: 12 }}>✏️</button>
        <button className="btn btn-ghost btn-icon" onClick={() => onDelete(e.id)}
          style={{ width: 28, height: 28, fontSize: 12 }}>🗑</button>
      </div>
    </div>
  );
}
