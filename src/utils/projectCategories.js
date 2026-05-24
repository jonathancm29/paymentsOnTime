import {
  Home, Utensils, Plane, Ticket, Gift, TrendingUp, RotateCcw, HelpCircle
} from 'lucide-react';

export const PROJECT_CATEGORIES = {
  hospedaje: { id: 'hospedaje', label: 'Hospedaje', icon: Home, kind: 'expense' },
  comida: { id: 'comida', label: 'Comida / Bebida', icon: Utensils, kind: 'expense' },
  transporte: { id: 'transporte', label: 'Transporte / Vuelos', icon: Plane, kind: 'expense' },
  tickets: { id: 'tickets', label: 'Tickets / Entradas', icon: Ticket, kind: 'expense' },
  compras: { id: 'compras', label: 'Compras / Souvenirs', icon: Gift, kind: 'expense' },
  aporte: { id: 'aporte', label: 'Aporte Personal', icon: TrendingUp, kind: 'income' },
  reembolso: { id: 'reembolso', label: 'Reembolso / Devolución', icon: RotateCcw, kind: 'income' },
  otro: { id: 'otro', label: 'Otro / General', icon: HelpCircle, kind: 'both' }
};
