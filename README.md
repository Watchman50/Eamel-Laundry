# Eamel Laundry Backend

A secure, full-stack laundry management system built with Node.js, Express, and SQLite.

## 🚀 Features

- **Secure Authentication**: JWT-based admin authentication with bcrypt password hashing
- **Order Management**: Complete CRUD operations for laundry orders
- **Real-time Tracking**: Public order tracking by order ID
- **Dashboard Analytics**: Admin dashboard with statistics and insights
- **Security First**: Helmet, CORS, rate limiting, input validation, and sanitization
- **WhatsApp Integration**: Automatic WhatsApp notifications for orders
- **Responsive Frontend**: Modern, mobile-friendly interface

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Security**: Helmet, CORS, Express Rate Limit, JWT, Bcrypt
- **Validation**: Express Validator
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)

## 📁 Project Structure

```
eamel-laundry/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── middleware/
│   └── auth.js           # Authentication middleware
├── models/
│   └── orders.js         # Database models and operations
├── client/               # Frontend files
│   ├── index.html
│   ├── about.html
│   ├── services.html
│   ├── booking.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── contact.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── booking.js
│       ├── dashboard.js
│       └── admin.js
├── database/             # SQLite database files
└── uploads/              # File uploads (future use)
```

## 🔧 Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment Setup**:
   - Copy `.env` file and update the values:

   ```bash
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_PATH=./database/laundry.db
   ```

# JWT Configuration

JWT_SECRET=<set a strong secret in your .env or environment>
JWT_EXPIRE=24h

# Admin Credentials

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<store only the bcrypt hash in .env; do NOT commit .env>

# Security

CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

````

4. **Start the server**:

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
````

5. **Access the application**:
   - Frontend: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin.html`

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Server-side validation with express-validator
- **Input Sanitization**: XSS protection
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **SQL Injection Protection**: Parameterized queries
- **Content Security Policy**: XSS protection

## 📊 API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/orders` - Create new order
- `GET /api/track/:orderId` - Track order by ID

### Admin Endpoints (Require Authentication)

- `POST /api/admin/login` - Admin login
- `GET /api/orders` - Get all orders (paginated)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order
- `GET /api/orders/:id/history` - Get order history
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🗄️ Database Schema

### Orders Table

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  pickup_date TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  address TEXT NOT NULL,
  special_instructions TEXT,
  status TEXT DEFAULT 'pending',
  total_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Order History Table

```sql
CREATE TABLE order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by TEXT DEFAULT 'system',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders (id)
);
```

### Admin Logs Table

```sql
CREATE TABLE admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔑 Default Admin Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password in production by updating the `ADMIN_PASSWORD` in the `.env` file. The current hash corresponds to 'admin123'.

## 🚀 Deployment

1. **Environment Variables**: Update all values in `.env` for production
2. **Database**: The SQLite database will be created automatically on first run
3. **HTTPS**: Configure SSL certificates for production
4. **Process Manager**: Use PM2 or similar for production deployment
5. **Backup**: Regularly backup the SQLite database file

## 📱 Frontend Integration

The frontend automatically connects to the backend API. Key integration points:

- **Booking Form**: Submits to `/api/orders` with fallback to WhatsApp
- **Dashboard**: Loads orders from `/api/orders` (authenticated)
- **Admin Panel**: Full CRUD operations via API endpoints
- **Order Tracking**: Public tracking via `/api/track/:orderId`

## 🧪 Testing

```bash
# Run the server
npm start

# Test endpoints with curl
curl http://localhost:3000/api/health

# Test order creation
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test User","phone":"+1234567890","service":"wash-fold","pickupDate":"2024-01-15","deliveryDate":"2024-01-16","address":"Test Address"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support, contact the development team or create an issue in the repository.

---

**Eamel Laundry** - Professional Laundry Services Management System
