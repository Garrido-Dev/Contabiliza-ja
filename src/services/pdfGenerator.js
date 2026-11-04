// ============================================================
// src/services/pdfGenerator.js
// Geração de PDF profissional com jsPDF + jspdf-autotable.
// Exporta: buildQuotePDFDoc, generateQuotePDF, getQuotePDFBlob
// ============================================================

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export function buildQuotePDFDoc(quote, client = null, profile = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 20;

  const emitter = profile || quote?.emitter || {};
  const officeName = emitter.officeName || 'Contabiliza Já';
  const professionalInfo = [
    emitter.fullName,
    emitter.roleTitle,
    emitter.crc ? (emitter.crc.includes(':') ? emitter.crc : `Reg.: ${emitter.crc}`) : '',
  ].filter(Boolean).join(' • ') || 'Prestação de Serviços & Consultoria';

  // ── Cores corporativas ────────────────────────────────────
  const DARK  = [17, 24, 39];     // #111827
  const BLUE  = [47, 124, 246];   // #2F7CF6
  const GRAY  = [100, 116, 139];  // texto secundário
  const LGRAY = [241, 245, 249];  // fundo linhas da tabela

  // ── Cabeçalho ─────────────────────────────────────────────
  const headerHeight = 44;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, headerHeight, 'F');

  let textStartX = margin;
  let customLogoDrawn = false;

  // 1. Tenta carregar logotipo personalizado do perfil
  if (emitter.logoUrl) {
    try {
      const format = emitter.logoUrl.includes('image/jpeg') || emitter.logoUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 7, 34, 28, 3, 3, 'F');
      doc.addImage(emitter.logoUrl, format, margin + 2, 8.5, 30, 25);
      textStartX = margin + 38;
      customLogoDrawn = true;
    } catch (e) {
      console.warn('Não foi possível renderizar imagem do logotipo personalizado no PDF:', e);
    }
  }

  // 2. Se não tem logotipo customizado, busca logo da aplicação no DOM
  if (!customLogoDrawn) {
    try {
      const logoFullImg = document.querySelector('img[src*="logo"]') || document.querySelector('img[alt="Contabiliza Já"]');
      if (logoFullImg && logoFullImg.complete && logoFullImg.naturalWidth > 0) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 7, 34, 28, 3, 3, 'F');
        doc.addImage(logoFullImg, 'PNG', margin + 3, 9.5, 28, 23);
        textStartX = margin + 38;
      }
    } catch {
      // fallback silencioso
    }
  }

  // Nome da Empresa / Escritório
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(officeName.length > 25 ? 16 : 19);
  doc.setFont('helvetica', 'bold');
  doc.text(officeName, textStartX, 16);

  // Subtítulo / Responsável
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(professionalInfo, textStartX, 23);

  // Contatos da Empresa no Cabeçalho
  const contactParts = [
    emitter.cnpj ? `CNPJ/CPF: ${emitter.cnpj}` : '',
    emitter.phone ? `WhatsApp: ${emitter.phone}` : '',
    emitter.email ? emitter.email : '',
  ].filter(Boolean).join(' • ');

  if (contactParts) {
    doc.setFontSize(8);
    doc.text(contactParts, textStartX, 30);
  }

  // Número e status do orçamento (lado direito)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO Nº ${quote.id?.substring(0, 8).toUpperCase() ?? '—'}`, W - margin, 16, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${fmtDate(quote.createdAt)}`, W - margin, 23, { align: 'right' });

  const STATUS_LABEL = { pendente: 'PENDENTE', em_andamento: 'EM ANDAMENTO', concluido: 'CONCLUÍDO' };
  doc.text(`Status: ${STATUS_LABEL[quote.status] ?? quote.status?.toUpperCase() ?? 'PENDENTE'}`, W - margin, 29, { align: 'right' });

  let y = headerHeight + 12;

  // ── Dados da Empresa Emissora / Prestador de Serviços ──
  if (emitter.address || emitter.website) {
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPRESA EMISSORA / PRESTADOR DE SERVIÇOS', margin, y);

    y += 5;
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);

    if (emitter.address) {
      doc.text('Endereço:', margin, y);
      doc.setTextColor(...DARK);
      doc.text(emitter.address, margin + 25, y);
    }

    if (emitter.website) {
      doc.setTextColor(...GRAY);
      doc.text('Website:', W / 2, y);
      doc.setTextColor(...DARK);
      doc.text(emitter.website, W / 2 + 20, y);
    }

    y += 10;
  }

  // ── Dados do cliente ───────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, y);

  y += 5;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);

  const clientName = client?.name ?? quote.clientName ?? '—';
  const clientDoc  = client?.document ?? '—';
  const clientWa   = quote.whatsapp ?? client?.whatsapp ?? '—';
  const clientEmail= quote.clientEmail ?? client?.email ?? '—';

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
  y += 12;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALHES DO SERVIÇO', margin, y);
  y += 5;
  doc.setDrawColor(...BLUE);
  doc.line(margin, y, W - margin, y);
  y += 6;

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
  y += 12;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ITENS DO ORÇAMENTO', margin, y);
  y += 2;

  const items = quote.items ?? [];
  
  autoTable(doc, {
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
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 20;
  const afterTable = finalY + 8;
  
  doc.setFillColor(...LGRAY);
  doc.roundedRect(W - margin - 70, afterTable - 4, 70, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('TOTAL:', W - margin - 55, afterTable + 5);
  
  doc.setTextColor(...BLUE);
  doc.setFontSize(12);
  doc.text(fmt(quote.totalValue), W - margin - 4, afterTable + 5, { align: 'right' });

  // ── Observações ────────────────────────────────────────────
  if (quote.description) {
    const obsY = afterTable + 20;
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
  
  const footerEmitter = `${officeName}${emitter.phone ? ` • Tel: ${emitter.phone}` : ''}${emitter.email ? ` • ${emitter.email}` : ''}`;
  doc.text(footerEmitter, margin, pageH - 5);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W - margin, pageH - 5, { align: 'right' });

  const filename = `orcamento_${quote.id?.substring(0, 8) ?? 'novo'}.pdf`;
  return { doc, filename };
}

export function generateQuotePDF(quote, client = null, profile = null) {
  const { doc, filename } = buildQuotePDFDoc(quote, client, profile);
  doc.save(filename);
}

export function getQuotePDFBlob(quote, client = null, profile = null) {
  const { doc, filename } = buildQuotePDFDoc(quote, client, profile);
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { doc, blob, file, filename };
}
