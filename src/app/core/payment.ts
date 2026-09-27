import { Delivery } from '../models/models';

type Payment = Pick<Delivery, 'paid' | 'paymentMethod' | 'installments' | 'notes' | 'orderValue' | 'deliveryFee'>;

/** Billing metadata stays in the staff-only delivery document. */
export function normalizePayment(delivery: Payment): Pick<Delivery, 'paymentMethod' | 'installments' | 'notes'> {
  const notes = (delivery.notes ?? '').trim();
  if (notes.length > 500) throw new Error('A observação deve ter até 500 caracteres.');
  const result: Pick<Delivery, 'paymentMethod' | 'installments' | 'notes'> = { notes };
  if (delivery.paid) return result;
  if (!delivery.paymentMethod || !['CREDIT', 'DEBIT', 'PIX', 'CASH'].includes(delivery.paymentMethod)) {
    throw new Error('Selecione a forma de pagamento.');
  }
  result.paymentMethod = delivery.paymentMethod;
  if (delivery.paymentMethod === 'CREDIT') {
    if (!delivery.installments || ![1, 2, 3].includes(delivery.installments)) throw new Error('Selecione as parcelas do crédito: 1x, 2x ou 3x.');
    result.installments = delivery.installments;
  }
  return result;
}

export function amountToCollect(delivery: Pick<Delivery, 'paid' | 'orderValue' | 'deliveryFee'>): number {
  if (delivery.paid) return 0;
  const cents = (value: number) => Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
  return (cents(delivery.orderValue) + cents(delivery.deliveryFee)) / 100;
}

export function paymentLabel(delivery: Pick<Delivery, 'paid' | 'paymentMethod' | 'installments'>): string {
  if (delivery.paid) return 'Pago';
  switch (delivery.paymentMethod) {
    case 'CREDIT': return delivery.installments && [1, 2, 3].includes(delivery.installments) ? `Crédito em ${delivery.installments}x` : 'Crédito · parcelas não informadas';
    case 'DEBIT': return 'Débito';
    case 'PIX': return 'Pix';
    case 'CASH': return 'Dinheiro';
    default: return 'Forma de pagamento não informada';
  }
}
