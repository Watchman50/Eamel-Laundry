# Fix Errors in JS Files, Server, and package.json

**Approved Plan Implementation**

## Steps to Complete:

### 1. [ ] Create .env file with required variables

### 2. [ ] Fix client/js/booking.js: formData, totalAmount parsing, notifications

### 3. [ ] Fix models/orders.js: Add cart column migration, update create()

### 4. [ ] Fix middleware/auth.js: Make authenticateAdmin proper middleware, add login route

### 5. [ ] Fix server.js: Proper middleware usage, update POST /api/orders for cart handling

### 6. [ ] Fix client/js/admin.js & dashboard.js: Replace hardcoded localhost URLs

### 7. [ ] Restart server and test full flow (booking → admin view → status update)

### 8. [ ] Verify DB and mark complete

**Current Status:** Starting step-by-step fixes...

**Testing Commands:**

- Submit booking.html form
- Login admin.html (default: admin / password)
- Check orders table, update status
- Track order via dashboard.html?track=ORD-xxx
