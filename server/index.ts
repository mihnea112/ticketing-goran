import express from 'express';
import cors from 'cors';
import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- HELPER: Normalizează datele din DB (lowercase) în JS (camelCase) ---
// Postgres returnează 'totalquantity', dar React vrea 'totalQuantity'
const mapCategory = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  price: row.price,
  totalQuantity: row.totalquantity, // Mapping manual
  soldQuantity: row.soldquantity,   // Mapping manual
  badge: row.badge
});

// --- 1. GET TICKETS ---
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ticket_categories ORDER BY price DESC');
    
    const tickets = result.rows.map(mapCategory).map((t: any) => ({
      ...t,
      available: t.totalQuantity - t.soldQuantity,
      isSoldOut: t.totalQuantity <= t.soldQuantity
    }));

    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare la preluarea biletelor' });
  }
});

// --- 2. POST ORDER ---
app.post('/api/orders', async (req, res) => {
  const { customer, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let totalAmount = 0;
    const orderId = uuidv4();
    const orderItemsToInsert = [];

    for (const item of items) {
      // Citim categoria
      const resCat = await client.query('SELECT * FROM ticket_categories WHERE id = $1', [item.categoryId]);
      
      if (resCat.rows.length === 0) throw new Error(`Categoria ${item.categoryId} nu există.`);
      
      const categoryRaw = resCat.rows[0];
      const category = mapCategory(categoryRaw); // Convertim la camelCase

      const available = category.totalQuantity - category.soldQuantity;
      if (available < item.quantity) {
        throw new Error(`Stoc insuficient pentru ${category.name}. Disponibil: ${available}`);
      }

      // UPDATE: Folosim lowercase 'soldquantity'
      await client.query(
        'UPDATE ticket_categories SET soldquantity = soldquantity + $1 WHERE id = $2',
        [item.quantity, category.id]
      );

      const price = parseFloat(category.price);
      const lineTotal = price * item.quantity;
      totalAmount += lineTotal;

      orderItemsToInsert.push({
        id: uuidv4(),
        ticketCategoryId: category.id,
        quantity: item.quantity,
        pricePerUnit: price
      });
    }

    // INSERT ORDER: Folosim lowercase la coloane (createdat, customername etc)
    // Presupunem că Supabase le-a făcut lowercase.
    await client.query(
      `INSERT INTO orders (id, createdat, customername, customeremail, customerphone, totalamount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        new Date().toISOString(),
        `${customer.firstName} ${customer.lastName}`,
        customer.email,
        customer.phone,
        totalAmount,
        'CONFIRMED'
      ]
    );

    // INSERT ITEMS: Folosim lowercase (orderid, ticketcategoryid...)
    for (const oi of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (id, orderid, ticketcategoryid, quantity, priceperunit)
         VALUES ($1, $2, $3, $4, $5)`,
        [oi.id, orderId, oi.ticketCategoryId, oi.quantity, oi.pricePerUnit]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, orderId });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Order failed:", error.message);
    res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// --- 3. GET ADMIN STATS ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const resOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
    // Atenție: folosim totalamount (lowercase)
    const resRevenue = await pool.query('SELECT SUM(totalamount) as total FROM orders'); 
    const resCategories = await pool.query('SELECT * FROM ticket_categories');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Atenție: createdat, totalamount (lowercase)
    const resHistory = await pool.query(
      'SELECT createdat, totalamount FROM orders WHERE createdat >= $1',
      [sevenDaysAgo.toISOString()]
    );

    const categories = resCategories.rows.map(mapCategory);
    const salesHistory = resHistory.rows;

    const chartData = salesHistory.reduce((acc: any[], curr: any) => {
      // Postgres returnează lowercase: curr.createdat, curr.totalamount
      const day = new Date(curr.createdat).toLocaleDateString('ro-RO', { weekday: 'short' });
      const existing = acc.find(x => x.day === day);
      const amount = parseFloat(curr.totalamount);
      
      if (existing) existing.sales += amount;
      else acc.push({ day, sales: amount });
      return acc;
    }, []);

    res.json({
      stats: {
        revenue: parseFloat(resRevenue.rows[0].total) || 0,
        orders: parseInt(resOrders.rows[0].count),
        ticketsSold: categories.reduce((acc: number, c: any) => acc + c.soldQuantity, 0),
        totalCapacity: categories.reduce((acc: number, c: any) => acc + c.totalQuantity, 0)
      },
      chart: chartData,
      inventory: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare server admin' });
  }
});

// --- 4. SEED ENDPOINT (Fixat pentru Lowercase) ---
app.get('/seed', async (req, res) => {
  try {
    const check = await pool.query('SELECT COUNT(*) as count FROM ticket_categories');
    if (parseInt(check.rows[0].count) > 0) {
      res.send('Database already seeded!');
      return;
    }

    // FIX AICI: Am scos ghilimelele de la coloane. Acum sunt lowercase implicit.
    const queryText = `
      INSERT INTO ticket_categories (id, code, name, price, totalquantity, badge) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(queryText, ['1', 'gold', 'VIP Gold', 450, 100, 'EXCLUSIV']);
    await pool.query(queryText, ['2', 'tribune', 'Tribună', 250, 500, 'POPULAR']);
    await pool.query(queryText, ['3', 'general', 'Acces General', 150, 2000, 'BEST VALUE']);

    res.send('Supabase seeded successfully!');
  } catch (err: any) {
    console.error(err);
    res.status(500).send('Error seeding: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Node+Postgres Server running on http://localhost:${PORT} 🚀`);
});