// ============================================================
// src/components/PublicQuote.jsx
// Rota: /orcamento/:id
// Página pública exibida para o cliente final.
// NÃO exige autenticação — qualquer pessoa com o link pode acessar.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: '500px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.07)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
  },
  companyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  companyName: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '18px',
    margin: '0 0 3px',
    letterSpacing: '-0.3px',
  },
  companyTagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    margin: 0,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },
  greeting: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 6px',
    letterSpacing: '-0.4px',
  },
  greetingSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    margin: '0 0 28px',
  },
  itemCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '16px',
  },
  itemLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  },
  itemValue: {
    color: '#ffffff',
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  totalSection: {
    background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.2))',
    border: '1px solid rgba(108,99,255,0.3)',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    fontWeight: '600',
  },
  totalValue: {
    color: '#a78bfa',
    fontSize: '26px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  approveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #25D366, #128C7E)',
    border: 'none',
    borderRadius: '14px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s, transform 0.15s',
    boxSizing: 'border-box',
    letterSpacing: '0.3px',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
  },
  spinner: {
    width: '44px',
    height: '44px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #a78bfa',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 0.8s linear infinite',
  },
  errorWrap: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
  },
  errorTitle: {
    color: '#f87171',
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  errorText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '12px',
  },
};

function getStatusStyle(status) {
  const map = {
    pendente: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', icon: '⏳' },
    aprovado: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', icon: '✅' },
    recusado: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', icon: '❌' },
  };
  return map[status] || map['pendente'];
}

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(timestamp) {
  if (!timestamp) return 'Data indisponível';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function PublicQuote() {
  const { id } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('ID do orçamento inválido.');
      setLoading(false);
      return;
    }

    async function fetchQuote() {
      try {
        const docRef = doc(db, 'quotes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setQuote({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Orçamento não encontrado. Verifique o link e tente novamente.');
        }
      } catch (err) {
        console.error('Erro ao buscar orçamento:', err);
        setError('Erro ao carregar o orçamento. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [id]);

  // Monta a mensagem estruturada de aprovação para enviar à empresa
  function buildApprovalUrl() {
    if (!quote) return '#';

    // Trata número do WhatsApp garantindo DDI correto
    let phone = (quote.whatsapp || quote.companyWhatsapp || '').replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = `55${phone}`;
    }

    // Suporte tanto para quote.description/value quanto quote.type/totalValue
    const serviceType = quote.type || quote.description || 'Serviço Prestado';
    const totalVal = formatCurrency(quote.totalValue ?? quote.value);
    const shortId = id.substring(0, 8).toUpperCase();

    const message =
      `Olá! Sou *${quote.clientName || 'Cliente'}* e gostaria de *APROVAR* o orçamento Nº *#${shortId}*.\n\n` +
      `📋 *Serviço:* ${serviceType}\n` +
      `💰 *Valor Total:* ${totalVal}\n\n` +
      `Podemos dar início aos trabalhos? 👍`;

    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: '60px 40px' }}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Carregando seu orçamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.errorWrap}>
              <span style={styles.errorIcon}>🔍</span>
              <h2 style={styles.errorTitle}>Ops! Algo deu errado</h2>
              <p style={styles.errorText}>{error}</p>
            </div>
          </div>
          <p style={styles.footer}>Contabiliza Já • Gerador de Orçamentos</p>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(quote.status);
  const displayDescription = quote.description || quote.type || 'Serviço Solicitado';
  const displayValue = quote.totalValue ?? quote.value;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          {/* Cabeçalho */}
          <div style={styles.companyHeader}>
            <div style={styles.logoCircle}>📊</div>
            <div>
              <p style={styles.companyName}>Contabiliza Já</p>
              <p style={styles.companyTagline}>Gerador de Orçamentos Profissionais</p>
            </div>
          </div>

          {/* Badge */}
          <div style={{
            ...styles.statusBadge,
            background: statusStyle.bg,
            color: statusStyle.color,
            border: statusStyle.border,
          }}>
            {statusStyle.icon} {quote.status || 'Pendente'}
          </div>

          {/* Saudação */}
          <h1 style={styles.greeting}>Olá, {quote.clientName || 'Cliente'}! 👋</h1>
          <p style={styles.greetingSubtitle}>
            Orçamento gerado em {formatDate(quote.createdAt)}
          </p>

          {/* Descrição */}
          <div style={styles.itemCard}>
            <span style={styles.itemLabel}>📋 Descrição do Serviço</span>
            <p style={{ ...styles.itemValue, margin: 0 }}>{displayDescription}</p>
          </div>

          {/* Total */}
          <div style={styles.totalSection}>
            <span style={styles.totalLabel}>💰 Valor Total</span>
            <span style={styles.totalValue}>{formatCurrency(displayValue)}</span>
          </div>

          {/* Botão de aprovação */}
          <a
            href={buildApprovalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.approveBtn}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Aprovar Orçamento no WhatsApp
          </a>
        </div>

        {/* Rodapé */}
        <p style={styles.footer}>
          Orçamento #{id ? id.substring(0, 8).toUpperCase() : ''} • Contabiliza Já
        </p>
      </div>
    </div>
  );
}