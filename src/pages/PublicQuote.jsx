// ============================================================
// src/pages/PublicQuote.jsx
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateQuotePDF } from '../services/pdfGenerator';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PublicQuote() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const snap = await getDoc(doc(db, 'quotes', id));
        if (snap.exists()) setQuote({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Carregando orçamento...</div>;
  if (!quote) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>Orçamento não encontrado.</div>;

  return (
    <div style={{ minHeight: '100vh', padding: 20, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, color: 'var(--text)' }}>Contabiliza Já</h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Proposta de Prestação de Serviços</p>
          
          <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 24 }}>
            <p><strong>Cliente:</strong> {quote.clientName}</p>
            <p><strong>Serviço:</strong> {quote.type}</p>
            <p><strong>Data:</strong> {quote.createdAt ? new Date(quote.createdAt.toDate()).toLocaleDateString() : '—'}</p>
          </div>

          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Descrição</th>
                <th style={{ textAlign: 'right' }}>Qtd</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(quote.items || []).map((it, i) => (
                <tr key={i}>
                  <td>{it.description}</td>
                  <td style={{ textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(it.unitPrice * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--border)', marginBottom: 24 }}>
            <span style={{ fontSize: 18, color: 'var(--text-2)' }}>Total:</span>
            <span style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--blue)' }}>{fmt(quote.totalValue)}</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`https://api.whatsapp.com/send?phone=55${quote.whatsapp}&text=${encodeURIComponent(`Olá! Aprovo o orçamento referente a ${quote.type}.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-whatsapp btn-full"
            >
              Aprovar via WhatsApp
            </a>
            <button className="btn btn-ghost btn-full" onClick={() => generateQuotePDF(quote, null)}>
              Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
