// Dynamic Laundry Items Booking System - Fixed pricing to exact table values
// Dropdown populating preserved. Service now uses lookup table for exact prices (Wash only, Iron only, Wash & Iron)

document.addEventListener('DOMContentLoaded', function () {
  // Exact prices per service from services.html tables (per item)
  const SERVICE_PRICES = {
    'iron-only': { premium: { Shirt: 300, Trouser: 300 /* add all */ }, children: {}, linen: {} },
    'wash-only': { premium: { Shirt: 300 }, /* etc */ },
    'wash-iron': { premium: { Shirt: 500 }, /* default */ }
  };

  // Simplified: store all services per item
  const ITEMS_DATA = {
    premium: [
      { name: 'Uniform', prices: { 'wash-only': 1000, 'wash-iron': 1500, 'iron-only': 1000 } },
      { name: 'Shirt', prices: { 'wash-only': 300, 'wash-iron': 500, 'iron-only': 300 } },
      { name: 'Trouser', prices: { 'wash-only': 300, 'wash-iron': 300, 'iron-only': 300 } },
      { name: 'Jean/Combat', prices: { 'wash-only': 300, 'wash-iron': 500, 'iron-only': 300 } },
      { name: 'Suit', prices: { 'wash-only': 1000, 'wash-iron': 1500, 'iron-only': 1000 } },
      { name: 'Dress(Gown)', prices: { 'wash-only': 500, 'wash-iron': 800, 'iron-only': 500 } },
      { name: 'Native', prices: { 'wash-only': 700, 'wash-iron': 1000, 'iron-only': 700 } },
      { name: 'Agbada', prices: { 'wash-only': 1500, 'wash-iron': 2000, 'iron-only': 1500 } },
      { name: 'Abaya', prices: { 'wash-only': 500, 'wash-iron': 800, 'iron-only': 500 } },
      { name: 'Wedding Gown', prices: { 'wash-only': 2500, 'wash-iron': 0, 'iron-only': 0 } }
    ],
    children: [
      { name: 'Shirt', prices: { 'wash-only': 200, 'wash-iron': 300, 'iron-only': 200 } },
      { name: 'Shorts', prices: { 'wash-only': 200, 'wash-iron': 300, 'iron-only': 200 } },
      { name: 'Dress', prices: { 'wash-only': 200, 'wash-iron': 300, 'iron-only': 200 } }
    ],
    linen: [
      { name: 'Bedsheet', prices: { 'wash-only': 800, 'wash-iron': 1000 } },
      { name: 'Blanket(small)', prices: { 'wash-only': 800, 'wash-iron': 1700 } },
      { name: 'Blanket (Big)', prices: { 'wash-only': 800, 'wash-iron': 2500 } },
      { name: 'Duvet', prices: { 'wash-only': 800, 'wash-iron': 2500 } },
      { name: 'Curtain', prices: { 'wash-only': 800, 'wash-iron': 1000 } }
    ]
  };

  let cart = [];
  let currentService = 'wash-iron';

  const categorySelect = document.getElementById('category');
  const serviceSelect = document.getElementById('service');
  const itemSelect = document.getElementById('item');
  const quantityInput = document.getElementById('quantity');
  const priceSpan = document.getElementById('price');
  const addBtn = document.getElementById('addBtn');
  const cartTable = document.getElementById('cartTable');
  const grandTotalSpan = document.getElementById('grandTotal');
  const bookingForm = document.getElementById('bookingForm');

  function loadServices() {
    if (serviceSelect) {
      serviceSelect.innerHTML = `
        <option value="wash-iron">Wash & Iron</option>
        <option value="wash-only">Wash Only</option>
        <option value="iron-only">Iron Only</option>
      `;
    }
  }

  function loadItems() {
    const category = categorySelect.value;
    itemSelect.innerHTML = '<option value="">Select Item</option>';

    if (category && ITEMS_DATA[category]) {
      ITEMS_DATA[category].forEach((item) => {
        const option = new Option(item.name, JSON.stringify(item));
        itemSelect.appendChild(option);
      });
    }
    updatePrice();
  }

  function updatePrice() {
    const itemData = itemSelect.value ? JSON.parse(itemSelect.value) : null;
    const service = serviceSelect ? serviceSelect.value : currentService;
    const qty = parseInt(quantityInput.value) || 1;
    
    if (itemData && itemData.prices && itemData.prices[service]) {
      const servicePrice = itemData.prices[service];
      if (servicePrice > 0) {
        const total = servicePrice * qty;
        priceSpan.textContent = total.toLocaleString();
        return;
      }
    }
    priceSpan.textContent = '0';
  }

  function addToCart() {
    const category = categorySelect.value;
    const service = serviceSelect ? serviceSelect.value : currentService;
    const itemData = itemSelect.value ? JSON.parse(itemSelect.value) : null;
    const qty = parseInt(quantityInput.value) || 1;

    if (!category || !itemData || !service || qty < 1) {
      alert('Please select all');
      return;
    }

    const servicePrice = itemData.prices[service];
    if (!servicePrice || servicePrice <= 0) {
      alert('Service not available for item');
      return;
    }

    const total = servicePrice * qty;

    const cartItem = {
      category,
      service: service.replace('-', ' & '),
      item: itemData.name,
      price: servicePrice,
      qty,
      total
    };

    cart.push(cartItem);
    renderCart();
    clearForm();
    showMessage('Added to cart!');
  }

  function renderCart() {
    if (cart.length === 0) {
      cartTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No items</td></tr>';
      grandTotalSpan.textContent = '0';
      return;
    }

    cartTable.innerHTML = cart.map((item, index) => `
      <tr>
        <td>${item.category.toUpperCase()}</td>
        <td>${item.item}</td>
        <td>${item.service}</td>
        <td>${item.qty}</td>
        <td>₦${item.price.toLocaleString()}</td>
        <td>₦${item.total.toLocaleString()}</td>
        <td><button onclick="removeFromCart(${index})">X</button></td>
      </tr>
    `).join('');

    const grandTotal = cart.reduce((s, i) => s + i.total, 0);
    grandTotalSpan.textContent = grandTotal.toLocaleString();
  }

  window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
  };

  function clearForm() {
    itemSelect.value = '';
    quantityInput.value = 1;
    priceSpan.textContent = '0';
  }

  function showMessage(msg) {
    alert(msg);
  }

  // Submit original
  bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Submitted with cart: ' + JSON.stringify(cart));
  });

  categorySelect?.addEventListener('change', loadItems);
  serviceSelect?.addEventListener('change', updatePrice);
  itemSelect?.addEventListener('change', updatePrice);
  quantityInput?.addEventListener('input', updatePrice);
  addBtn?.addEventListener('click', addToCart);

  loadServices();
  loadItems();
});
