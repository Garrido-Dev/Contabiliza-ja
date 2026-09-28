// ============================================================
// src/components/WhatsAppPreview.jsx
// Box com prévia editável da mensagem para WhatsApp.
// Inclui botão de confirmar (abre wa.me) e geração de PDF.
// ============================================================

import { useState } from 'react';
import { generateQuotePDF } from '../services/pdfGenerator';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Monta a mensagem padrão baseada no orçamento
function buildMessage(quote) {
  const origin = window.location.origin;
  const publicUrl = `${origin}/orcamento/${quote.id}`;

  const itemsText = (quote.items ?? [])
    .map(it => `  • ${it.description} (${it.qty}x ${fmt(it.unitPrice)})`)
    .join('\n');

  return (
    `Olá, *${quote.clientName || 'cliente'}*! 👋\n\n` +
    `Segue o orçamento referente ao serviço:\n` +
    `📋 *${quote.type || 'Consultoria'}*\n\n` +
    `*Itens:*\n${itemsText}\n\n` +
    `💰 *Total: ${fmt(quote.totalValue)}*\n` +
    (quote.paymentTerms ? `💳 Pagamento: ${quote.paymentTerms}\n` : '') +
    (quote.deadline ? `📅 Prazo: ${new Date(quote.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}\n` : '') +
    `\nAcesse e aprove seu orçamento:\n${publicUrl}\n\n` +
    `Qualquer dúvida, estou à disposição! 😊`
  );
}

export default function WhatsAppPreview({ quote, client }) {
  const [message, setMessage] = useState(() => buildMessage(quote));
  const [sent, setSent]       = useState(false);

  function handleConfirm() {
    // 1. Limpa o número mantendo apenas os dígitos
    let rawPhone = (quote.whatsapp || client?.whatsapp || '').replace(/\D/g, '');

    // 2. Garante o DDI (55) se o usuário digitou apenas DDD + número (10 ou 11 dígitos)
    if (rawPhone.length === 10 || rawPhone.length === 11) {
      rawPhone = `55${rawPhone}`;
    }

    // 3. Monta a URL dinamicamente no momento do clique com o estado atual da mensagem
    const encodedText = encodeURIComponent(message);
    const targetUrl = rawPhone 
      ? `https://wa.me/${rawPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    // 4. Abre a aba
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setSent(true);
  }

  function handleGeneratePDF() {
    generateQuotePDF(quote, client ?? null);
  }

  return (
    <div>
      {/* Preview WhatsApp */}
      <div className="wa-preview" style={{ marginBottom: 16 }}>
        <div className="wa-preview-header" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#4ade80">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Prévia da Mensagem — edite antes de enviar
        </div>

        {/* Textarea editável */}
        <textarea
          className="wa-bubble"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={12}
          style={{ width: '100%', marginTop: 8 }}
        />
        <p style={{ fontSize: 11, color: 'rgba(74,222,128,0.7)', marginTop: 8 }}>
          ✏️ Você pode editar a mensagem acima antes de confirmar o envio.
        </p>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          className="btn btn-whatsapp"
          onClick={handleConfirm}
          style={{ flex: '1 1 180px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: 6 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          {sent ? 'Enviar Novamente' : 'Confirmar e Enviar via WhatsApp'}
        </button>

        <button
          className="btn btn-ghost"
          onClick={handleGeneratePDF}
          style={{ flex: '1 1 140px' }}
        >
          📄 Baixar PDF
        </button>
      </div>

      {sent && (
        <p style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>
          ✅ WhatsApp aberto com a mensagem enviada.
        </p>
      )}
    </div>
  );
}