import type { Delivery } from '../models/models';

export function arrivalWhatsApp(delivery: Pick<Delivery, 'phone' | 'customerName'>): string | null {
  const raw = delivery.phone?.trim() ?? '';
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let phone = raw.replace(/\D/g, '');
  if ((phone.length === 12 || phone.length === 13) && phone.startsWith('55')) phone = phone.slice(2);
  if (!/^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(phone)) return null;
  const message = `🐺 Olá, ${delivery.customerName}! Aqui é da BlackOut Shop Brazil.\n\n🛵📦 Seu pedido chegou! Estou na entrada do endereço combinado, esperando você para entregar.\n\nPode vir receber? Obrigado por escolher a BlackOut! 🖤`;
  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}
