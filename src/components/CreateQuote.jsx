// ============================================================
// src/components/CreateQuote.jsx
// Rota: /
// Formulário para criar um novo orçamento e gerar link WhatsApp.
// ============================================================

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useClientContext } from '../context/ClientContext';

// Estilos inline modernos para o componente
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: '560px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 6px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.55)',
    margin: 0,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '36px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    letterSpacing: '0.3px',
    marginTop: '8px',
  },
  successCard: {
    marginTop: '24px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    borderRadius: '16px',
    padding: '24px',
  },
  successTitle: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: '16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  linkBox: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    wordBreak: 'break-all',
    marginBottom: '16px',
    fontFamily: 'monospace',
  },
  whatsappBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #25D366, #128C7E)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s, transform 0.15s',
    boxSizing: 'border-box',
  },
  errorMsg: {
    color: '#f87171',
    fontSize: '14px',
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(248, 113, 113, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(248, 113, 113, 0.3)',
  },
  newQuoteBtn: {
    width: '100%',
    marginTop: '12px',
    padding: '12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s',
  },
};

// Formata o número de telefone para o padrão wa.me (apenas dígitos)
function formatPhoneForWhatsApp(phone) {
  return phone.replace(/\D/g, '');
}

// Formata o valor como moeda brasileira
function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CreateQuote() {
  // Estado do formulário
  const [form, setForm] = useState({
    clientName: '',
    whatsapp: '',
    description: '',
    value: '',
  });

  // Estado de submissão e dados do orçamento criado
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [formError, setFormError] = useState('');

  // Acessa o contexto global para adicionar o orçamento à lista
  const { addQuote } = useClientContext();

  // Atualiza o campo no estado do formulário
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validação básica dos campos
    if (!form.clientName.trim() || !form.whatsapp.trim() || !form.description.trim() || !form.value) {
      setFormError('Por favor, preencha todos os campos antes de continuar.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Salva o documento na coleção 'quotes' do Firestore
      const docRef = await addDoc(collection(db, 'quotes'), {
        clientName: form.clientName.trim(),
        whatsapp: formatPhoneForWhatsApp(form.whatsapp),
        description: form.description.trim(),
        value: parseFloat(form.value),
        status: 'pendente',             // Status inicial do orçamento
        createdAt: serverTimestamp(),   // Timestamp do servidor Firebase
      });

      // 2. Gera a URL pública do orçamento com o ID gerado pelo Firestore
      const publicUrl = `${window.location.origin}/orcamento/${docRef.id}`;

      // 3. Monta a mensagem para o WhatsApp
      const message =
        `Olá, ${form.clientName.trim()}! 👋\n\n` +
        `Segue seu orçamento gerado pelo *Contabiliza Já*:\n\n` +
        `📋 *Serviço:* ${form.description.trim()}\n` +
        `💰 *Valor:* ${formatCurrency(form.value)}\n\n` +
        `Acesse e aprove seu orçamento pelo link:\n${publicUrl}\n\n` +
        `Aguardo seu retorno! 😊`;

      // 4. Codifica a mensagem para uso na URL do WhatsApp
      const whatsappUrl = `https://wa.me/55${formatPhoneForWhatsApp(form.whatsapp)}?text=${encodeURIComponent(message)}`;

      const newQuote = {
        id: docRef.id,
        ...form,
        publicUrl,
        whatsappUrl,
        status: 'pendente',
      };

      // Adiciona ao contexto global
      addQuote(newQuote);
      // Salva localmente para exibir o resultado
      setCreatedQuote(newQuote);
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      setFormError('Erro ao salvar o orçamento. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reseta o formulário para criar um novo orçamento
  const handleNewQuote = () => {
    setCreatedQuote(null);
    setForm({ clientName: '', whatsapp: '', description: '', value: '' });
    setFormError('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Cabeçalho com logo e título */}
        <div style={styles.header}>
          <div style={styles.logo}>📊</div>
          <h1 style={styles.title}>Contabiliza Já</h1>
          <p style={styles.subtitle}>Gerador de Orçamentos para WhatsApp</p>
        </div>

        <div style={styles.card}>
          {/* Formulário de criação de orçamento */}
          {!createdQuote ? (
            <form onSubmit={handleSubmit} noValidate>
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="clientName">Nome do Cliente</label>
                <input
                  id="clientName"
                  name="clientName"
                  type="text"
                  placeholder="Ex: João Silva"
                  value={form.clientName}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="whatsapp">WhatsApp (com DDD)</label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  placeholder="Ex: 11987654321"
                  value={form.whatsapp}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="description">Descrição do Serviço</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Ex: Consultoria fiscal mensal, incluindo declaração do IRPF..."
                  value={form.description}
                  onChange={handleChange}
                  style={styles.textarea}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="value">Valor (R$)</label>
                <input
                  id="value"
                  name="value"
                  type="number"
                  placeholder="Ex: 350.00"
                  value={form.value}
                  onChange={handleChange}
                  style={styles.input}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Exibe erro de validação ou de envio */}
              {formError && <p style={styles.errorMsg}>⚠️ {formError}</p>}

              <button
                type="submit"
                style={styles.submitBtn}
                disabled={submitting}
                onMouseOver={(e) => (e.target.style.opacity = '0.85')}
                onMouseOut={(e) => (e.target.style.opacity = '1')}
              >
                {submitting ? '⏳ Gerando orçamento...' : '✨ Gerar Orçamento'}
              </button>
            </form>
          ) : (
            // Seção de sucesso exibida após criação do orçamento
            <div>
              <div style={styles.successCard}>
                <div style={styles.successTitle}>
                  ✅ Orçamento criado com sucesso!
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '12px' }}>
                  Link público do orçamento:
                </p>
                {/* Exibe a URL pública gerada */}
                <div style={styles.linkBox}>{createdQuote.publicUrl}</div>

                {/* Botão para abrir o WhatsApp com a mensagem pré-preenchida */}
                <a
                  href={createdQuote.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.whatsappBtn}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {/* Ícone WhatsApp SVG */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Enviar via WhatsApp
                </a>
              </div>

              {/* Botão para criar um novo orçamento */}
              <button
                style={styles.newQuoteBtn}
                onClick={handleNewQuote}
                onMouseOver={(e) => { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseOut={(e) => { e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              >
                + Criar Novo Orçamento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
