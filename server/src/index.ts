import express from "express";
import cors from "cors";
import { Pool } from "pg";
import Stripe from "stripe";
import dotenv from "dotenv";

// 1. Încărcăm variabilele de mediu
dotenv.config();

// --- DEBUG CRITIC: Verificăm dacă cheile există ---
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ EROARE FATALĂ: Lipsește STRIPE_SECRET_KEY din .env");
  process.exit(1);
}
if (!process.env.CLIENT_URL) {
  console.error(
    "⚠️ ATENȚIE: Lipsește CLIENT_URL din .env. Folosim http://localhost:3000 default."
  );
}

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

app.use(cors());
app.use(express.json());

// --- HELPER: Normalizează datele din DB ---
const mapCategory = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  price: Number(row.price),
  totalQuantity: Number(row.totalQuantity || row.totalquantity || 0),
  soldQuantity: Number(row.soldQuantity || row.soldquantity || 0),
  badge: row.badge,
});

// ==========================================
// RUTA 1: GET TICKETS
// ==========================================
app.get("/api/tickets", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ticket_categories ORDER BY price ASC"
    );

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
// RUTA 2: POST ORDER
// ==========================================
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Coșul de cumpărături este gol." });
    }
    if (!customer || !customer.email) {
      return res
        .status(400)
        .json({ success: false, error: "Datele clientului sunt incomplete." });
    }

    await client.query("BEGIN");

    let calculatedTotal = 0;
    const lineItemsForStripe = [];

    for (const item of items) {
      if (!item.categoryId || item.categoryId === "undefined") {
        throw new Error(`Item invalid detectat!`);
      }

      const ticketRes = await client.query(
        "SELECT * FROM ticket_categories WHERE id = $1",
        [item.categoryId]
      );
      if (ticketRes.rows.length === 0)
        throw new Error(`Nu există bilet cu ID-ul: ${item.categoryId}`);

      const ticketData = mapCategory(ticketRes.rows[0]);
      const price = ticketData.price;
      calculatedTotal += price * item.quantity;

      lineItemsForStripe.push({
        price_data: {
          currency: "ron",
          product_data: {
            name: ticketData.name,
            description: "Concert Goran Bregović",
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      });
    }

    const orderRes = await client.query(
      `INSERT INTO orders (customername, customeremail, totalamount, status) 
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [
        customer.firstName + " " + customer.lastName,
        customer.email,
        calculatedTotal,
      ]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      const ticketRes = await client.query(
        "SELECT price FROM ticket_categories WHERE id = $1",
        [item.categoryId]
      );
      const rawPrice = ticketRes.rows[0].price;

      await client.query(
        `INSERT INTO order_items (orderid, ticketcategoryid, quantity, priceperunit)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.categoryId, item.quantity, rawPrice]
      );
    }

    await client.query("COMMIT");

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
    console.error("❌ EROARE SERVER:", error.message);
    res
      .status(500)
      .json({
        success: false,
        error: error.message || "Eroare la procesarea comenzii",
      });
  } finally {
    client.release();
  }
});

// ==========================================
// RUTA 3: GET ORDER DETAILS
// ==========================================
app.get("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ error: "ID comandă invalid." });

  try {
    const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [
      id,
    ]);
    if (orderRes.rows.length === 0)
      return res.status(404).json({ error: "Comanda nu a fost găsită" });

    const itemsRes = await pool.query(
      `SELECT oi.id as db_id, oi.quantity, oi.priceperunit, tc.name as category_name, tc.code as category_code 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       WHERE oi.orderid = $1`,
      [id]
    );

    const expandedTickets = [];
    for (const item of itemsRes.rows) {
      for (let i = 0; i < item.quantity; i++) {
        expandedTickets.push({
          unique_qr_id: `${item.db_id}-${i + 1}`,
          priceperunit: Number(item.priceperunit),
          category_name: item.category_name,
          category_code: item.category_code,
          ticket_number: i + 1,
        });
      }
    }

    res.json({ ...orderRes.rows[0], items: expandedTickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Eroare server" });
  }
});

// ==========================================
// RUTA 4: ADMIN STATS (FINAL - FĂRĂ FILTRU 24H)
// ==========================================
app.get("/api/admin/stats", async (req, res) => {
  try {
    const client = await pool.connect();

    // 1. Statistici generale
    const statsRes = await client.query(`
      SELECT 
        COALESCE(SUM(totalamount), 0) as revenue,
        COUNT(id) as orders
      FROM orders
    `);

    // 2. Inventar
    const inventoryRes = await client.query(`
      SELECT id, name, code, price, "totalQuantity", 
             (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE ticketcategoryid = ticket_categories.id) as sold_quantity
      FROM ticket_categories
    `);

    // 3. Chart Data
    const chartRes = await client.query(`
      SELECT TO_CHAR(created_at, 'Day') as day, SUM(totalamount) as sales
      FROM orders
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Day'), created_at
      ORDER BY created_at
    `);

    // 4. ULTIMELE COMENZI (MODIFICAT: Fără limită de timp, doar ultimele 50)
    // Aici statusul este selectat direct din DB (o.status)
    const recentOrdersRes = await client.query(`
      SELECT 
        o.id, 
        o.customername, 
        o.status, 
        TO_CHAR(o.created_at, 'DD.MM HH24:MI') as formatted_date,
        o.totalamount,
        COALESCE(SUM(oi.quantity), 0) as total_tickets
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderid
      GROUP BY o.id, o.customername, o.created_at, o.totalamount, o.status
      ORDER BY o.created_at DESC
      LIMIT 50
    `);

    // Calcule auxiliare
    const totalCapacity = inventoryRes.rows.reduce(
      (acc, item) => acc + (item.totalQuantity || item.total_quantity || 0),
      0
    );
    const ticketsSold = inventoryRes.rows.reduce(
      (acc, item) => acc + parseInt(item.sold_quantity),
      0
    );

    // Formatare răspuns
    const inventory = inventoryRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      price: parseFloat(row.price),
      totalQuantity: row.totalQuantity || 0,
      soldQuantity: parseInt(row.sold_quantity),
    }));

    const recentOrders = recentOrdersRes.rows.map((row) => ({
      id: row.id,
      customer: row.customername,
      quantity: parseInt(row.total_tickets),
      date: row.formatted_date,
      status: row.status, // <--- CRITIC: Aici luăm valoarea 'paid' sau 'pending' din DB
    }));

    client.release();

    res.json({
      stats: {
        revenue: parseFloat(statsRes.rows[0].revenue),
        orders: parseInt(statsRes.rows[0].orders),
        ticketsSold,
        totalCapacity,
      },
      chart: chartRes.rows.map((r) => ({
        day: r.day.trim(),
        sales: parseFloat(r.sales),
      })),
      inventory,
      recentOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================================
// RUTA 5: SEED DATABASE
// ==========================================
app.get("/seed", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT COUNT(*) as count FROM ticket_categories"
    );
    if (parseInt(check.rows[0].count) > 0)
      return res.send("Database already seeded!");

    const queryText = `INSERT INTO ticket_categories (code, name, price, "totalQuantity", badge, "soldQuantity") VALUES ($1, $2, $3, $4, $5, 0)`;

    await pool.query(queryText, ["gold", "VIP Gold", 450, 100, "EXCLUSIV"]);
    await pool.query(queryText, ["tribune", "Tribună", 250, 500, "POPULAR"]);
    await pool.query(queryText, [
      "general",
      "Acces General",
      150,
      2000,
      "BEST VALUE",
    ]);

    res.send("Supabase seeded successfully!");
  } catch (err: any) {
    console.error(err);
    res.status(500).send("Error seeding: " + err.message);
  }
});

// ==========================================
// RUTA 6: CONFIRM ORDER
// ==========================================
app.post("/api/orders/confirm", async (req, res) => {
  const { orderId } = req.body;
  const client = await pool.connect();

  try {
    if (!orderId) throw new Error("Lipseste Order ID");
    await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT status FROM orders WHERE id = $1",
      [orderId]
    );
    if (checkRes.rows.length === 0) throw new Error("Comanda nu există");
    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return res.json({
        success: true,
        message: "Comanda era deja confirmată",
      });
    }

    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    const itemsRes = await client.query(
      "SELECT ticketcategoryid, quantity FROM order_items WHERE orderid = $1",
      [orderId]
    );
    for (const item of itemsRes.rows) {
      await client.query(
        `UPDATE ticket_categories SET "soldQuantity" = "soldQuantity" + $1 WHERE id = $2`,
        [item.quantity, item.ticketcategoryid]
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
// RUTA 7: ADMIN SCAN (QR CHECK-IN)
// ==========================================
app.post("/api/admin/scan", async (req, res) => {
  const { qrCode } = req.body;
  const client = await pool.connect();

  try {
    console.log("📸 Scanat:", qrCode);
    if (!qrCode || !qrCode.includes("-"))
      return res
        .status(400)
        .json({ valid: false, message: "Format QR Invalid" });

    const checkScan = await client.query(
      "SELECT * FROM scanned_tickets WHERE unique_qr_id = $1",
      [qrCode]
    );
    if (checkScan.rows.length > 0) {
      const scannedAt = new Date(
        checkScan.rows[0].scanned_at
      ).toLocaleTimeString();
      return res
        .status(409)
        .json({
          valid: false,
          message: `Bilet DEJA FOLOSIT la ora ${scannedAt}!`,
        });
    }

    const lastDashIndex = qrCode.lastIndexOf("-");
    const dbId = qrCode.substring(0, lastDashIndex);
    const ticketIndex = parseInt(qrCode.substring(lastDashIndex + 1));

    const itemRes = await client.query(
      `SELECT oi.quantity, tc.name as category_name, o.customername 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       JOIN orders o ON oi.orderid = o.id
       WHERE oi.id = $1`,
      [dbId]
    );

    if (itemRes.rows.length === 0)
      return res
        .status(404)
        .json({ valid: false, message: "Biletul nu există în sistem." });

    const ticketData = itemRes.rows[0];
    if (ticketIndex > ticketData.quantity || ticketIndex < 1) {
      return res
        .status(400)
        .json({
          valid: false,
          message: "Număr bilet invalid (Index mismatch).",
        });
    }

    await client.query(
      "INSERT INTO scanned_tickets (unique_qr_id) VALUES ($1)",
      [qrCode]
    );

    res.json({
      valid: true,
      customer: ticketData.customername,
      category: ticketData.category_name,
      ticketNumber: `${ticketIndex} / ${ticketData.quantity}`,
    });
  } catch (error: any) {
    console.error("Scan Error:", error);
    res.status(500).json({ valid: false, message: "Eroare Server" });
  } finally {
    client.release();
  }
});

// Login Admin
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === "concert2025") {
    res.json({ success: true, token: "admin-logged-in-securely" });
  } else {
    res.status(401).json({ success: false, error: "Parolă incorectă" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
