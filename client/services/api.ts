// src/services/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = {
  // 1. Obține Biletele
  getTickets: async () => {
    const res = await fetch(`${API_URL}/api/tickets`);
    if (!res.ok) throw new Error('Nu am putut prelua biletele');
    return res.json();
  },

  // 2. Trimite Comanda
  createOrder: async (customer: any, items: any[]) => {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customer, 
        items: items.map(item => ({
          categoryId: item.categoryId,
          quantity: item.quantity
        }))
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare la plasarea comenzii');
    return data;
  },

  // 3. Admin Stats (Opțional)
  getStats: async () => {
    const res = await fetch(`${API_URL}/api/admin/stats`);
    if (!res.ok) throw new Error('Eroare admin stats');
    return res.json();
  }
};