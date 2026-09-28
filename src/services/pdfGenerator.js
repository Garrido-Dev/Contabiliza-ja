// ============================================================
// src/services/pdfGenerator.js
// Geração de PDF profissional com jsPDF + jspdf-autotable.
// Exporta: generateQuotePDF(quote, client)
// ============================================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Formata valor em BRL
function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formata data legível
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR');
}

export function generateQuotePDF(quote, client) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ── Cores corporativas ────────────────────────────────────
  const DARK   = [17, 24, 39];     // #111827
  const BLUE   = [47, 124, 246];   // #2F7CF6
  const GRAY   = [100, 116, 139];  // texto secundário
  const LGRAY  = [241, 245, 249];  // fundo linhas da tabela

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Contabiliza Já', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestão de Consultorias Contábeis', margin, 26);

  // Número e status do orçamento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO Nº ${quote.id?.substring(0, 8).toUpperCase() ?? '—'}`, W - margin, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${fmtDate(quote.createdAt)}`, W - margin, 26, { align: 'right' });

  const STATUS_LABEL = { pendente: 'PENDENTE', em_andamento: 'EM ANDAMENTO', concluido: 'CONCLUÍDO' };
  doc.text(`Status: ${STATUS_LABEL[quote.status] ?? quote.status?.toUpperCase()}`, W - margin, 33, { align: 'right' });

  // ── Dados do cliente ───────────────────────────────────────
  let y = 54;
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, y);

  y += 6;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);

  const clientName = client?.name ?? quote.clientName ?? '—';
  const clientDoc  = client?.document ?? '—';
  const clientWa   = quote.whatsapp ?? client?.whatsapp ?? '—';
  const clientEmail= client?.email ?? '—';

  doc.text(`Nome:`, margin, y);
  doc.setTextColor(...DARK);
  doc.text(clientName, margin + 22, y);

  doc.setTextColor(...GRAY);
  doc.text(`CPF/CNPJ:`, W / 2, y);
  doc.setTextColor(...DARK);
  doc.text(clientDoc, W / 2 + 22, y);

  y += 6;
  doc.setTextColor(...GRAY);
  doc.text(`WhatsApp:`, margin, y);
  doc.setTextColor(...DARK);
  doc.text(clientWa, margin + 22, y);

  doc.setTextColor(...GRAY);
  doc.text(`E-mail:`, W / 2, y);
  doc.setTextColor(...DARK);
  doc.text(clientEmail, W / 2 + 22, y);

  // ── Detalhes do serviço ────────────────────────────────────
  y += 14;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALHES DO SERVIÇO', margin, y);
  y += 6;
  doc.setDrawColor(...BLUE);
  doc.line(margin, y, W - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Tipo de Serviço:', margin, y);
  doc.setTextColor(...DARK);
  doc.text(quote.type ?? '—', margin + 35, y);

  y += 6;
  doc.setTextColor(...GRAY);
  doc.text('Prazo de Entrega:', margin, y);
  doc.setTextColor(...DARK);
  doc.text(quote.deadline ?? '—', margin + 35, y);

  doc.setTextColor(...GRAY);
  doc.text('Cond. Pagamento:', W / 2, y);
  doc.setTextColor(...DARK);
  doc.text(quote.paymentTerms ?? '—', W / 2 + 35, y);

  // ── Tabela de itens ────────────────────────────────────────
  y += 14;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ITENS DO ORÇAMENTO', margin, y);
  y += 3;

  const items = quote.items ?? [];
  doc.autoTable({
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Subtotal']],
    body: items.map((item, i) => [
      i + 1,
      item.description,
      item.qty,
      fmt(item.unitPrice),
      fmt((item.qty || 0) * (item.unitPrice || 0)),
    ]),
    headStyles: {
      fillColor: BLUE, textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  // ── Total ──────────────────────────────────────────────────
  const afterTable = doc.lastAutoTable.finalY + 8;
  doc.setFillColor(...LGRAY);
  doc.roundedRect(W - margin - 70, afterTable - 4, 70, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('TOTAL:', W - margin - 55, afterTable + 5);
  doc.setTextColor(...BLUE[0], ...BLUE.slice(1));
  doc.setFontSize(12);
  doc.text(fmt(quote.totalValue), W - margin - 4, afterTable + 5, { align: 'right' });

  // ── Observações ────────────────────────────────────────────
  if (quote.description) {
    const obsY = afterTable + 22;
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DESCRIÇÃO / OBSERVAÇÕES:', margin, obsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(quote.description, W - margin * 2);
    doc.text(lines, margin, obsY + 6);
  }

  // ── Rodapé ─────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BLUE);
  doc.rect(0, pageH - 14, W, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Contabiliza Já — Gestão de Consultorias Contábeis', margin, pageH - 5);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W - margin, pageH - 5, { align: 'right' });

  // Salva o arquivo
  doc.save(`orcamento_${quote.id?.substring(0, 8) ?? 'novo'}.pdf`);
}
