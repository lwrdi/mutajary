/*
 * Mutajary Store Frontend Logic
 *
 * This script handles fetching products from Supabase, managing the cart
 * in localStorage, rendering the cart, placing orders, saving orders
 * to Supabase and sending order details via email using FormSubmit.
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your own credentials
 * from your Supabase project once it has been created. You can find these
 * values in the project settings under the API section.
 */

/*
 * Firebase configuration
 *
 * Replace the below object with your Firebase project configuration.
 * You can find this in your Firebase console under Project Settings → General →
 * Your apps (Web app). The config should include apiKey, authDomain,
 * projectId, storageBucket, messagingSenderId and appId. Without this
 * configuration the site will not be able to communicate with Firestore.
 */
// Firebase configuration for the "mutajary" project. These values are
// specific to the Firebase project created in the Firebase console and
// are required to initialize the Firebase app and communicate with
// Firestore. Do not share these publicly in production; instead use
// environment variables on the server or in your deployment platform.
const firebaseConfig = {
  apiKey: 'AIzaSyDm6NBQxgAJjANP1QI3Z3v3fwL-fKLaRwY',
  authDomain: 'mutajary.firebaseapp.com',
  projectId: 'mutajary',
  storageBucket: 'mutajary.appspot.com',
  messagingSenderId: '1059094885748',
  appId: '1:1059094885748:web:3952fbbde14a3b57cfa821',
  measurementId: 'G-P21DK9M16L'
};

// Initialize Firebase app and Firestore. Note: firebase is loaded from
// firebase-app-compat.js and firebase-firestore-compat.js in the HTML files.
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/**
 * Fetches the list of products from the 'products' table and renders
 * them on the products page. Each product card includes an image,
 * name, price and a button to add the item to the cart.
 */
async function fetchProducts() {
  try {
    // Fetch all documents in the 'products' collection from Firestore
    const snapshot = await db.collection('products').get();
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';
    snapshot.forEach((doc) => {
      const product = doc.data();
      // Firestore documents do not include their id in the data; attach it manually
      const productId = doc.id;
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${product.image || ''}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">${product.price} درهم</p>
        <button onclick="addToCart('${productId}', '${product.name.replace(/'/g, "\'")}', ${product.price})">أضف إلى السلة</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Unexpected error fetching products:', err);
  }
}

/**
 * Retrieves the cart array from localStorage. If no cart exists,
 * returns an empty array.
 * @returns {Array} cart items
 */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves the given cart array to localStorage.
 * @param {Array} cart - array of cart items
 */
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

/**
 * Adds a product to the cart. If the product is already
 * present, increments its quantity.
 * @param {number} id - product identifier
 * @param {string} name - product name
 * @param {number} price - unit price
 */
function addToCart(id, name, price) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === id);
  if (index >= 0) {
    cart[index].quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  saveCart(cart);
  alert('تم إضافة المنتج إلى السلة');
}

/**
 * Removes an item from the cart by its product id and re-renders
 * the cart on the page.
 * @param {number} id - product identifier to remove
 */
function removeFromCart(id) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === id);
  if (index >= 0) {
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }
}

/**
 * Renders the cart contents on the cart page by iterating over the
 * cart items array stored in localStorage. It also calculates and
 * displays the total price.
 */
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container || !totalEl) return;
  container.innerHTML = '';
  let total = 0;
  cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span>${item.name}</span>
      <span>الكمية: ${item.quantity}</span>
      <span>السعر: ${item.price * item.quantity} درهم</span>
      <button onclick="removeFromCart(${item.id})">إزالة</button>
    `;
    container.appendChild(row);
    total += item.price * item.quantity;
  });
  totalEl.textContent = `الإجمالي: ${total} درهم`;
}

/**
 * Places an order by inserting the order details into the 'orders'
 * table in Supabase and sending an email via FormSubmit. After the
 * order is successfully processed, the cart is cleared and the user
 * is redirected to the confirmation page.
 */
async function placeOrder() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  const cart = getCart();
  if (cart.length === 0) {
    alert('السلة فارغة!');
    return;
  }
  const order = {
    customer_name: name,
    customer_email: email,
    customer_address: address,
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };
  // Insert the order into the 'orders' collection in Firestore
  try {
    await db.collection('orders').add({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_address: order.customer_address,
      items: order.items,
      total: order.total,
      created_at: new Date()
    });
  } catch (err) {
    console.error('Error inserting order:', err);
  }
  // Send an email with the order details via FormSubmit
  try {
    await fetch('https://formsubmit.co/ajax/dahabi.diidiix@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: 'طلب جديد من متجري',
        name: order.customer_name,
        email: order.customer_email,
        address: order.customer_address,
        items: JSON.stringify(order.items),
        total: order.total
      })
    });
  } catch (err) {
    console.error('Error sending email:', err);
  }
  // Clear the cart and redirect
  saveCart([]);
  window.location.href = 'confirmation.html';
}
