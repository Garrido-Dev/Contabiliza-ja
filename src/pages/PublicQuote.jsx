// ============================================================
// src/pages/PublicQuote.jsx
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateQuotePDF } from '../services/pdfGenerator';
import imglogo from "../assets/logo.contabilizaJa-branco.png"


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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              background: '#ffffff',
              padding: '10px 14px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              flexShrink: 0
            }}>
              <img
                src={imglogo}
                alt="Contabiliza Já"
                style={{ width: '105px', height: 'auto', display: 'block' }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text)', fontWeight: 800 }}>Contabiliza Já</h1>
              <p style={{ color: 'var(--text-2)', margin: '4px 0 0 0', fontSize: 13 }}>Proposta de Prestação de Serviços Contábeis</p>
            </div>
          </div>
          
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
