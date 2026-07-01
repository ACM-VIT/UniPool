import { Linking } from "react-native";

export interface ExternalRide {
  id: string;
  source: string;
  source_label: string;
  pickup_point: string;
  destination: string;
  departure_time: string;
  host_name: string;
  host_phone: string;
  vehicle_type: string;
  total_seats: number;
  available_seats: number;
  total_price?: number;
  journey_notes?: string;
}

export function dialPhone(phone: string) {
  if (!phone) return;
  const cleaned = phone.replace(/[^0-9+]/g, "");
  const uri = cleaned.startsWith("+") ? `tel:${cleaned}` : `tel:+91${cleaned}`;
  Linking.openURL(uri).catch(() => {});
}

// Normalize a phone to wa.me digits (country code, no +). Assumes India
// when a bare 10-digit number is given, matching dialPhone's +91 default.
export function whatsappDigits(phone: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? digits : null;
}

export function openWhatsApp(phone: string, message: string) {
  const digits = whatsappDigits(phone);
  if (!digits) return;
  const uri = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  Linking.openURL(uri).catch(() => {});
}
