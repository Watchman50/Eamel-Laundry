// Dashboard functionality with API integration
let currentOrders = [];
let currentPage = 1;
const ordersPerPage = 10;

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

// Load dashboard data
async function loadDashboard() {
  try {
    // Get URL parameter for order tracking
    const urlParams = new URLSearchParams(window.location.search);
    const trackOrderId = urlParams.get('track');

    if (trackOrderId) {
      // Track specific order
      await trackOrder(trackOrderId);
    } else {
      // Load user's orders (if logged in) or show login prompt
      await loadUserOrders();
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showMessage('Failed to load dashboard data', 'error');
  }
}

// Track specific order by ID
async function trackOrder(orderId) {
  try {
    const response = await fetch(`http://localhost:3000/api/track/${orderId}`);

    if (!response.ok) {
      throw new Error('Order not found');
    }

    const result = await response.json();

    if (result.success) {
      displayOrderTracking(result.data);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error tracking order:', error);
    showOrderNotFound();
  }
}

// Load user's orders (requires authentication)
async function loadUserOrders() {
  const token = localStorage.getItem('authToken');

  if (!token) {
    showLoginPrompt();
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('authToken');
        showLoginPrompt();
        return;
      }
      throw new Error('Failed to load orders');
    }

    const result = await response.json();

    if (result.success) {
      currentOrders = result.data.orders;
      displayOrders(currentOrders);
      updatePagination(result.data.pagination);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    showMessage('Failed to load orders. Please try again.', 'error');
  }
}

// Display order tracking information
function displayOrderTracking(data) {
  const container =
    document.getElementById('orders') ||
    document.querySelector('.dashboard-content');

  if (!container) {
    console.error('No container found for order tracking');
    return;
  }

  const order = data.order;
  const history = data.history || [];

  container.innerHTML = `
    <div class="order-tracking">
      <div class="tracking-header">
        <h2>Order Tracking</h2>
        <div class="order-id">Order #${order.order_id}</div>
      </div>

      <div class="order-summary">
        <div class="summary-card">
          <h3>Order Details</h3>
          <div class="order-info">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Service:</strong> ${formatServiceName(order)}</p>
            <p><strong>Quantity:</strong> ${getOrderQty(order)} items</p>
            ${(() => {
              const itemsInfo = parseItems(order);
              if (itemsInfo.fullItems) {
                return `<p><strong>Items:</strong> ${itemsInfo.fullItems.map((item) => `${item.qty}x ${item.item} (${item.service})`).join(', ')}</p>`;
              }
              return '';
            })()}
            <p><strong>Status:</strong> <span class="status-pill ${getStatusClass(order.status)}">${order.status}</span></p>
            <p><strong>Pickup Date:</strong> ${formatDate(order.pickup_date)}</p>
            <p><strong>Delivery Date:</strong> ${formatDate(order.delivery_date)}</p>
            <p><strong>Total Amount:</strong> ₦${order.total_amount.toLocaleString()}</p>
          </div>
        </div>

        <div class="summary-card">
          <h3>Order History</h3>
          <div class="history-timeline">
            ${
              history.length > 0
                ? history
                    .map(
                      (item) => `
                <div class="history-item">
                  <div class="history-status ${getStatusClass(item.status)}">${item.status}</div>
                  <div class="history-details">
                    <div class="history-date">${formatDateTime(item.created_at)}</div>
                    ${item.notes ? `<div class="history-notes">${item.notes}</div>` : ''}
                    <div class="history-by">Updated by: ${item.changed_by}</div>
                  </div>
                </div>
              `,
                    )
                    .join('')
                : '<p>No history available</p>'
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// Display orders list
function displayOrders(orders) {
  const container = document.getElementById('orders');

  if (!container) {
    console.error('Orders container not found');
    return;
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="no-orders">
        <h3>No orders found</h3>
        <p>You haven\\'t placed any orders yet.</p>
        <a href="booking.html" class="btn primary">Book Your First Order</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders
    .map(
      (order) => `
    <div class="card order-card" onclick="viewOrderDetails('${order.order_id}')">
      <div class="order-header">
        <span class="order-id">${order.order_id}</span>
        <span class="status-pill ${getStatusClass(order.status)}">${order.status}</span>
      </div>
      <div class="order-details">
        <p><strong>Service:</strong> ${formatServiceName(order.service)}</p>
        <p><strong>Pickup:</strong> ${formatDate(order.pickup_date)}</p>
        <p><strong>Delivery:</strong> ${formatDate(order.delivery_date)}</p>
        <p><strong>Amount:</strong> ₦${order.total_amount.toLocaleString()}</p>
      </div>
      <div class="order-actions">
        <button onclick="event.stopPropagation(); trackOrder('${order.order_id}')" class="btn secondary small">Track</button>
      </div>
    </div>
  `,
    )
    .join('');
}

// Update pagination
function updatePagination(pagination) {
  const paginationEl = document.querySelector('.pagination');
  if (!paginationEl) return;

  const { page, pages, total } = pagination;

  if (pages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }

  paginationEl.style.display = 'flex';
  paginationEl.innerHTML = `
    <button onclick="changePage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>Previous</button>
    <span>Page ${page} of ${pages} (${total} orders)</span>
    <button onclick="changePage(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next</button>
  `;
}

// Change page
function changePage(page) {
  currentPage = page;
  loadUserOrders();
}

// View order details
function viewOrderDetails(orderId) {
  window.location.href = `dashboard.html?track=${orderId}`;
}

// Show login prompt
function showLoginPrompt() {
  const container =
    document.getElementById('orders') ||
    document.querySelector('.dashboard-content');

  if (container) {
    container.innerHTML = `
      <div class="login-prompt">
        <h3>Access Your Orders</h3>
        <p>Please log in to view your order history and track your laundry.</p>
        <div class="login-actions">
          <a href="admin.html" class="btn primary">Login as Admin</a>
          <p class="note">Contact us to track your order by phone</p>
        </div>
      </div>
    `;
  }
}

// Show order not found
function showOrderNotFound() {
  const container =
    document.getElementById('orders') ||
    document.querySelector('.dashboard-content');

  if (container) {
    container.innerHTML = `
      <div class="order-not-found">
        <h3>Order Not Found</h3>
        <p>The order ID you entered could not be found. Please check your order ID and try again.</p>
        <div class="actions">
          <a href="dashboard.html" class="btn primary">Back to Dashboard</a>
          <a href="contact.html" class="btn secondary">Contact Support</a>
        </div>
      </div>
    `;
  }
}

// Utility functions
function parseItems(order) {
  if (!order.items) return { summary: null, totalQty: 0 };

  try {
    const items = JSON.parse(order.items);
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const summary = items
      .map((item) => {
        const serviceName = item.service.replace('-', ' & ');
        return `${item.qty}x ${item.item.replace(/-/g, ' ').replace(/\\b([a-z])/g, (m) => m.toUpperCase())} (${serviceName})`;
      })
      .join(', ');
    return {
      summary: summary.slice(0, 40) + '...',
      totalQty,
      fullItems: items,
    };
  } catch (e) {
    return { summary: null, totalQty: 0 };
  }
}

function formatServiceName(order) {
  const itemsInfo = parseItems(order);
  if (itemsInfo.summary) return itemsInfo.summary;
  const serviceNames = {
    'wash-fold': 'Wash & Fold',
    'dry-cleaning': 'Dry Cleaning',
    'wash-iron': 'Wash & Iron',
    ironing: 'Ironing Only',
  };
  return serviceNames[order.service] || order.service || 'N/A';
}

function getOrderQty(order) {
  const itemsInfo = parseItems(order);
  return itemsInfo.totalQty || order.quantity || 0;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return 'completed';
    case 'pending':
    case 'confirmed':
      return 'pending';
    case 'processing':
    case 'in progress':
      return 'pending';
    case 'ready':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function showMessage(message, type = 'info') {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message');
  existingMessages.forEach((msg) => msg.remove());

  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;

  // Style the message
  Object.assign(messageEl.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    zIndex: '1000',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });

  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  messageEl.style.backgroundColor = colors[type] || colors.info;

  // Add to page
  document.body.appendChild(messageEl);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.remove();
    }
  }, 5000);
}

// Make functions globally available
window.trackOrder = trackOrder;
window.viewOrderDetails = viewOrderDetails;
window.changePage = changePage;

// Only load if we're on a page that might have orders
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadDashboard);
} else {
  loadDashboard();
}

