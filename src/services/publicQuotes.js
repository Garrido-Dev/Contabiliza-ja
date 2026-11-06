import { doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export function buildPublicQuote(quote) {
  return {
    clientName: typeof quote.clientName === 'string' ? quote.clientName : '',
    type: typeof quote.type === 'string' ? quote.type : '',
    description: typeof quote.description === 'string' ? quote.description : '',
    items: Array.isArray(quote.items)
      ? quote.items.map(item => ({
          description: typeof item?.description === 'string' ? item.description : '',
          qty: Number.isFinite(Number(item?.qty)) ? Number(item.qty) : 1,
          unitPrice: Number.isFinite(Number(item?.unitPrice)) ? Number(item.unitPrice) : 0,
        }))
      : [],
    totalValue: Number.isFinite(Number(quote.totalValue)) ? Number(quote.totalValue) : 0,
    createdAt: quote.createdAt ?? null,
    deadline: typeof quote.deadline === 'string' ? quote.deadline : null,
    paymentTerms: typeof quote.paymentTerms === 'string' ? quote.paymentTerms : null,
    whatsapp: String(quote.whatsapp ?? '').replace(/\D/g, ''),
  };
}

export async function migrateLegacyQuotes(quotes, userId) {
  const legacyQuotes = quotes.filter(quote => !quote.shareId);

  // Rules read the quote and share mapping for each migration; keep batches below
  // Firestore's 20 security-rule document access calls per atomic operation.
  const batchSize = 5;
  for (let offset = 0; offset < legacyQuotes.length; offset += batchSize) {
    const batch = writeBatch(db);
    const chunk = legacyQuotes.slice(offset, offset + batchSize);

    for (const quote of chunk) {
      // Old WhatsApp links used the quote ID. Reuse it so those URLs keep working.
      const shareId = quote.id;
      batch.set(doc(db, 'quoteShares', shareId), {
        userId,
        quoteId: quote.id,
      });
      batch.set(doc(db, 'publicQuotes', shareId), buildPublicQuote(quote));
      batch.update(doc(db, 'quotes', quote.id), { shareId });
    }

    await batch.commit();
  }

  return quotes.map(quote => (
    quote.shareId ? quote : { ...quote, shareId: quote.id }
  ));
}
