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
  process.exit(1); // Oprim serverul dacă nu avem cheie
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
  apiVersion: "2025-12-15.clover", // Sau "2024-12-18.acacia" (depinde de versiunea instalata)
});

app.use(cors());
app.use(express.json());

// --- HELPER: Normalizează datele din DB ---
const mapCategory = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  price: Number(row.price),
  totalQuantity: Number(row.totalquantity || row.totalQuantity || 0),
  soldQuantity: Number(row.soldquantity || row.soldQuantity || 0),
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
// RUTA 2: POST ORDER (FIXED & VALIDATED)
// ==========================================
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer, items } = req.body;

    // --- 1. DEBUGGING LOGS (Ca să vezi ce primești de la Frontend) ---
    console.log("📥 POST /api/orders request received");
    console.log("👤 Customer:", customer);
    console.log("🛒 Items:", JSON.stringify(items, null, 2));

    // --- 2. VALIDĂRI PRELIMINARE ---
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

    await client.query("BEGIN"); // Start Tranzacție

    let totalAmount = 0;
    const lineItemsForStripe = [];

    // --- 3. PROCESARE ITEMS ---
    for (const item of items) {
      // VALIDARE CRITICĂ: Verificăm dacă ID-ul există înainte să întrebăm baza de date
      if (
        !item.categoryId ||
        item.categoryId === "undefined" ||
        item.categoryId === "null"
      ) {
        throw new Error(
          `Item invalid detectat! ID-ul categoriei lipsește. (Quantity: ${item.quantity})`
        );
      }

      // Verificăm dacă categoria există în DB
      const ticketRes = await client.query(
        "SELECT * FROM ticket_categories WHERE id = $1",
        [item.categoryId]
      );

      if (ticketRes.rows.length === 0) {
        throw new Error(`Nu există bilet cu ID-ul: ${item.categoryId}`);
      }

      const ticketData = mapCategory(ticketRes.rows[0]);

      // Calculăm prețul
      const price = ticketData.price;
      totalAmount += price * item.quantity;

      // Adăugăm la Stripe
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

    // --- 4. SALVARE ÎN DB ---

    // Inserăm Comanda
    const orderRes = await client.query(
      `INSERT INTO orders (customername, customeremail, totalamount, status) 
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [
        customer.firstName + " " + customer.lastName,
        customer.email,
        totalAmount,
      ]
    );
    const orderId = orderRes.rows[0].id;

    // Inserăm Biletele (Order Items)
    for (const item of items) {
      // Mai facem un query rapid pentru prețul curent (pentru consistență istorică)
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

    await client.query("COMMIT"); // Commit Tranzacție

    // --- 5. STRIPE CHECKOUT ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItemsForStripe,
      mode: "payment",
      success_url: `${CLIENT_URL}/success?orderId=${orderId}`,
      cancel_url: `${CLIENT_URL}/`,
      customer_email: customer.email,
      metadata: { orderId: orderId },
    });

    console.log("✅ Session created:", session.url);
    res.json({ success: true, url: session.url });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("❌ EROARE SERVER:", error.message);
    // Trimitem eroarea clară la frontend
    res.status(500).json({
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

  // Validare ID
  if (!id || id === "undefined" || id === "null") {
    return res.status(400).json({ error: "ID comandă invalid." });
  }

  try {
    const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [
      id,
    ]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Comanda nu a fost găsită" });
    }

    const itemsRes = await pool.query(
      `SELECT 
        oi.id as db_id, 
        oi.quantity,
        oi.priceperunit, 
        tc.name as category_name, 
        tc.code as category_code 
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

    res.json({
      ...orderRes.rows[0],
      items: expandedTickets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Eroare server" });
  }
});
// ==========================================
// RUTA 5: ADMIN STATS (DASHBOARD)
// ==========================================
app.get("/api/admin/stats", async (req, res) => {
  try {
    // 1. Total Încasări (folosim COALESCE pentru a evita null dacă nu sunt comenzi)
    const resRevenue = await pool.query(
      "SELECT SUM(totalamount) as total FROM orders"
    );
    const totalRevenue = parseFloat(resRevenue.rows[0].total || "0");

    // 2. Total Comenzi
    const resOrders = await pool.query("SELECT COUNT(*) as count FROM orders");
    const totalOrders = parseInt(resOrders.rows[0].count || "0");

    // 3. Stocuri (Categorii & Bilete vândute)
    const resCategories = await pool.query(
      "SELECT * FROM ticket_categories ORDER BY price DESC"
    );
    // Folosim helper-ul mapCategory definit la începutul fișierului
    const categories = resCategories.rows.map(mapCategory);

    const ticketsSold = categories.reduce(
      (acc: number, c: any) => acc + c.soldQuantity,
      0
    );
    const totalCapacity = categories.reduce(
      (acc: number, c: any) => acc + c.totalQuantity,
      0
    );

    // 4. Grafic Vânzări (Ultimele 7 zile)
    // Atenție: Coloana în DB este 'created_at', nu 'createdat'
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const resHistory = await pool.query(
      "SELECT created_at, totalamount FROM orders WHERE created_at >= $1 ORDER BY created_at ASC",
      [sevenDaysAgo.toISOString()]
    );

    // Procesare date pentru grafic (grupare pe zile)
    const chartData = resHistory.rows.reduce((acc: any[], curr: any) => {
      const dateObj = new Date(curr.created_at);
      // Formatăm data ca "Lun", "Mar" etc.
      const day = dateObj.toLocaleDateString("ro-RO", { weekday: "short" });

      const existing = acc.find((x) => x.day === day);
      const amount = parseFloat(curr.totalamount);

      if (existing) {
        existing.sales += amount;
      } else {
        acc.push({ day, sales: amount });
      }
      return acc;
    }, []);

    res.json({
      stats: {
        revenue: totalRevenue,
        orders: totalOrders,
        ticketsSold,
        totalCapacity,
      },
      chart: chartData,
      inventory: categories,
    });
  } catch (error) {
    console.error("❌ Admin Stats Error:", error);
    res.status(500).json({ error: "Eroare la generarea statisticilor" });
  }
});
// ==========================================
// RUTA 4: SEED DATABASE
// ==========================================
app.get("/seed", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT COUNT(*) as count FROM ticket_categories"
    );
    if (parseInt(check.rows[0].count) > 0) {
      res.send("Database already seeded!");
      return;
    }

    const queryText = `
      INSERT INTO ticket_categories (code, name, price, totalquantity, badge) 
      VALUES ($1, $2, $3, $4, $5)
    `;

    await pool.query(queryText, ["gold", "VIP Gold", 450, 100, "EXCLUSIV"]);
    await pool.query(queryText, ["tribune", "Tribună", 250, 500, "POPULAR"]);
    await pool.query(queryText, [
      "general",
      "Acces General",
      150,
      2000,
      "BEST VALUE",
    ]);

    res.send("Supabase seeded successfully with UUIDs!");
  } catch (err: any) {
    console.error(err);
    res.status(500).send("Error seeding: " + err.message);
  }
});
// ==========================================
// RUTA 5: CONFIRM ORDER (Update Status & Stoc)
// ==========================================
app.post("/api/orders/confirm", async (req, res) => {
  const { orderId } = req.body;
  const client = await pool.connect();

  try {
    if (!orderId) throw new Error("Lipseste Order ID");

    await client.query("BEGIN");

    // 1. Verificăm dacă comanda e deja plătită (ca să nu scădem stocul de 2 ori la refresh)
    const checkRes = await client.query(
      "SELECT status FROM orders WHERE id = $1",
      [orderId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error("Comanda nu există");
    }

    if (checkRes.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return res.json({
        success: true,
        message: "Comanda era deja confirmată",
      });
    }

    // 2. Actualizăm Statusul comenzii în 'paid'
    await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
      orderId,
    ]);

    // 3. Actualizăm STOCUL (soldQuantity) pentru fiecare bilet din comandă
    // Luăm itemele din comandă
    const itemsRes = await client.query(
      "SELECT ticketcategoryid, quantity FROM order_items WHERE orderid = $1",
      [orderId]
    );

    for (const item of itemsRes.rows) {
      // Creștem soldQuantity cu cantitatea cumpărată
      // Folosim ghilimele "soldQuantity" pentru că Postgres e case-sensitive uneori
      await client.query(
        `UPDATE ticket_categories 
         SET "soldQuantity" = "soldQuantity" + $1 
         WHERE id = $2`,
        [item.quantity, item.ticketcategoryid]
      );
    }

    await client.query("COMMIT");
    console.log(
      `✅ Comanda ${orderId} a fost confirmată și stocul actualizat.`
    );
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
// RUTA 6: ADMIN SCAN (CHECK-IN)
// ==========================================
app.post("/api/admin/scan", async (req, res) => {
  const { qrCode } = req.body; // Format așteptat: "order_item_uuid-index" (ex: "abc-123-1")
  const client = await pool.connect();

  try {
    console.log("📸 Scanat:", qrCode);

    if (!qrCode || !qrCode.includes("-")) {
      return res
        .status(400)
        .json({ valid: false, message: "Format QR Invalid" });
    }

    // 1. Verificăm dacă a fost deja scanat
    const checkScan = await client.query(
      "SELECT * FROM scanned_tickets WHERE unique_qr_id = $1",
      [qrCode]
    );

    if (checkScan.rows.length > 0) {
      const scannedAt = new Date(
        checkScan.rows[0].scanned_at
      ).toLocaleTimeString();
      return res.status(409).json({
        valid: false,
        message: `Bilet DEJA FOLOSIT la ora ${scannedAt}!`,
      });
    }

    // 2. Descompunem ID-ul: "uuid_lung-1" -> uuid_lung și 1
    const lastDashIndex = qrCode.lastIndexOf("-");
    const dbId = qrCode.substring(0, lastDashIndex);
    const ticketIndex = parseInt(qrCode.substring(lastDashIndex + 1));

    // 3. Verificăm dacă biletul există în baza de date
    const itemRes = await client.query(
      `SELECT oi.quantity, tc.name as category_name, o.customername 
       FROM order_items oi
       JOIN ticket_categories tc ON oi.ticketcategoryid = tc.id
       JOIN orders o ON oi.orderid = o.id
       WHERE oi.id = $1`,
      [dbId]
    );

    if (itemRes.rows.length === 0) {
      return res
        .status(404)
        .json({ valid: false, message: "Biletul nu există în sistem." });
    }

    const ticketData = itemRes.rows[0];

    // 4. Verificăm dacă indexul e valid (ex: dacă a cumpărat 2 bilete, indexul poate fi 1 sau 2, nu 3)
    if (ticketIndex > ticketData.quantity || ticketIndex < 1) {
      return res
        .status(400)
        .json({
          valid: false,
          message: "Număr bilet invalid (Index mismatch).",
        });
    }

    // 5. Totul e OK -> Marcăm ca scanat
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
