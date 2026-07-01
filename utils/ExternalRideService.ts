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
