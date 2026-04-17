// Admin Panel with API Integration
let authToken = null;
let currentOrders = [];
let currentPage = 1;
const ordersPerPage = 10;

// DOM Elements - moved to function for safe lookup after DOM ready
let loginPage,
  dashboard,
  loginForm,
  loginError,
  logoutButton,
  ordersTable,
  inventoryTable;

function initDOMElements() {
  loginPage = document.getElementById("adminLoginPage");
  dashboard = document.getElementById("adminDashboard");
  loginForm = document.getElementById("adminLoginForm");
  loginError = document.getElementById("loginError");
  logoutButton = document.getElementById("logoutButton");
  ordersTable = document.getElementById("ordersTable");
  inventoryTable = document.getElementById("inventoryTable");

  if (!ordersTable) console.error("ordersTable not found");
}

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
  initDOMElements();

  // Login form handler - attached after DOM is ready
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Logging in...";
      submitBtn.disabled = true;

      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value;

      try {
        const response = await fetch("http://localhost:3000/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Login failed");
        }

        // Store token
        authToken = result.token;
        localStorage.setItem("authToken", authToken);

        showMessage("Login successful!", "success");
        showDashboard();
        loadDashboardData();
      } catch (error) {
        console.error("Login error:", error);
        if (loginError)
          loginError.textContent =
            error.message || "Login failed. Please try again.";
        showMessage("Login failed. Please check your credentials.", "error");
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Logout handler - attached after DOM is ready
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      authToken = null;
      localStorage.removeItem("authToken");
      showLogin();
      showMessage("Logged out successfully", "info");
    });
  }

  // Check if already logged in
  const token = localStorage.getItem("authToken");
  if (token) {
    authToken = token;
    showDashboard();
    loadDashboardData();
  } else {
    showLogin();
  }
});

// Show login page
function showLogin() {
  loginPage.style.display = "flex";
  dashboard.style.display = "none";
  loginError.textContent = "";
  loginForm.reset();
}

// Show dashboard
function showDashboard() {
  loginPage.style.display = "none";
  dashboard.style.display = "block";
}

// Load dashboard data
async function loadDashboardData() {
  try {
    await Promise.all([loadOrders(), loadDashboardStats()]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showMessage("Failed to load dashboard data", "error");
  }
}

// Load orders
async function loadOrders(page = 1) {
  try {
    console.log(
      `Loading orders page ${page} with token: ${authToken ? authToken.substring(0, 20) + "..." : "no token"}`,
    );

    const response = await fetch(
      `http://localhost:3000/api/orders?page=${page}&limit=${ordersPerPage}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();
    console.log(`Orders response: ${response.status} -`, result);

    if (response.status === 401 || response.status === 403) {
      // Token invalid/expired
      showMessage("Session expired. Please login again.", "error");
      localStorage.removeItem("authToken");
      authToken = null;
      setTimeout(() => showLogin(), 2000);
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    if (result.success) {
      currentOrders = result.data.orders || [];
      displayOrders(result.data.orders);
      updatePagination(result.data.pagination);
      if (result.data.orders.length === 0) {
        showMessage("No orders found. Create your first order!", "info");
      }
    } else {
      throw new Error(result.message || "Unknown error");
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    showMessage(`Failed to load orders: ${error.message}`, "error");
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch("http://localhost:3000/api/dashboard/stats", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load statistics");
    }

    const result = await response.json();

    if (result.success) {
      updateDashboardStats(result.data);
    }
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
  document.getElementById("totalOrders").textContent = stats.totalOrders || 0;
  document.getElementById("pendingOrders").textContent =
    stats.pendingOrders || 0;
  document.getElementById("completedOrders").textContent =
    stats.completedOrders || 0;
  document.getElementById("totalRevenue").textContent =
    `₦${(stats.totalRevenue || 0).toLocaleString()}`;
}

// Display orders in table
function displayOrders(orders) {
  // Get the tbody element (ordersTable is the tbody id)
  let ordersTableEl = document.getElementById("ordersTable");
  if (!ordersTableEl) {
    console.error("ordersTable element not found");
    showMessage("Table element not found - reload page", "error");
    return;
  }

  // Clear existing rows
  ordersTableEl.innerHTML = "";

  if (!Array.isArray(orders)) {
    console.error("Orders is not an array:", orders);
    showMessage("Invalid orders data", "error");
    return;
  }

  if (orders.length === 0) {
    ordersTableEl.innerHTML =
      '<tr><td colspan="10" style="text-align: center; padding: 20px;">No orders found</td></tr>';
    return;
  }

  orders.forEach((order) => {
    if (!order || !order.id) {
      console.warn("Skipping invalid order:", order);
      return;
    }

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.order_id || "N/A"}</td>
      <td>${order.customer_name || "N/A"}</td>
      <td>${formatServiceName(order)}</td>
      <td>${getOrderQty(order)}</td>
      <td>₦${(order.total_amount || 0).toLocaleString()}</td>
      <td>${formatDate(order.pickup_date) || "N/A"}</td>
      <td>${formatDate(order.delivery_date) || "N/A"}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
          <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          <option value="processing" ${order.status === "processing" ? "selected" : ""}>Processing</option>
          <option value="ready" ${order.status === "ready" ? "selected" : ""}>Ready</option>
          <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
          <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td>${formatDateTime(order.created_at) || "N/A"}</td>
      <td>
        <button class="btn btn-small" onclick="viewOrderDetails(${order.id})">View</button>
        <button class="btn btn-danger btn-small" onclick="deleteOrder(${order.id})">Delete</button>
      </td>
    `;

    ordersTableEl.appendChild(row);
  });
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to update status");
    }

    showMessage("Order status updated successfully", "success");
    loadDashboardData(); // Refresh data
  } catch (error) {
    console.error("Error updating order status:", error);
    showMessage("Failed to update order status", "error");
    // Reload orders to revert the select change
    loadOrders(currentPage);
  }
}

// Delete order
async function deleteOrder(orderId) {
  console.log("deleteOrder called with orderId:", orderId);

  if (
    !confirm(
      "Are you sure you want to delete this order? This action cannot be undone.",
    )
  ) {
    console.log("Delete cancelled by user");
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("Delete response status:", response.status);
    const result = await response.json();
    console.log("Delete response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to delete order");
    }

    showMessage("Order deleted successfully", "success");
    loadDashboardData(); // Refresh data
  } catch (error) {
    console.error("Error deleting order:", error);
    showMessage("Failed to delete order: " + error.message, "error");
  }
}

// View order details
function viewOrderDetails(orderId) {
  console.log("viewOrderDetails called with orderId:", orderId);
  console.log("currentOrders:", currentOrders);

  // Find order in current orders
  const order = currentOrders.find((o) => o.id === orderId);

  if (!order) {
    console.error("Order not found in currentOrders. Fetching from server...");
    // Fallback: fetch from server if not in currentOrders
    fetchAndShowOrderDetails(orderId);
    return;
  }

  console.log("Order found:", order);
  showOrderModal(order);
}

// Fetch order details from server
async function fetchAndShowOrderDetails(orderId) {
  try {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch order");
    }

    const result = await response.json();
    if (result.success && result.data) {
      showOrderModal(result.data);
    } else {
      showMessage("Order not found", "error");
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    showMessage("Failed to load order details: " + error.message, "error");
  }
}

// Show order details modal
function showOrderModal(order) {
  console.log("showOrderModal called with order:", order);

  // Remove any existing modals
  const existingModals = document.querySelectorAll(".modal");
  existingModals.forEach((m) => m.remove());

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.zIndex = "10000";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Order Details - ${order.order_id}</h3>
        <button class="modal-close" onclick="closeModal(this)">×</button>
      </div>
      <div class="modal-body">
        <div class="order-details-grid">
          <div class="detail-item">
            <strong>Customer Name:</strong> ${order.customer_name}
          </div>
          <div class="detail-item">
            <strong>Phone:</strong> ${order.phone}
          </div>
          <div class="detail-item">
            <strong>Email:</strong> ${order.email || "Not provided"}
          </div>
          <div class="detail-item">
            <strong>Service Summary:</strong> ${formatServiceName(order)}
          </div>
          <div class="detail-item">
            <strong>Total Items:</strong> ${getOrderQty(order)} items
          </div>
          ${(() => {
            const itemsInfo = parseItems(order);
            if (itemsInfo.fullItems) {
              return `<div class="detail-item">
                <strong>Full Items List:</strong>
                <ul style="margin: 0; padding-left: 20px;">
                  ${itemsInfo.fullItems
                    .map(
                      (item) =>
                        `<li>${item.qty}x ${item.item} (${item.service.replace("-", " & ")} - ₦${(item.price * item.qty).toLocaleString()})</li>`,
                    )
                    .join("")}
                </ul>
              </div>`;
            }
            return "";
          })()}
          <div class="detail-item">
            <strong>Total Amount:</strong> ₦${order.total_amount.toLocaleString()}
          </div>
          <div class="detail-item">
            <strong>Pickup Date:</strong> ${formatDate(order.pickup_date)}
          </div>
          <div class="detail-item">
            <strong>Delivery Date:</strong> ${formatDate(order.delivery_date)}
          </div>
          <div class="detail-item">
            <strong>Address:</strong> ${order.address}
          </div>
          <div class="detail-item">
            <strong>Status:</strong> <span class="status-pill ${getStatusClass(order.status)}">${order.status}</span>
          </div>
          <div class="detail-item">
            <strong>Special Instructions:</strong> ${order.special_instructions || "None"}
          </div>
          <div class="detail-item">
            <strong>Order Date:</strong> ${formatDateTime(order.created_at)}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  console.log("Modal appended to body");

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      console.log("Closing modal from outside click");
      modal.remove();
    }
  });

  // Focus modal for accessibility
  modal.focus();
}

// Close modal
function closeModal(button) {
  const modal = button.closest(".modal");
  modal.remove();
}

// Update pagination
function updatePagination(pagination) {
  const paginationEl = document.querySelector(".pagination");
  if (!paginationEl) return;

  const { page, pages, total } = pagination;

  if (pages <= 1) {
    paginationEl.style.display = "none";
    return;
  }

  paginationEl.style.display = "flex";
  paginationEl.innerHTML = `
    <button onclick="changePage(${page - 1})" ${page <= 1 ? "disabled" : ""}>Previous</button>
    <span>Page ${page} of ${pages} (${total} orders)</span>
    <button onclick="changePage(${page + 1})" ${page >= pages ? "disabled" : ""}>Next</button>
  `;
}

// Change page
function changePage(page) {
  currentPage = page;
  loadOrders(page);
}

// Utility functions
function parseItems(order) {
  if (!order.items) return { summary: null, totalQty: 0, itemCount: 0 };

  try {
    const items = JSON.parse(order.items);
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const itemCount = items.length;

    const summary = items
      .map((item) => {
        const serviceName = item.service.replace("-", " & ");
        return `${item.qty}x ${item.item.replace(/-/g, " ").replace(/\\b([a-z])/g, (m) => m.toUpperCase())} (${serviceName})`;
      })
      .join(", ");

    return {
      summary: summary.slice(0, 50) + (summary.length > 50 ? "..." : ""),
      totalQty,
      itemCount,
      fullItems: items,
    };
  } catch (e) {
    console.error("Failed to parse items:", e);
    return { summary: null, totalQty: 0, itemCount: 0 };
  }
}

function formatServiceName(order) {
  const itemsInfo = parseItems(order);
  if (itemsInfo.summary) {
    return itemsInfo.summary;
  }
  const serviceNames = {
    "wash-fold": "Wash & Fold",
    "dry-cleaning": "Dry Cleaning",
    "wash-iron": "Wash & Iron",
    ironing: "Ironing Only",
  };
  return serviceNames[order.service] || order.service || "N/A";
}

function getOrderQty(order) {
  const itemsInfo = parseItems(order);
  if (itemsInfo.totalQty > 0) {
    return itemsInfo.totalQty;
  }
  return order.quantity || 0;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "delivered":
      return "completed";
    case "pending":
    case "confirmed":
      return "pending";
    case "processing":
      return "pending";
    case "ready":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function showMessage(message, type = "info") {
  // Remove existing messages
  const existingMessages = document.querySelectorAll(".message");
  existingMessages.forEach((msg) => msg.remove());

  // Create message element
  const messageEl = document.createElement("div");
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;

  // Style the message
  Object.assign(messageEl.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "15px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "bold",
    zIndex: "1000",
    maxWidth: "400px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  });

  // Set background color based on type
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
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
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.viewOrderDetails = viewOrderDetails;
window.closeModal = closeModal;
window.changePage = changePage;
