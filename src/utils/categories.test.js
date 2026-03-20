import { describe, it, expect } from 'vitest';
import { CATEGORIES } from './categories';

describe('CATEGORIES Configuration', () => {
  it('contains expected default categories', () => {
    expect(CATEGORIES).toHaveProperty('tarjetas');
    expect(CATEGORIES).toHaveProperty('recibos');
    expect(CATEGORIES).toHaveProperty('deudas');
    expect(CATEGORIES.tarjetas.label).toBe('Tarjetas de crédito');
  });

  it('all categories have an id, label, and icon', () => {
    Object.values(CATEGORIES).forEach(category => {
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('label');
      expect(category).toHaveProperty('icon');
      
      // Ensure id matches the key
      expect(CATEGORIES[category.id]).toBeDefined();
    });
  });
});
