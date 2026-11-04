// ============================================================
// src/pages/PublicQuote.jsx
// Visualização pública e aprovação da proposta pelo cliente.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { generateQuotePDF } from '../services/pdfGenerator';
import imglogo from '../assets/logo.contabilizaJa-branco.png';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PublicQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const snap = await getDoc(doc(db, 'quotes', id));
        if (snap.exists()) {
          const rawData = snap.data();
          delete rawData.internalNotes; // Garante que notas privadas nunca fiquem na memória do cliente
          setQuote({ id: snap.id, ...rawData });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        <p style={{ marginBottom: 16 }}>Carregando orçamento...</p>
        {user && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/consultorias')}>
            ← Voltar para Consultorias
          </button>
        )}
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
        <p style={{ marginBottom: 16 }}>Orçamento não encontrado.</p>
        {user && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/consultorias')}>
            ← Voltar para Consultorias
          </button>
        )}
      </div>
    );
  }

  const emitter = quote.emitter || {};
  const officeTitle = emitter.officeName || 'Contabiliza Já';
  const logoSrc = emitter.logoUrl || imglogo;
  const subtitle = [
    emitter.fullName,
    emitter.roleTitle,
    emitter.crc,
  ].filter(Boolean).join(' • ') || 'Proposta de Prestação de Serviços';

  const approvalPhone = (emitter.phone || '').replace(/\D/g, '');
  const cleanPhone = approvalPhone
    ? (approvalPhone.length <= 11 && !approvalPhone.startsWith('55')
      ? `55${approvalPhone}`
      : approvalPhone)
    : '';
  const isEmitter = Boolean(user && quote.userId && user.uid === quote.userId);

  return (
    <div style={{ minHeight: '100vh', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Barra de retorno ao painel visível apenas para o usuário emissor autenticado */}
        {user && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/consultorias')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ← Voltar para Consultorias
            </button>
            {isEmitter && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Visualização da Proposta (Emissor)
              </span>
            )}
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          {/* Topo da Proposta com Dados da Empresa / Emissor */}
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
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              flexShrink: 0,
              maxWidth: '120px',
              maxHeight: '60px',
              overflow: 'hidden'
            }}>
              <img
                src={logoSrc}
                alt={officeTitle}
                style={{ maxWidth: '100px', maxHeight: '50px', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text)', fontWeight: 800 }}>
                {officeTitle}
              </h1>
              <p style={{ color: 'var(--text-2)', margin: '4px 0 0 0', fontSize: 13 }}>
                {subtitle}
              </p>
              {(emitter.cnpj || emitter.phone) && (
                <p style={{ color: 'var(--text-3)', margin: '4px 0 0 0', fontSize: 11 }}>
                  {emitter.cnpj ? `CNPJ/CPF: ${emitter.cnpj}` : ''} {emitter.cnpj && emitter.phone ? '•' : ''} {emitter.phone ? `WhatsApp: ${emitter.phone}` : ''}
                </p>
              )}
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-3)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 24 }}>
            <p style={{ marginBottom: 6 }}><strong>Cliente:</strong> {quote.clientName}</p>
            <p style={{ marginBottom: 6 }}><strong>Serviço:</strong> {quote.type}</p>
            <p style={{ margin: 0 }}><strong>Data:</strong> {quote.createdAt ? new Date(quote.createdAt.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString('pt-BR') : '—'}</p>
          </div>

          <table style={{ marginBottom: 24, width: '100%' }}>
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

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {cleanPhone ? (
              <a
                href={`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(`Olá! Aprovo a proposta referente a "${quote.type}" no valor de ${fmt(quote.totalValue)}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-whatsapp btn-full"
                style={{ flex: '1 1 200px' }}
              >
                Aprovar via WhatsApp
              </a>
            ) : (
              <p style={{ flex: '1 1 200px', margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
                O escritório ainda não informou um WhatsApp para receber a aprovação.
              </p>
            )}
            <button
              className="btn btn-ghost btn-full"
              style={{ flex: '1 1 140px' }}
              onClick={() => generateQuotePDF(quote, null, quote.emitter)}
            >
              Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
