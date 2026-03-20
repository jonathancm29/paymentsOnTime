import {
  CreditCard, Droplet, TrendingDown, Landmark, Heart, Briefcase,
  Tv, Shield, BookOpen, Home, Car, Gamepad2, ShoppingBag
} from 'lucide-react';

export const CATEGORIES = {
  tarjetas: { id: 'tarjetas', label: 'Tarjetas de crédito', icon: CreditCard },
  recibos: { id: 'recibos', label: 'Recibos públicos', icon: Droplet },
  deudas: { id: 'deudas', label: 'Deudas', icon: TrendingDown },
  creditos: { id: 'creditos', label: 'Créditos', icon: Landmark },
  manutenciones: { id: 'manutenciones', label: 'Manutenciones', icon: Heart },
  suscripciones: { id: 'suscripciones', label: 'Suscripciones (Netflix, Spotify)', icon: Tv },
  arriendo: { id: 'arriendo', label: 'Arriendo / Hipoteca', icon: Home },
  seguros: { id: 'seguros', label: 'Seguros', icon: Shield },
  educacion: { id: 'educacion', label: 'Educación', icon: BookOpen },
  transporte: { id: 'transporte', label: 'Transporte / Gasolina', icon: Car },
  compras: { id: 'compras', label: 'Compras / Supermercado', icon: ShoppingBag },
  entretenimiento: { id: 'entretenimiento', label: 'Entretenimiento / Salidas', icon: Gamepad2 },
  compromisos: { id: 'compromisos', label: 'Otros Compromisos', icon: Briefcase }
};
