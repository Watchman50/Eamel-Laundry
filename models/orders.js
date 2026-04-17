const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database setup
const dbPath = path.resolve(process.env.DB_PATH || "./database/laundry.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database at", dbPath, ":", err.message);
  } else {
    console.log("Connected to SQLite database at", dbPath);
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        service TEXT DEFAULT '',
        cart TEXT,
        pickup_date TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        address TEXT NOT NULL,
        special_instructions TEXT,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        payment_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,


      `CREATE TABLE IF NOT EXISTS order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        changed_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,

      `CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ];


  tables.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`Error creating table ${index + 1}:`, err.message);
      } else {
        console.log(`Table ${index + 1} created/initialized successfully`);
      }
    });
  });

  // Migrate existing orders schema if columns are missing
  db.all(`PRAGMA table_info(orders)`, (err, columns) => {
    if (err) {
      console.error("Error reading orders table schema:", err.message);
      return;
    }

    const existingColumns = columns.map((col) => col.name);
    const migrationQueries = [];

    if (!existingColumns.includes("cart")) {
      migrationQueries.push(`ALTER TABLE orders ADD COLUMN cart TEXT`);
    }

    if (!existingColumns.includes("payment_status")) {
      migrationQueries.push(
        `ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`,
      );
    }
    if (!existingColumns.includes("status")) {
      migrationQueries.push(
        `ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'`,
      );
    }
    if (!existingColumns.includes("updated_at")) {
      migrationQueries.push(
        `ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
      );
    }

    migrationQueries.forEach((sql) => {
      db.run(sql, (err) => {
        if (err) {
          console.error("Error migrating orders schema:", err.message, sql);
        } else {
          console.log("Migrated orders schema:", sql);
        }
      });
    });
  });
}

// Order Model Methods
class Order {
  // Create new order
  static create(orderData, callback) {
    const {
      customerName,
      phone,
      email,
      cart,
      totalAmount,
      pickupDate,
      deliveryDate,
      address,
      specialInstructions,
    } = orderData;

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const finalCart = cart ? JSON.stringify(cart) : null;
    const finalTotalAmount = parseFloat(totalAmount) || 0;

    const sql = `INSERT INTO orders
      (order_id, customer_name, phone, email, service, cart, pickup_date, delivery_date, address, special_instructions, total_amount)
      VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)`;


    db.run(
      sql,
      [
        orderId,
        customerName,
        phone,
        email || null,
        finalCart,
        pickupDate,
        deliveryDate,
        address,
        specialInstructions || null,
        finalTotalAmount,
      ],
      function (err) {
        if (err) {
          return callback(err);
        }

        // Log order creation
        Order.addHistory(this.lastID, "pending", "Order created", "customer");

        callback(null, {
          id: this.lastID,
          orderId: orderId,
          totalAmount: finalTotalAmount,
        });
      },
    );
  }


  // Get all orders with pagination
  static getAll(page = 1, limit = 10, status = null, callback) {
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM orders`;
    let params = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(
          "[getAll] Query error:",
          err.message,
          "SQL:",
          sql,
          "Params:",
          params,
        );
        return callback(err);
      }

      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM orders`;
      let countParams = [];
      if (status) {
        countSql += ` WHERE status = ?`;
        countParams = [status];
      }

      db.get(countSql, countParams, (err, countResult) => {
        if (err) {
          console.error("[getAll] Count query error:", err.message);
          return callback(err);
        }

        console.log(
          `[getAll] Found ${rows.length} orders, total ${countResult.total}`,
        );
        callback(null, {
          orders: rows,
          pagination: {
            page: page,
            limit: limit,
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit),
          },
        });
      });
    });
  }

  // Get order by ID
  static getById(id, callback) {
    const sql = `SELECT * FROM orders WHERE id = ?`;
    db.get(sql, [id], callback);
  }

  // Get order by order_id
  static getByOrderId(orderId, callback) {
    const sql = `SELECT *, cart FROM orders WHERE order_id = ?`;
    db.get(sql, [orderId], callback);
  }


  // Update order status
  static updateStatus(
    id,
    status,
    notes = null,
    adminUsername = "system",
    callback,
  ) {
    const sql = `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, [status, id], function (err) {
      if (err) {
        return callback(err);
      }

      if (this.changes > 0) {
        // Log status change
        Order.addHistory(id, status, notes, adminUsername);
        callback(null, { id: id, status: status });
      } else {
        callback(new Error("Order not found"));
      }
    });
  }

  // Delete order
  static delete(id, callback) {
    const sql = `DELETE FROM orders WHERE id = ?`;
    db.run(sql, [id], callback);
  }

  // Add order history
  static addHistory(orderId, status, notes = null, changedBy = "system") {
    const sql = `INSERT INTO order_history (order_id, status, notes, changed_by) VALUES (?, ?, ?, ?)`;
    db.run(sql, [orderId, status, notes, changedBy]);
  }

  // Get order history
  static getHistory(orderId, callback) {
    const sql = `SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC`;
    db.all(sql, [orderId], callback);
  }

  // Log admin action
  static logAdminAction(adminUsername, action, details, ipAddress) {
    // Check if admin logging is enabled
    if (process.env.ADMIN_LOG_ENABLED !== "true") {
      return;
    }

    const sql = `INSERT INTO admin_logs (admin_username, action, details, ip_address) VALUES (?, ?, ?, ?)`;
    db.run(sql, [adminUsername, action, details, ipAddress], (err) => {
      if (err) {
        console.error("Failed to log admin action:", err);
      }
    });
  }

  // Get dashboard statistics
  static getDashboardStats(callback) {
    const queries = {
      totalOrders: `SELECT COUNT(*) as count FROM orders`,
      pendingOrders: `SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`,
      completedOrders: `SELECT COUNT(*) as count FROM orders WHERE status = 'completed'`,
      totalRevenue: `SELECT SUM(total_amount) as total FROM orders WHERE status = 'completed'`,
      recentOrders: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`,
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach((key) => {
      db.get(queries[key], [], (err, row) => {
        if (err) {
          return callback(err);
        }

        results[key] = row;
        completed++;

        if (completed === total) {
          callback(null, {
            totalOrders: results.totalOrders.count,
            pendingOrders: results.pendingOrders.count,
            completedOrders: results.completedOrders.count,
            totalRevenue: results.totalRevenue.total || 0,
            recentOrders: results.recentOrders ? [results.recentOrders] : [],
          });
        }
      });
    });
  }
}

// Close database connection on process exit
process.on("exit", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed");
    }
  });
});

module.exports = Order;
