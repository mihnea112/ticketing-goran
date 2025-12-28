// src/types.ts

export interface TicketCategory {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  badge?: string;
  available: number;  // Calculat de backend
  isSoldOut: boolean; // Calculat de backend
}

export interface CartItem {
  categoryId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}