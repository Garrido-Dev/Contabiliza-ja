// ============================================================
// src/components/WhatsAppPreview.jsx
// Central de Envio e Compartilhamento de Propostas
// Suporte a: WhatsApp, E-mail (Gmail / Outlook / Mailto),
//            Compartilhamento Nativo com PDF (Web Share) e Download
// ============================================================

import { useState } from 'react';
import { generateQuotePDF, getQuotePDFBlob } from '../services/pdfGenerator';
import { useAuth } from '../context/AuthContext';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Monta mensagem para WhatsApp
function buildWhatsAppMessage(quote, emitter) {
  const origin = window.location.origin;
  const publicUrl = `${origin}/orcamento/${quote.id}`;

  const itemsText = (quote.items ?? [])
    .map(it => `  • ${it.description} (${it.qty}x ${fmt(it.unitPrice)})`)
    .join('\n');

  const greeting = emitter?.officeName
    ? `Olá, *${quote.clientName || 'cliente'}*! 👋\nAqui é da equipe *${emitter.officeName}*.\n\n`
    : `Olá, *${quote.clientName || 'cliente'}*! 👋\n\n`;

  return (
    greeting +
    `Segue o orçamento referente ao serviço:\n` +
    `📋 *${quote.type || 'Prestação de Serviços'}*\n\n` +
    `*Itens da Proposta:*\n${itemsText}\n\n` +
    `💰 *Valor Total: ${fmt(quote.totalValue)}*\n` +
    (quote.paymentTerms ? `💳 Condições de Pagamento: ${quote.paymentTerms}\n` : '') +
    (quote.deadline ? `📅 Prazo de Entrega: ${quote.deadline}\n` : '') +
    `\n🔗 Acesse e aprove sua proposta online com 1 clique:\n${publicUrl}\n\n` +
    `Qualquer dúvida, estamos à inteira disposição! 😊`
  );
}

// Monta texto padrão para E-mail corporativo
function buildEmailBody(quote, emitter) {
  const origin = window.location.origin;
  const publicUrl = `${origin}/orcamento/${quote.id}`;

  const itemsText = (quote.items ?? [])
    .map(it => `• ${it.description} — ${it.qty} un. x ${fmt(it.unitPrice)} = ${fmt((it.qty || 1) * (it.unitPrice || 0))}`)
    .join('\n');

  const company = emitter?.officeName || 'Contabiliza Já';
  const senderName = emitter?.fullName || 'Equipe Comercial';

  return (
    `Olá, ${quote.clientName || 'Prezado(a)'}!\n\n` +
    `Esperamos que este e-mail o(a) encontre bem.\n\n` +
    `Apresentamos a nossa proposta comercial referente a: ${quote.type || 'Prestação de Serviços'}.\n\n` +
    `--------------------------------------------------\n` +
    `📋 ESCOPO E ITENS DO ORÇAMENTO:\n` +
    `--------------------------------------------------\n` +
    `${itemsText}\n\n` +
    `💰 VALOR TOTAL: ${fmt(quote.totalValue)}\n` +
    (quote.paymentTerms ? `💳 Condições de Pagamento: ${quote.paymentTerms}\n` : '') +
    (quote.deadline ? `📅 Prazo Previsto: ${quote.deadline}\n` : '') +
    `\n--------------------------------------------------\n` +
    `🔗 VISUALIZAÇÃO E APROVAÇÃO ONLINE:\n` +
    `Você pode visualizar a proposta completa e aprová-la diretamente pelo link seguro abaixo:\n` +
    `${publicUrl}\n\n` +
    `O documento em PDF também foi gerado com todos os detalhes e especificações.\n\n` +
    `Ficamos à disposição para esclarecer qualquer dúvida.\n\n` +
    `Atenciosamente,\n` +
    `${senderName}\n` +
    `${company}\n` +
    (emitter?.phone ? `WhatsApp / Tel: ${emitter.phone}\n` : '') +
    (emitter?.email ? `E-mail: ${emitter.email}\n` : '')
  );
}

export default function WhatsAppPreview({ quote, client }) {
  const { userProfile } = useAuth();
  const emitter = quote.emitter || userProfile;

  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'email' | 'link'
  const [waMessage, setWaMessage] = useState(() => buildWhatsAppMessage(quote, emitter));
  const [waSent, setWaSent]       = useState(false);

  // Estados de e-mail
  const [emailTo, setEmailTo] = useState(() => quote.clientEmail || client?.email || '');
  const [emailSubject, setEmailSubject] = useState(
    () => `Proposta Comercial #${quote.id?.substring(0, 8).toUpperCase()} - ${quote.type || 'Serviços'} | ${emitter?.officeName || 'Contabiliza Já'}`
  );
  const [emailBody, setEmailBody] = useState(() => buildEmailBody(quote, emitter));
  const [emailSent, setEmailSent] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const publicUrl = `${window.location.origin}/orcamento/${quote.id}`;

  // Envio WhatsApp
  function handleSendWhatsApp() {
    let rawPhone = (quote.whatsapp || client?.whatsapp || '').replace(/\D/g, '');
    if (rawPhone.length === 10 || rawPhone.length === 11) {
      rawPhone = `55${rawPhone}`;
    }
    const encodedText = encodeURIComponent(waMessage);
    const targetUrl = rawPhone 
      ? `https://wa.me/${rawPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setWaSent(true);
  }

  // Abrir no Gmail Web
  function handleOpenGmail() {
    const to = encodeURIComponent(emailTo.trim());
    const su = encodeURIComponent(emailSubject.trim());
    const body = encodeURIComponent(emailBody);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    setEmailSent(true);
  }

  // Abrir no Outlook / Mailto nativo
  function handleOpenMailto() {
    const to = encodeURIComponent(emailTo.trim());
    const su = encodeURIComponent(emailSubject.trim());
    const body = encodeURIComponent(emailBody);
    window.location.href = `mailto:${to}?subject=${su}&body=${body}`;
    setEmailSent(true);
  }

  // Compartilhar via Web Share API com PDF anexado
  async function handleShareWithPDF() {
    setShareFeedback('');
    try {
      const { file } = getQuotePDFBlob(quote, client ?? null, emitter);

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: emailSubject,
          text: emailBody,
          files: [file],
        });
        setShareFeedback('✅ Proposta com PDF compartilhada com sucesso!');
      } else if (navigator.share) {
        await navigator.share({
          title: emailSubject,
          text: emailBody,
          url: publicUrl,
        });
        setShareFeedback('✅ Link da proposta compartilhado!');
      } else {
        setShareFeedback('ℹ️ Seu navegador não possui compartilhador nativo de arquivos. Baixe o PDF e anexe-o ao seu e-mail.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', err);
        setShareFeedback('Erro ao abrir compartilhamento nativo.');
      }
    }
  }

  // Download do PDF
  function handleDownloadPDF() {
    generateQuotePDF(quote, client ?? null, emitter);
  }

  // Copiar link público
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Abas de Envio */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: activeTab === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-3)',
            color: activeTab === 'whatsapp' ? '#4ade80' : 'var(--text-2)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💬</span> Enviar por WhatsApp
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('email')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: activeTab === 'email' ? 'var(--blue-subtle)' : 'var(--bg-3)',
            color: activeTab === 'email' ? 'var(--blue)' : 'var(--text-2)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✉️</span> Enviar por E-mail & PDF
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('link')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: activeTab === 'link' ? 'var(--blue-subtle)' : 'var(--bg-3)',
            color: activeTab === 'link' ? 'var(--blue)' : 'var(--text-2)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📄</span> PDF & Link Online
        </button>
      </div>

      {/* ── ABA 1: WHATSAPP ── */}
      {activeTab === 'whatsapp' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              Prévia da Mensagem para WhatsApp
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Número: {quote.whatsapp || 'Não informado'}
            </span>
          </div>

          <textarea
            className="wa-bubble"
            value={waMessage}
            onChange={e => setWaMessage(e.target.value)}
            rows={11}
            style={{ width: '100%', marginBottom: '14px', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-whatsapp"
              onClick={handleSendWhatsApp}
              style={{ flex: '1 1 200px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {waSent ? 'Abrir WhatsApp Novamente' : 'Enviar Proposta via WhatsApp'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDownloadPDF}
            >
              📄 Baixar Arquivo PDF
            </button>
          </div>

          {waSent && (
            <p style={{ fontSize: '13px', color: '#4ade80', marginTop: '10px' }}>
              ✓ WhatsApp aberto com a mensagem formatada e o link da proposta.
            </p>
          )}
        </div>
      )}

      {/* ── ABA 2: E-MAIL & PDF ── */}
      {activeTab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                E-mail do Cliente
              </label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
                Assunto do E-mail
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text)' }}>
              Corpo do E-mail (Editável)
            </label>
            <textarea
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              rows={11}
              style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.5 }}
            />
          </div>

          {/* Dica de anexo */}
          <div style={{ background: 'var(--bg-3)', padding: '12px 14px', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text-2)' }}>
            💡 <strong>Envio com PDF:</strong> Utilize a opção <strong>"Compartilhar com PDF Anexado"</strong> (quando disponível no navegador) ou clique em <strong>"Baixar PDF"</strong> para anexar o arquivo ao seu e-mail. A mensagem já inclui o link seguro para aprovação online.
          </div>

          {/* Botões de Envio de E-mail */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenGmail}
              style={{ flex: '1 1 180px' }}
            >
              ✉️ Abrir no Gmail Web
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleOpenMailto}
              style={{ flex: '1 1 180px' }}
            >
              📬 Abrir no App de E-mail (Outlook / Padrão)
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleShareWithPDF}
              style={{ flex: '1 1 190px' }}
            >
              📎 Compartilhar com PDF Anexado
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDownloadPDF}
            >
              📄 Baixar PDF
            </button>
          </div>

          {emailSent && (
            <p style={{ fontSize: '13px', color: '#4ade80', margin: 0 }}>
              ✓ E-mail gerado com sucesso com as informações da proposta e o link para o cliente!
            </p>
          )}

          {shareFeedback && (
            <p style={{ fontSize: '13px', color: shareFeedback.startsWith('✅') ? '#4ade80' : 'var(--blue)', margin: 0 }}>
              {shareFeedback}
            </p>
          )}
        </div>
      )}

      {/* ── ABA 3: LINK ONLINE & DOWNLOAD DO PDF ── */}
      {activeTab === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-3)', padding: '16px', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Link de Visualização e Aprovação do Cliente
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={publicUrl}
                style={{ flex: 1, minWidth: '220px', background: 'var(--bg-2)', color: 'var(--blue)' }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCopyLink}
              >
                {copiedLink ? '✓ Copiado!' : '📋 Copiar Link'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => window.open(publicUrl, '_blank')}
              >
                👁️ Abrir Proposta
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPDF}
            >
              📄 Baixar Arquivo PDF Agora
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleShareWithPDF}
            >
              📎 Compartilhar Arquivo PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
