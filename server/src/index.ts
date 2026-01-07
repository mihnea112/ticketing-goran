import express from "express";
import cors from "cors";
import { Pool } from "pg";
import Stripe from "stripe";
import dotenv from "dotenv";

// 1. Configurare Mediu
dotenv.config();

// Verificări critice
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ EROARE: Lipsește STRIPE_SECRET_KEY în .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover" as any,
});

app.use(cors());
app.use(express.json());

// --- HELPER: Mapare Categorie ---
const mapCategory = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  price: Number(row.price),
  totalQuantity: Number(row.totalQuantity || row.totalquantity || 0),
  soldQuantity: Number(row.soldQuantity || row.soldquantity || 0),
  badge: row.badge,
  series: row.series_prefix,
});

// ==========================================
// RUTA 1: GET TICKETS (Listare Categorii)
// ==========================================
app.get("/api/tickets", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ticket_categories ORDER BY price ASC");
    const tickets = result.rows.map(mapCategory).map((t: any) => ({
      ...t,
      available: t.totalQuantity - t.soldQuantity,
      isSoldOut: t.totalQuantity <= t.soldQuantity,
    }));
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Eroare la preluarea biletelor" });
  }
});

// ==========================================
// RUTA 2: POST ORDER (Creare Comandă Stripe - PENDING)
// ==========================================
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer, items } = req.body;
    
    if (!items?.length) return res.status(400).json({ error: "Coș gol" });
    if (!customer?.email) return res.status(400).json({ error: "Lipsă email" });

    await client.query("BEGIN");

    let calculatedTotal = 0;
    const lineItemsForStripe = [];

    // Verificăm prețurile și stocul
    for (const item of items) {
      const ticketRes = await client.query("SELECT * FROM ticket_categories WHERE id = $1", [item.categoryId]);
      if (ticketRes.rows.length === 0) throw new Error(`Categorie invalidă: ${item.categoryId}`);

      const ticketData = mapCategory(ticketRes.rows[0]);
      calculatedTotal += ticketData.price * item.quantity;

      lineItemsForStripe.push({
        price_data: {
          currency: "ron",
          product_data: { name: ticketData.name, description: "Concert Goran Bregović" },
          unit_amount: Math.round(ticketData.price * 100),
        },
        quantity: item.quantity,
      });
    }

    // Creăm comanda (PENDING) - NU generăm bilete încă!
    const orderRes = await client.query(
      `INSERT INTO orders (customername, customeremail, totalamount, status) 
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [`${customer.firstName} ${customer.lastName}`, customer.email, calculatedTotal]
    );
    const orderId = orderRes.rows[0].id;

    // Salvăm itemele în order_items
    for (const item of items) {
      const tRes = await client.query("SELECT price FROM ticket_categories WHERE id = $1", [item.categoryId]);
      await client.query(
        `INSERT INTO order_items (orderid, ticketcategoryid, quantity, priceperunit)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.categoryId, item.quantity, tRes.rows[0].price]
      );
    }

    await client.query("COMMIT");

    // Creăm sesiunea Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItemsForStripe,
      mode: "payment",
      success_url: `${CLIENT_URL}/success?orderId=${orderId}`,
      cancel_url: `${CLIENT_URL}/`,
      customer_email: customer.email,
      metadata: { orderId: orderId },
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Order Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// RUTA 3: GET ORDER DETAILS (Citire din tabelul TICKETS)
// ==========================================
app.get("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ error: "Comanda inexistentă" });

    // Aici citim biletele generate fizic în tabelul tickets
    const ticketsRes = await pool.query(
      `SELECT t.unique_qr_code as unique_qr_id, 
              t.ticket_display, 
              t.series_prefix,
              t.ticket_number,
              tc.name as category_name, 
              tc.code as category_code,
              tc.price as priceperunit
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       WHERE t.order_id = $1
       ORDER BY t.ticket_number ASC`,
      [id]
    );

    res.json({ ...orderRes.rows[0], items: ticketsRes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Eroare server" });
  }
});

// ==========================================
// RUTA 4: CONFIRM ORDER (Generare Bilete - THE FIX)
// ==========================================
app.post("/api/orders/confirm", async (req, res) => {
  const { orderId } = req.body;
  const client = await pool.connect();

  try {
    if (!orderId) throw new Error("Lipseste Order ID");
    await client.query("BEGIN");

    // 1. Verificăm comanda (Lock for update)
    const checkRes = await client.query("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (checkRes.rows.length === 0) throw new Error("Comanda nu există");
    
    // Dacă e deja plătită, întoarcem succes (idempotency)
    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return res.json({ success: true, message: "Comanda era deja confirmată" });
    }

    // 2. Setăm statusul PAID
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [orderId]);

    // 3. Preluăm itemele comenzii
    const itemsRes = await client.query(
      `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       WHERE oi.orderid = $1`,
      [orderId]
    );

    // 4. GENERĂM BILETELE ÎN TABELUL 'tickets'
    for (const item of itemsRes.rows) {
      // Blocăm categoria pentru a lua numărul corect (Concurrency safe)
      const catRes = await client.query(
        `SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`,
        [item.ticketcategoryid]
      );

      let currentSold = Number(catRes.rows[0].soldQuantity);
      
      for (let i = 0; i < item.quantity; i++) {
        currentSold++; 
        
        const ticketNumber = currentSold;
        const series = item.series_prefix || "GEN";
        const displayID = `${series} ${ticketNumber}`; // Ex: "GA 105"
        
        // Generăm un cod unic pentru QR
        const uniqueQR = `${item.id}-${i+1}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`; 

        // INSERT ÎN TICKETS
        await client.query(
          `INSERT INTO tickets 
          (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
          [orderId, item.ticketcategoryid, series, ticketNumber, displayID, uniqueQR]
        );
      }

      // Actualizăm stocul total în categorii
      await client.query(
        `UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`,
        [currentSold, item.ticketcategoryid]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("❌ Eroare confirmare:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// RUTA 5: ADMIN SCAN (Verificare în tabelul TICKETS)
// ==========================================
app.post("/api/admin/scan", async (req, res) => {
  const { qrCode } = req.body;
  
  try {
    // Căutăm biletul direct după codul QR unic în tabelul 'tickets'
    const ticketRes = await pool.query(
      `SELECT t.*, tc.name as category_name, o.customername 
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.id
       JOIN orders o ON t.order_id = o.id
       WHERE t.unique_qr_code = $1`,
      [qrCode]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ valid: false, message: "Bilet NECUNOSCUT." });
    }

    const ticket = ticketRes.rows[0];

    if (ticket.status === 'used') {
       return res.status(409).json({ 
         valid: false, 
         message: `Bilet DEJA FOLOSIT! (${ticket.ticket_display})`,
         details: { customer: ticket.customername }
       });
    }

    // Îl marcăm ca folosit
    await pool.query("UPDATE tickets SET status = 'used' WHERE id = $1", [ticket.id]);

    res.json({
      valid: true,
      customer: ticket.customername,
      category: ticket.category_name,
      ticketNumber: ticket.ticket_display,
    });

  } catch (error: any) {
    console.error("Scan Error:", error);
    res.status(500).json({ valid: false, message: "Eroare Server" });
  }
});

// ==========================================
// RUTA 6: ADMIN STATS
// ==========================================
app.get("/api/admin/stats", async (req, res) => {
  try {
    const statsRes = await pool.query(`SELECT COALESCE(SUM(totalamount), 0) as revenue, COUNT(id) as orders FROM orders WHERE status = 'paid'`);
    const inventoryRes = await pool.query('SELECT id, name, code, "totalQuantity", "soldQuantity" FROM ticket_categories');
    
    // Chart
    const chartRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'Day') as day, SUM(totalamount) as sales
      FROM orders WHERE status='paid' AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Day'), created_at ORDER BY created_at
    `);

    // Recente
    const recentOrdersRes = await pool.query(`
        SELECT o.id, o.customername, o.totalamount, TO_CHAR(o.created_at, 'DD.MM HH24:MI') as formatted_date
        FROM orders o WHERE status='paid' ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      stats: {
        revenue: parseFloat(statsRes.rows[0].revenue),
        orders: parseInt(statsRes.rows[0].orders),
        ticketsSold: inventoryRes.rows.reduce((acc, i) => acc + i.soldQuantity, 0),
      },
      chart: chartRes.rows.map(r => ({ day: r.day.trim(), sales: parseFloat(r.sales) })),
      inventory: inventoryRes.rows,
      recentOrders: recentOrdersRes.rows.map(r => ({
          id: r.id, customer: r.customername, status: 'paid', date: r.formatted_date
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================================
// RUTA DE LOGIN
// ==========================================
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === "concert2025") {
    res.json({ success: true, token: "admin-logged-in-securely" });
  } else {
    res.status(401).json({ success: false, error: "Parolă incorectă" });
  }
});

// ==========================================
// RUTA 7: REGENERARE BILETE (FIX PENTRU TABEL GOL)
// ==========================================
// Accesează http://localhost:4000/api/debug/regenerate în browser pentru a repara comenzile vechi
app.get("/api/debug/regenerate", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Curățăm tabelul tickets și resetăm stocurile pentru a recalcula totul corect
    await client.query("TRUNCATE TABLE tickets RESTART IDENTITY CASCADE");
    await client.query('UPDATE ticket_categories SET "soldQuantity" = 0');

    // 2. Luăm toate comenzile PLĂTITE
    const ordersRes = await client.query("SELECT id FROM orders WHERE status = 'paid' ORDER BY created_at ASC");

    for (const order of ordersRes.rows) {
      const itemsRes = await client.query(
        `SELECT oi.id, oi.ticketcategoryid, oi.quantity, tc.series_prefix 
         FROM order_items oi
         JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
         WHERE oi.orderid = $1`,
        [order.id]
      );

      for (const item of itemsRes.rows) {
        // Recalculăm stocurile pas cu pas
        const catRes = await client.query(`SELECT "soldQuantity" FROM ticket_categories WHERE id = $1 FOR UPDATE`, [item.ticketcategoryid]);
        let currentSold = Number(catRes.rows[0].soldQuantity);

        for (let i = 0; i < item.quantity; i++) {
          currentSold++;
          const ticketNumber = currentSold;
          const series = item.series_prefix || "GEN";
          const displayID = `${series} ${ticketNumber}`;
          const uniqueQR = `${item.id}-${i + 1}-REGEN-${Date.now()}`; // QR generat retroactiv

          await client.query(
            `INSERT INTO tickets 
            (order_id, category_id, series_prefix, ticket_number, ticket_display, unique_qr_code, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'valid')`,
            [order.id, item.ticketcategoryid, series, ticketNumber, displayID, uniqueQR]
          );
        }
        await client.query(`UPDATE ticket_categories SET "soldQuantity" = $1 WHERE id = $2`, [currentSold, item.ticketcategoryid]);
      }
    }

    await client.query("COMMIT");
    res.send(`✅ REPARAT! Bilete regenerate pentru ${ordersRes.rows.length} comenzi.`);
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).send("Eroare: " + error.message);
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});