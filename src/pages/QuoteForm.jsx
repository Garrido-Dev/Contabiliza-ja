// ============================================================
// src/pages/QuoteForm.jsx
// Formulário detalhado para criar/editar consultorias.
// Rota: /consultorias/nova
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import WhatsAppPreview from '../components/WhatsAppPreview';

// ── Tipos de serviço predefinidos ──────────────────────────
const SERVICE_TYPES = [
  'Declaração de Imposto de Renda (IRPF)',
  'BPO Financeiro',
  'Abertura de Empresa',
  'Encerramento de Empresa',
  'Consultoria Tributária',
  'Planejamento Tributário',
  'Auditoria Contábil',
  'Contabilidade Mensal (MEI)',
  'Contabilidade Mensal (Simples Nacional)',
  'Contabilidade Mensal (Lucro Presumido)',
  'Regularização Fiscal',
  'Recuperação de Créditos Tributários',
  'Assessoria Trabalhista',
  'Folha de Pagamento',
  'Outros',
];

const PAYMENT_TERMS = [
  'À vista',
  '50% entrada + 50% na entrega',
  '30 dias',
  '30/60 dias',
  'Mensal (recorrente)',
  'Negociar',
];

// Formata valor BRL
function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Item vazio padrão
const EMPTY_ITEM = { description: '', qty: 1, unitPrice: '' };

export default function QuoteForm() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // ── Estado do formulário ───────────────────────────────────
  const [form, setForm] = useState({
    clientId:     location.state?.clientId || '',
    clientName:   location.state?.clientName || '',
    whatsapp:     location.state?.whatsapp || '',
    type:         '',
    description:  '',
    deadline:     '',
    paymentTerms: '',
    internalNotes: '',
  });
  const [items,    setItems]    = useState([{ ...EMPTY_ITEM }]);
  const [clients,  setClients]  = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');
  const [created,  setCreated]  = useState(null); // quote salvo com sucesso

  // Carrega lista de clientes do usuário
  useEffect(() => {
    async function loadClients() {
      if (!user) return;
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(data);
    }
    loadClients();
  }, [user]);

  // ── Handlers ──────────────────────────────────────────────
  function handleField(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  // Ao selecionar cliente, preenche whatsapp automaticamente
  function handleClientSelect(e) {
    const clientId = e.target.value;
    if (clientId === '__manual__') {
      setForm(p => ({ ...p, clientId: '', clientName: '', whatsapp: '' }));
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(p => ({
        ...p,
        clientId: client.id,
        clientName: client.name,
        whatsapp: client.whatsapp ?? '',
      }));
    }
  }

  // ── Itens ─────────────────────────────────────────────────
  function handleItem(index, field, value) {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }
  function addItem() {
    setItems(p => [...p, { ...EMPTY_ITEM }]);
  }
  function removeItem(index) {
    setItems(p => p.filter((_, i) => i !== index));
  }

  const totalValue = items.reduce((acc, it) => {
    return acc + (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 0);
  }, 0);

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validação mínima
    if (!form.clientName.trim()) { setError('Informe o nome do cliente.'); return; }
    if (!form.whatsapp.trim())   { setError('Informe o WhatsApp do cliente.'); return; }
    if (!form.type)              { setError('Selecione o tipo de serviço.'); return; }
    if (items.some(it => !it.description.trim())) {
      setError('Preencha a descrição de todos os itens.'); return;
    }

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'quotes'), {
        userId:        user.uid,
        clientId:      form.clientId || null,
        clientName:    form.clientName.trim(),
        whatsapp:      form.whatsapp.replace(/\D/g, ''),
        type:          form.type,
        description:   form.description.trim(),
        items:         items.map(it => ({
          description: it.description.trim(),
          qty:         parseInt(it.qty) || 1,
          unitPrice:   parseFloat(it.unitPrice) || 0,
        })),
        totalValue,
        deadline:      form.deadline || null,
        paymentTerms:  form.paymentTerms || null,
        internalNotes: form.internalNotes.trim() || null,
        status:        'pendente',
        paymentStatus: 'pendente',
        createdAt:     serverTimestamp(),
      });

      // Monta objeto para exibir preview e PDF
      setCreated({
        id:           docRef.id,
        clientName:   form.clientName.trim(),
        whatsapp:     form.whatsapp.replace(/\D/g, ''),
        type:         form.type,
        description:  form.description.trim(),
        items:        items,
        totalValue,
        deadline:     form.deadline,
        paymentTerms: form.paymentTerms,
        status:       'pendente',
        createdAt:    null,
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Se já criou → mostra preview ──────────────────────────
  if (created) {
    return (
      <Layout>
        <div className="page-header">
          <div className="header-row">
            <div>
              <h2>✅ Orçamento Criado</h2>
              <p>Escolha as próximas ações abaixo</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/consultorias')}
            >
              Ver lista
            </button>
          </div>
        </div>

        <WhatsAppPreview quote={created} />

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setCreated(null); setForm({ clientId:'',clientName:'',whatsapp:'',type:'',description:'',deadline:'',paymentTerms:'',internalNotes:'' }); setItems([{...EMPTY_ITEM}]); }}
          >
            + Novo Orçamento
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/consultorias')}
          >
            Ver Todas as Consultorias
          </button>
        </div>
      </Layout>
    );
  }

  // ── Formulário ─────────────────────────────────────────────
  return (
    <Layout>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>Nova Consultoria</h2>
            <p>Preencha os dados do orçamento</p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/consultorias')}>
            Cancelar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Seção: Cliente ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            👤 Dados do Cliente
          </h3>
          <div className="form-grid">
            {/* Dropdown de clientes cadastrados */}
            <div className="form-group">
              <label className="form-label">Selecionar Cliente Cadastrado</label>
              <select onChange={handleClientSelect} defaultValue="">
                <option value="">— Digitar manualmente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nome do Cliente *</label>
              <input
                name="clientName" value={form.clientName}
                onChange={handleField} placeholder="Nome completo"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp (com DDD) *</label>
              <input
                name="whatsapp" value={form.whatsapp}
                onChange={handleField} placeholder="11 98765-4321"
                type="tel" required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Serviço *</label>
              <select name="type" value={form.type} onChange={handleField} required>
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group form-full">
              <label className="form-label">Descrição / Escopo do Serviço</label>
              <textarea
                name="description" value={form.description}
                onChange={handleField}
                placeholder="Descreva em detalhes o que será entregue ao cliente..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ── Seção: Itens ────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Itens do Orçamento
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
              + Adicionar Item
            </button>
          </div>

          {/* Cabeçalho da tabela — só desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px 36px', gap: 8, marginBottom: 8 }}
               className="items-header">
            <span className="form-label">Descrição</span>
            <span className="form-label" style={{ textAlign: 'center' }}>Qtd</span>
            <span className="form-label" style={{ textAlign: 'right' }}>Valor Unit. (R$)</span>
            <span />
          </div>

          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px 36px', gap: 8, marginBottom: 8 }}
            >
              <input
                placeholder={`Item ${i + 1}`}
                value={item.description}
                onChange={e => handleItem(i, 'description', e.target.value)}
                required
              />
              <input
                type="number" min="1" value={item.qty}
                onChange={e => handleItem(i, 'qty', e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <input
                type="number" min="0" step="0.01"
                placeholder="0,00" value={item.unitPrice}
                onChange={e => handleItem(i, 'unitPrice', e.target.value)}
                style={{ textAlign: 'right' }}
              />
              <button
                type="button"
                className="btn btn-danger btn-icon"
                onClick={() => items.length > 1 && removeItem(i)}
                disabled={items.length === 1}
                title="Remover item"
                style={{ fontSize: 16, padding: '8px' }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 12, marginTop: 16, paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>Total:</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)', letterSpacing: '-0.5px' }}>
              {fmt(totalValue)}
            </span>
          </div>
        </div>

        {/* ── Seção: Condições ────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Condições e Prazo
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Prazo de Entrega</label>
              <input
                name="deadline" type="date" value={form.deadline}
                onChange={handleField}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Condições de Pagamento</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleField}>
                <option value="">Selecione...</option>
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group form-full">
              <label className="form-label">Observações Internas</label>
              <textarea
                name="internalNotes" value={form.internalNotes}
                onChange={handleField}
                placeholder="Anotações internas (não aparecem no PDF nem no WhatsApp)..."
                rows={2}
              />
              <span className="form-hint">⚠️ Este campo é privado e não é enviado ao cliente.</span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-subtle)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            color: 'var(--red)', fontSize: 14, marginBottom: 16,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 180 }}
          >
            {submitting ? '⏳ Salvando...' : '✨ Gerar Orçamento'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/consultorias')}>
            Cancelar
          </button>
        </div>
      </form>
    </Layout>
  );
}
