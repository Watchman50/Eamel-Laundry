require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

const Order = require("./models/orders");
const {
  authenticateToken,
  adminLogin,
  validateOrderInput,
  sanitizeInput,
} = require("./middleware/auth");



const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://maps.google.com",
          "https://maps.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https://*"],
        childSrc: ["https://maps.google.com"],
        frameSrc: [
          "https://maps.google.com",
          "https://www.google.com",
          "https://maps.googleapis.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.google.com",
          "https://maps.googleapis.com",
          "https://www.google.com",
        ],
      },
    },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input sanitization
app.use(sanitizeInput);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, "client")));

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Admin login
app.post("/api/admin/login", adminLogin);


// Create new order (public)
app.post("/api/orders", validateOrderInput, (req, res) => {
  const rawTotal = req.body.totalAmount || req.body.total_amount;
  const orderData = {
    customerName: req.body.customerName,
    phone: req.body.phone,
    email: req.body.email,
    pickupDate: req.body.pickupDate,
    deliveryDate: req.body.deliveryDate,
    address: req.body.address,
    specialInstructions: req.body.specialInstructions,
    cart: JSON.stringify(req.body.cart || []),
    totalAmount: parseFloat(req.body.totalAmount) || 0,
  };



  Order.create(orderData, (err, result) => {
    if (err) {
      console.error("Error creating order:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to create order",
      });
    }

    // MOCK WhatsApp notification to admin (real Twilio later)
    const adminMessage =
      `🚨 NEW ORDER! ORD-${result.orderId}\n` +
      `Customer: ${orderData.customerName}\n` +
      `Phone: ${orderData.phone}\n` +
      `Total: ₦${orderData.totalAmount.toLocaleString()}\n` +
      `Pickup: ${orderData.pickupDate}\n` +
      `Items: ${orderData.cart.items ? orderData.cart.items.length : "Multiple"}`;

    console.log("📱 MOCK WhatsApp sent to admin(s):", adminMessage);
    // TODO: Real Twilio - require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    // .messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: process.env.ADMIN_PHONE, body: adminMessage })

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: result,
    });
  });
});

// Get all orders (admin only)
app.get("/api/orders", authenticateToken, (req, res) => {
  console.log(
    `[API] GET /api/orders - page:${req.query.page}, limit:${req.query.limit}, status:${req.query.status}, user:${req.user?.username}`,
  );

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { status } = req.query;

  Order.getAll(page, limit, status, (err, result) => {
    if (err) {
      console.error("[Orders Model] Error in getAll:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders: " + err.message,
      });
    }

    console.log(`[API] Orders fetched: ${result.orders.length} orders`);
    res.json({
      success: true,
      data: result,
    });
  });
});

// Get order by ID (admin only)
app.get("/api/orders/:id", authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);

  Order.getById(id, (err, order) => {
    if (err) {
      console.error("Error fetching order:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order",
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  });
});

// Update order status (admin only)
app.put(
  "/api/orders/:id/status",
  authenticateToken,
  [
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "ready",
        "delivered",
        "cancelled",
      ])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes too long"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const adminUsername = req.user.username;

    Order.updateStatus(id, status, notes, adminUsername, (err, result) => {
      if (err) {
        console.error("Error updating order status:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to update order status",
        });
      }

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: result,
      });
    });
  },
);

// Delete order (admin only)
app.delete("/api/orders/:id", authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);

  Order.delete(id, (err) => {
    if (err) {
      console.error("Error deleting order:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete order",
      });
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  });
});

// Get order history (admin only)
app.get("/api/orders/:id/history", authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);

  Order.getHistory(id, (err, history) => {
    if (err) {
      console.error("Error fetching order history:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order history",
      });
    }

    res.json({
      success: true,
      data: history,
    });
  });
});

// Get dashboard statistics (admin only)
app.get("/api/dashboard/stats", authenticateToken, (req, res) => {
  Order.getDashboardStats((err, stats) => {
    if (err) {
      console.error("Error fetching dashboard stats:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard statistics",
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  });
});

// Track order by order ID (public)
app.get("/api/track/:orderId", (req, res) => {
  const { orderId } = req.params;

  Order.getByOrderId(orderId, (err, order) => {
    if (err) {
      console.error("Error fetching order:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order",
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get order history
    Order.getHistory(order.id, (err, history) => {
      if (err) {
        console.error("Error fetching order history:", err);
        history = [];
      }

      res.json({
        success: true,
        data: {
          order: order,
          history: history,
        },
      });
    });
  });
});

// Serve frontend for all non-API routes
app.get("*", (req, res) => {
  // Skip API routes
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  }

  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Eamel Laundry Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔒 Security: Enabled`);
  console.log(`📁 Static files served from: ${path.join(__dirname, "client")}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  process.exit(0);
});
