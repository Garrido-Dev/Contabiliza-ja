// ============================================================
// src/pages/QuoteForm.jsx
// Criação e Edição completa de orçamentos e consultorias
// Suporte a rota /consultorias/nova e /consultorias/:id/editar
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import WhatsAppPreview from '../components/WhatsAppPreview';

// ── Tipos de serviço predefinidos ──────────────────────────
const SERVICE_TYPES = [
  'Consultoria Empresarial / Estratégica',
  'Assessoria Jurídica / Contratos',
  'Parecer / Consultoria Jurídica',
  'Prestação de Serviços Especializados',
  'Consultoria Financeira & BPO',
  'Abertura / Alteração de Empresa',
  'Planejamento Tributário',
  'Declaração de Imposto de Renda (IRPF)',
  'Auditoria e Compliance',
  'Contabilidade Mensal',
  'Regularização Fiscal e Cadastral',
  'Assessoria Trabalhista e Folha',
  'Serviços de Tecnologia / Marketing',
  'Outros Serviços',
];

// Prazos comuns
const DEADLINE_OPTIONS = [
  'Imediato (em até 24h)',
  '3 dias úteis',
  '5 dias úteis',
  '10 dias úteis',
  '15 dias úteis',
  '30 dias',
  'A combinar',
];

// Condições de pagamento comuns
const PAYMENT_OPTIONS = [
  'À vista (Pix com desconto)',
  'À vista (50% entrada + 50% na entrega)',
  'Parcelado em 2x sem juros',
  'Parcelado em 3x sem juros',
  'Boleto bancário (30 dias)',
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
  const { user, userProfile } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();
  const isEditing = Boolean(id);

  // ── Estado do formulário ───────────────────────────────────
  const [form, setForm] = useState({
    clientId:     location.state?.clientId || '',
    clientName:   location.state?.clientName || '',
    whatsapp:     location.state?.whatsapp || '',
    email:        location.state?.email || '',
    type:         '',
    description:  '',
    deadline:     '',
    paymentTerms: '',
    internalNotes: '',
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(isEditing);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // quote salvo com sucesso
  const [existingQuoteData, setExistingQuoteData] = useState(null);
  const [privateNoteId, setPrivateNoteId] = useState(null);

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
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(data);
    }
    loadClients();
  }, [user]);

  // Se estiver em modo de edição, carrega a proposta existente pelo ID
  useEffect(() => {
    async function loadExistingQuote() {
      if (!isEditing || !user) return;
      setLoadingQuote(true);
      setError('');
      try {
        const quoteRef = doc(db, 'quotes', id);
        const snap = await getDoc(quoteRef);

        if (!snap.exists()) {
          setError('Orçamento não encontrado.');
          setLoadingQuote(false);
          return;
        }

        const data = snap.data();
        if (data.userId !== user.uid) {
          setError('Você não tem permissão para editar este orçamento.');
          setLoadingQuote(false);
          return;
        }

        setExistingQuoteData(data);
        setForm({
          clientId:     data.clientId || '',
          clientName:   data.clientName || '',
          whatsapp:     data.whatsapp || '',
          email:        data.clientEmail || data.email || '',
          type:         data.type || '',
          description:  data.description || '',
          deadline:     data.deadline || '',
          paymentTerms: data.paymentTerms || '',
          internalNotes: '',
        });

        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }

        // Tenta carregar anotações internas privadas
        try {
          const notesQuery = query(
            collection(db, 'quotes', id, 'privateNotes'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const notesSnap = await getDocs(notesQuery);
          if (!notesSnap.empty) {
            setPrivateNoteId(notesSnap.docs[0].id);
            setForm(prev => ({ ...prev, internalNotes: notesSnap.docs[0].data().notes || '' }));
          } else {
            setPrivateNoteId(null);
          }
        } catch (e) {
          console.warn('Notas privadas não carregadas:', e);
        }
      } catch (err) {
        console.error('Erro ao carregar orçamento:', err);
        setError('Erro ao carregar os dados do orçamento para edição.');
      } finally {
        setLoadingQuote(false);
      }
    }

    loadExistingQuote();
  }, [id, isEditing, user]);

  // ── Handlers ──────────────────────────────────────────────
  function handleField(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  // Ao selecionar cliente, preenche whatsapp e e-mail automaticamente
  function handleClientSelect(e) {
    const clientId = e.target.value;
    if (clientId === '__manual__' || !clientId) {
      setForm(p => ({ ...p, clientId: '', clientName: '', whatsapp: '', email: '' }));
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(p => ({
        ...p,
        clientId: client.id,
        clientName: client.name,
        whatsapp: client.whatsapp ?? '',
        email: client.email ?? '',
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

  async function savePrivateNotes(quoteId) {
    const text = form.internalNotes.trim();
    const notesCol = collection(db, 'quotes', quoteId, 'privateNotes');

    if (!text) {
      if (!isEditing) return;
      const existing = await getDocs(query(notesCol, where('userId', '==', user.uid)));
      await Promise.all(existing.docs.map((noteDoc) => deleteDoc(noteDoc.ref)));
      setPrivateNoteId(null);
      return;
    }

    if (isEditing && privateNoteId) {
      await updateDoc(doc(db, 'quotes', quoteId, 'privateNotes', privateNoteId), {
        notes: text,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const noteRef = await addDoc(notesCol, {
      userId: user.uid,
      notes: text,
      createdAt: serverTimestamp(),
    });
    setPrivateNoteId(noteRef.id);
  }

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
      const emitterSnapshot = {
        officeName: userProfile?.officeName || '',
        fullName:   userProfile?.fullName || user?.displayName || '',
        cnpj:       userProfile?.cnpj || '',
        phone:      userProfile?.phone || '',
        email:      userProfile?.email || user?.email || '',
        roleTitle:  userProfile?.roleTitle || '',
        crc:        userProfile?.crc || '',
        address:    userProfile?.address || '',
        logoUrl:    userProfile?.logoUrl || '',
      };

      const payload = {
        userId:        user.uid,
        clientId:      form.clientId || null,
        clientName:    form.clientName.trim(),
        whatsapp:      form.whatsapp.replace(/\D/g, ''),
        clientEmail:   form.email.trim(),
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
        emitter:       emitterSnapshot,
      };

      let quoteId = id;

      if (isEditing) {
        // Atualiza a proposta existente mantendo o mesmo ID e link
        await updateDoc(doc(db, 'quotes', id), {
          ...payload,
          status: existingQuoteData?.status || 'pendente',
          paymentStatus: existingQuoteData?.paymentStatus || 'pendente',
          updatedAt: serverTimestamp(),
        });

        await savePrivateNotes(id);
      } else {
        // Cria uma nova proposta
        const docRef = await addDoc(collection(db, 'quotes'), {
          ...payload,
          status:        'pendente',
          paymentStatus: 'pendente',
          createdAt:     serverTimestamp(),
        });
        quoteId = docRef.id;

        await savePrivateNotes(docRef.id);
      }

      // Monta objeto para exibir preview, WhatsApp e E-mail
      setCreated({
        id:           quoteId,
        clientName:   form.clientName.trim(),
        whatsapp:     form.whatsapp.replace(/\D/g, ''),
        clientEmail:  form.email.trim(),
        type:         form.type,
        description:  form.description.trim(),
        items:        items,
        totalValue,
        deadline:     form.deadline,
        paymentTerms: form.paymentTerms,
        status:       existingQuoteData?.status || 'pendente',
        emitter:      emitterSnapshot,
        createdAt:    existingQuoteData?.createdAt || null,
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Carregando em modo de edição ──────────────────────────
  if (loadingQuote) {
    return (
      <Layout>
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <p>Carregando dados da proposta para edição...</p>
        </div>
      </Layout>
    );
  }

  // ── Se já criou ou editou → mostra preview e central de envio ─────────
  if (created) {
    return (
      <Layout>
        <div className="page-header">
          <div className="header-row">
            <div>
              <h2>{isEditing ? '✅ Orçamento Atualizado com Sucesso' : '✅ Orçamento Criado com Sucesso'}</h2>
              <p>O link e histórico foram preservados. Escolha o canal de envio abaixo:</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/consultorias')}
            >
              ← Voltar para Propostas
            </button>
          </div>
        </div>

        <WhatsAppPreview quote={created} />

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/consultorias')}
          >
            Ver Todas as Propostas
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setCreated(null);
              if (isEditing) {
                // Se estava editando e quer continuar editando
              } else {
                setForm({
                  clientId: '', clientName: '', whatsapp: '', email: '',
                  type: '', description: '', deadline: '', paymentTerms: '', internalNotes: '',
                });
                setItems([{ ...EMPTY_ITEM }]);
                setPrivateNoteId(null);
              }
            }}
          >
            {isEditing ? 'Voltar para Formulário' : '+ Novo Orçamento'}
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
            <h2>{isEditing ? '✏️ Editar Orçamento / Proposta' : 'Nova Proposta / Orçamento'}</h2>
            <p>
              {isEditing
                ? `Editando proposta #${id.substring(0, 8).toUpperCase()} — O link enviado ao cliente será mantido atualizado.`
                : 'Preencha os dados do cliente, escopo e itens do serviço.'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/consultorias')}>
            ← Voltar para Propostas
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
              <select onChange={handleClientSelect} value={form.clientId || ''}>
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
                onChange={handleField} placeholder="Nome completo da empresa ou cliente"
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
              <label className="form-label">E-mail do Cliente (Opcional - para envio de proposta)</label>
              <input
                name="email" value={form.email}
                onChange={handleField} placeholder="cliente@empresa.com.br"
                type="email"
              />
            </div>

            <div className="form-group form-full">
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

          {/* Cabeçalho da tabela — desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px 36px', gap: 8, marginBottom: 8 }}
               className="items-header">
            <span className="form-label">Descrição</span>
            <span className="form-label" style={{ textAlign: 'center' }}>Qtd</span>
            <span className="form-label" style={{ textAlign: 'right' }}>Valor Unit. (R$)</span>
            <span />
          </div>

          {/* Linhas de itens */}
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 130px 36px',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
              }}
              className="item-row"
            >
              <input
                placeholder={`Item ${i + 1}`}
                value={it.description}
                onChange={e => handleItem(i, 'description', e.target.value)}
              />
              <input
                type="number"
                min="1"
                placeholder="Qtd"
                value={it.qty}
                onChange={e => handleItem(i, 'qty', e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={it.unitPrice}
                onChange={e => handleItem(i, 'unitPrice', e.target.value)}
                style={{ textAlign: 'right' }}
              />
              <button
                type="button"
                className="btn btn-danger btn-icon"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                title="Remover item"
                style={{ height: 38, width: 36, padding: 0, justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Totalizador */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
            marginTop: 8,
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Valor Total Estimado:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>
              {fmt(totalValue)}
            </span>
          </div>
        </div>

        {/* ── Seção: Condições Comerciais ─────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            💼 Condições Comerciais
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Prazo de Entrega</label>
              <select name="deadline" value={form.deadline} onChange={handleField}>
                <option value="">Selecione ou deixe em branco...</option>
                {DEADLINE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Condição de Pagamento</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleField}>
                <option value="">Selecione ou deixe em branco...</option>
                {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Seção: Notas Privadas ───────────────────────── */}
        <div className="card" style={{ marginBottom: 24, border: '1px dashed var(--border-light)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔒 Anotações Internas Privadas
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            Estas notas nunca aparecem no PDF, no WhatsApp, nem no link público do cliente.
          </p>
          <textarea
            name="internalNotes"
            value={form.internalNotes}
            onChange={handleField}
            placeholder="Anotações internas, custos, margem ou observações da negociação..."
            rows={2}
          />
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div style={{
            background: 'var(--red-subtle)',
            color: 'var(--red)',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            marginBottom: 16,
            fontSize: 13,
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Botão de envio */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/consultorias')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 180, justifyContent: 'center' }}
          >
            {submitting
              ? 'Salvando...'
              : isEditing
                ? '💾 Salvar Alterações'
                : 'Salvar e Gerar Proposta'}
          </button>
        </div>

      </form>
    </Layout>
  );
}
