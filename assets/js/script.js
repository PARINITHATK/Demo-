/* script.js - main JavaScript for Black & Beige
   Features:
   - Mobile nav toggle
   - Cart counter + Add to Cart functionality (localStorage)
   - Adding GA4 event tracking for page_view, add_to_cart, purchase, generate_lead
   - Google Ads conversion placeholders for add_to_cart, contact form, payment
   - Contact form validation and submission handler
   - Payment form validation and purchase handler
   - Common utilities and comments to guide replacement of placeholder IDs
*/

/* =========================
   Utility & Configuration
   ========================= */

// Replace these with real IDs later
const GA_MEASUREMENT_ID = 'G-MEASUREMENT_ID'; // example: G-XXXXXXX
const ADS_CONVERSION_ID = 'AW-CONVERSION_ID_HERE'; // example: AW-123456789
const ADS_CONVERSION_LABEL_ADD_TO_CART = 'CONVERSION_LABEL_HERE';
const ADS_CONVERSION_LABEL_CONTACT = 'CONVERSION_LABEL_HERE';
const ADS_CONVERSION_LABEL_PURCHASE = 'CONVERSION_LABEL_HERE';

// Local storage key for cart
const CART_KEY = 'blackandbeige_cart_v1';

// Helper: send GA4 event (using gtag). Ensure gtag script included in pages.
function sendGAEvent(eventName, params = {}) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
      // console.log('GA event sent:', eventName, params);
    } else {
      // gtag not yet available — no-op for now
      // console.warn('gtag not defined, GA event not sent:', eventName);
    }
  } catch (e) {
    console.error('GA event error', e);
  }
}

// Helper: send Google Ads conversion placeholder (gtag format).
// Replace ADS_CONVERSION_ID and label with real values later.
function sendAdsConversion(label, value = 1.0, currency = 'INR') {
  try {
    if (typeof gtag === 'function') {
      // send_to must be in format 'AW-CONVERSION_ID/CONVERSION_LABEL'
      const send_to = `${ADS_CONVERSION_ID}/${label}`;
      gtag('event', 'conversion', {
        'send_to': send_to,
        'value': value,
        'currency': currency
      });
    } else {
      // gtag not present; skip
      // console.warn('gtag not defined, Ads conversion not sent');
    }
  } catch (e) {
    console.error('Ads conversion error', e);
  }
}

/* =========================
   Cart Management
   - Cart is stored in localStorage as an array of items:
     [{id, name, price, qty}]
   - Cart counter displays total quantity
   ========================= */

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('getCart parse error', e);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCounters();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);

  // Fire GA4 add_to_cart event
  sendGAEvent('add_to_cart', {
    currency: 'INR',
    value: parseFloat(item.price) * item.qty,
    items: [{
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.qty
    }]
  });

  // Fire Google Ads conversion placeholder for add_to_cart
  sendAdsConversion(ADS_CONVERSION_LABEL_ADD_TO_CART, parseFloat(item.price) * item.qty, 'INR');
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCounters();
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, it) => sum + (it.qty || 0), 0);
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, it) => sum + (parseFloat(it.price || 0) * (it.qty || 0)), 0);
}

function updateCartCounters() {
  const counters = document.querySelectorAll('.cart-count');
  const count = getCartCount();
  counters.forEach(el => el.textContent = count);
  // Update order summary if on payment page
  const orderItems = document.getElementById('orderItems');
  const orderTotal = document.getElementById('orderTotal');
  if (orderItems) {
    const cart = getCart();
    if (!cart.length) {
      orderItems.innerHTML = '<p>No items in cart yet.</p>';
    } else {
      orderItems.innerHTML = '';
      cart.forEach(i => {
        const p = document.createElement('p');
        p.textContent = `${i.name} x ${i.qty} — ₹${(parseFloat(i.price) * i.qty).toFixed(0)}`;
        orderItems.appendChild(p);
      });
    }
  }
  if (orderTotal) {
    orderTotal.textContent = `₹${getCartTotal().toFixed(0)}`;
  }
}

/* =========================
   Attach Add-to-Cart listeners on product buttons
   ========================= */
function initAddToCartButtons() {
  // Buttons with class 'add-to-cart'
  const buttons = Array.from(document.querySelectorAll('.add-to-cart'));
  buttons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const id = btn.dataset.id || ('p-' + Math.random().toString(36).substr(2, 9));
      const name = btn.dataset.name || btn.getAttribute('aria-label') || 'Product';
      const price = parseFloat(btn.dataset.price || '0') || 0;
      const item = { id, name, price, qty: 1 };
      addToCart(item);

      // simple UI feedback
      btn.textContent = 'Added';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.disabled = false;
      }, 900);
    });
  });
}

/* =========================
   Contact Form Handling
   - Validates fields
   - Fires GA4 generate_lead event
   - Fires Google Ads conversion placeholder for contact form
   ========================= */

function validateContactForm() {
  const name = document.getElementById('contactName');
  const email = document.getElementById('contactEmail');
  const phone = document.getElementById('contactPhone');
  const message = document.getElementById('contactMessage');

  let valid = true;

  // name
  const errorName = document.getElementById('errorName');
  if (!name.value.trim() || name.value.trim().length < 2) {
    errorName.textContent = 'Please enter your name (2+ characters).';
    valid = false;
  } else {
    errorName.textContent = '';
  }

  // email
  const errorEmail = document.getElementById('errorEmail');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
    errorEmail.textContent = 'Please enter a valid email.';
    valid = false;
  } else {
    errorEmail.textContent = '';
  }

  // phone (simple validation)
  const errorPhone = document.getElementById('errorPhone');
  const phoneVal = phone.value.replace(/\s+/g, '');
  if (!phoneVal || phoneVal.length < 7) {
    errorPhone.textContent = 'Please enter a valid phone number.';
    valid = false;
  } else {
    errorPhone.textContent = '';
  }

  // message
  const errorMessage = document.getElementById('errorMessage');
  if (!message.value.trim() || message.value.trim().length < 5) {
    errorMessage.textContent = 'Please enter a message (5+ characters).';
    valid = false;
  } else {
    errorMessage.textContent = '';
  }

  return valid;
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateContactForm()) return;

    // Example form submission flow: you would post to your backend here.
    // We'll simulate success, fire analytics events, and reset the form.

    // Fire GA4 generate_lead event
    sendGAEvent('generate_lead', {
      method: 'contact_form'
    });

    // Fire Google Ads conversion placeholder for contact form
    sendAdsConversion(ADS_CONVERSION_LABEL_CONTACT, 0, 'INR');

    // show a simple success state
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sent';
    submitBtn.disabled = true;
    setTimeout(() => {
      form.reset();
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
    }, 1200);
  });
}

/* =========================
   Payment Form Handling
   - Validates card details lightly
   - Fires GA4 purchase event
   - Fires Google Ads conversion placeholder for purchase
   - Clears cart on success
   ========================= */

function validatePaymentForm() {
  const cardName = document.getElementById('cardName');
  const cardAddress = document.getElementById('cardAddress');
  const cardNumber = document.getElementById('cardNumber');
  const expiry = document.getElementById('expiry');
  const cvv = document.getElementById('cvv');

  let valid = true;

  const errorCardName = document.getElementById('errorCardName');
  const errorCardAddress = document.getElementById('errorCardAddress');
  const errorCardNumber = document.getElementById('errorCardNumber');
  const errorExpiry = document.getElementById('errorExpiry');
  const errorCvv = document.getElementById('errorCvv');

  if (!cardName.value.trim() || cardName.value.trim().length < 3) {
    errorCardName.textContent = 'Enter the name on card.';
    valid = false;
  } else { errorCardName.textContent = ''; }

  if (!cardAddress.value.trim()) {
    errorCardAddress.textContent = 'Enter a billing address.';
    valid = false;
  } else { errorCardAddress.textContent = ''; }

  // basic card number check (Luhn not implemented for brevity)
  const num = cardNumber.value.replace(/\s+/g, '');
  if (!/^\d{12,19}$/.test(num)) {
    errorCardNumber.textContent = 'Enter a valid card number.';
    valid = false;
  } else { errorCardNumber.textContent = ''; }

  // expiry: MM / YYYY
  if (!/^\s*\d{1,2}\s*\/\s*\d{4}\s*$/.test(expiry.value)) {
    errorExpiry.textContent = 'Expiry must be in MM / YYYY format.';
    valid = false;
  } else { errorExpiry.textContent = ''; }

  if (!/^\d{3,4}$/.test(cvv.value)) {
    errorCvv.textContent = 'Enter a valid CVV.';
    valid = false;
  } else { errorCvv.textContent = ''; }

  return valid;
}

function initPaymentForm() {
  const form = document.getElementById('paymentForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validatePaymentForm()) return;

    const cart = getCart();
    const total = getCartTotal();

    // Fire GA4 purchase event with items
    sendGAEvent('purchase', {
      currency: 'INR',
      value: total,
      transaction_id: 'txn_' + Math.random().toString(36).substr(2,9),
      items: cart.map(i => ({
        item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty
      }))
    });

    // Fire Google Ads conversion placeholder for purchase
    sendAdsConversion(ADS_CONVERSION_LABEL_PURCHASE, total, 'INR');

    // simulate success and clear cart
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    setTimeout(() => {
      clearCart();
      form.reset();
      submitBtn.textContent = 'Pay Now';
      submitBtn.disabled = false;
      alert('Payment success! Thank you for your purchase.');
      // Optionally redirect to a thank-you page or order summary
      window.location.href = 'index.html';
    }, 1200);
  });
}

/* =========================
   Page view tracking (GA4)
   ========================= */

function trackPageView() {
  // Fire a page_view event if gtag available.
  sendGAEvent('page_view', {
    page_path: window.location.pathname,
    page_title: document.title
  });
}

/* =========================
   Misc: update year placeholders & mobile nav
   ========================= */

function updateYears() {
  const year = new Date().getFullYear();
  const ids = ['year','yearAbout','yearProducts','yearContact','yearPayment'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = year;
  });
}

function initMobileNav() {
  const toggles = document.querySelectorAll('.nav-toggle');
  toggles.forEach(t => {
    t.addEventListener('click', function() {
      // Find adjacent nav (assumes structure used in pages)
      const header = t.closest('.header-inner');
      if (!header) return;
      const nav = header.querySelector('.nav');
      if (!nav) return;
      nav.classList.toggle('show');
    });
  });

  // Collapse nav on link click (mobile)
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      const nav = this.closest('.nav');
      if (nav && nav.classList.contains('show')) {
        nav.classList.remove('show');
      }
    });
  });
}

/* =========================
   Initialize on DOM ready
   ========================= */
document.addEventListener('DOMContentLoaded', function () {
  updateYears();
  initMobileNav();
  initAddToCartButtons();
  initContactForm();
  initPaymentForm();
  updateCartCounters();
  trackPageView();

  // Additional initialization: show cart items on payment page
  const orderItems = document.getElementById('orderItems');
  if (orderItems) {
    updateCartCounters(); // fills orderItems and total
  }
});

/* =========================
   End of script.js
   ========================= */
