const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const { username, password } = req.body;

  // Check if credentials match environment variables
  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Verify password
  bcrypt.compare(password, process.env.ADMIN_PASSWORD, (err, isValid) => {
    if (err || !isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username: username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE },
    );

    req.token = token;
    next();
  });
};

// Input validation middleware
const validateOrderInput = (req, res, next) => {
  const { customerName, phone, pickupDate, deliveryDate, address, cart } =
    req.body;

  const errors = [];

  if (!customerName || customerName.trim().length < 2) {
    errors.push("Customer name must be at least 2 characters long");
  }

  if (
    !phone || phone.trim().length < 8
  ) {
    errors.push("Valid phone number is required (min 8 digits)");
  }

  if (!pickupDate || isNaN(Date.parse(pickupDate))) {
    errors.push("Valid pickup date is required");
  }

  if (!deliveryDate || isNaN(Date.parse(deliveryDate))) {
    errors.push("Valid delivery date is required");
  }

  if (!address || address.trim().length < 10) {
    errors.push("Delivery address must be at least 10 characters long");
  }

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    errors.push("At least one item must be in the cart");
  } else {
    // Validate cart items
    cart.forEach((item, index) => {
      if (!item.item || !item.qty || !item.price) {
        errors.push(`Cart item ${index + 1} is invalid`);
      }
      if ((item.qty || item.quantity || 0) <= 0) {
        errors.push(`Quantity for ${item.item} must be greater than 0`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors,
    });
  }

  next();
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Remove potentially harmful characters and trim whitespace
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;
    return str.replace(/[<>\"'&]/g, "").trim();
  };

  // Sanitize body fields
  for (let key in req.body) {
    if (typeof req.body[key] === "string") {
      req.body[key] = sanitizeString(req.body[key]);
    }
  }

  // Sanitize query parameters
  for (let key in req.query) {
    if (typeof req.query[key] === "string") {
      req.query[key] = sanitizeString(req.query[key]);
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  validateOrderInput,
  sanitizeInput,
};
