import pool from "@/lib/db";
import QRCode from "qrcode";
import React from "react";
import TicketViewClient from "./TicketViewClient"; // Importăm componenta client creată mai sus

export const dynamic = 'force-dynamic';

export default async function ViewTicketsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  
  const client = await pool.connect();
  let orderData = null;
  let ticketsList = [];
  const qrCodesMap: Record<string, string> = {};

  try {
    // 1. Luăm biletele din DB
    const res = await client.query(
      `SELECT t.ticket_display, t.unique_qr_code, tc.name as category_name, o.id as order_id, o.customername, o.status, o.created_at
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       JOIN orders o ON t.order_id = o.id
       WHERE t.order_id = $1
       ORDER BY t.ticket_number ASC`,
      [orderId]
    );

    if (res.rows.length === 0) {
      return (
        <div className="min-h-screen bg-[#0a0905] flex items-center justify-center p-4">
             <div className="bg-[#14120c] border border-red-900/50 p-10 rounded-xl text-center">
                <h1 className="text-red-500 font-bold text-xl mb-2">Comandă Inexistentă</h1>
                <p className="text-gray-400">Nu am găsit bilete valide pentru acest ID.</p>
             </div>
        </div>
      );
    }

    // Extragem datele generale (comune tuturor biletelor)
    const firstRow = res.rows[0];
    orderData = {
        id: firstRow.order_id,
        customername: firstRow.customername,
        status: firstRow.status,
        created_at: firstRow.created_at
    };

    // 2. Generăm imaginile QR pe server (pentru PDF)
    ticketsList = await Promise.all(res.rows.map(async (t) => {
        const qrUrl = await QRCode.toDataURL(t.unique_qr_code, { 
            width: 400, 
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        });
        
        // Salvăm imaginea în mapare pentru PDF
        qrCodesMap[t.unique_qr_code] = qrUrl;

        // Returnăm obiectul complet pentru randare UI
        return { ...t, qrUrl };
    }));

  } catch (e) {
      console.error(e);
      return <div className="bg-black text-white p-10">Eroare server.</div>;
  } finally {
    client.release();
  }

  // 3. Trimitem totul către Client Component
  return (
    <TicketViewClient 
        orderData={orderData} 
        tickets={ticketsList} 
        qrCodesMap={qrCodesMap} 
    />
  );
}