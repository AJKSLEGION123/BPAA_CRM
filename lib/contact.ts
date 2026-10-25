// The one contact button. NEXT_PUBLIC_WA_NUMBER is inlined at build time, so this works on server and client.
const WA = (process.env.NEXT_PUBLIC_WA_NUMBER ?? "").replace(/\D/g, "");

export const contactChannel = WA ? "WhatsApp" : "Telegram";
export const contactLabel = `Написать Павлу в ${contactChannel}`;

/** Only package names go into the link text, never anything the visitor typed. */
export function contactUrl(text: string): string {
  // Until the separate WhatsApp Business number exists, the contact is Pavel's Telegram.
  return WA ? `https://wa.me/${WA}?text=${encodeURIComponent(text)}` : `https://t.me/SSLEADS1?text=${encodeURIComponent(text)}`;
}
