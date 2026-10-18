
 // =====================================================
 // SOLE STUDIO - FRONTEND SETTINGS
 // =====================================================

const SUPABASE_URL = "https://iyvmgmrtunivkamzysso.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NPgwSxJUO_UBqmjsyFNcxA_SSYcgbb4";

const CHECKOUT_ENDPOINT =
  `${SUPABASE_URL}/functions/v1/payfast-checkout`;

const DELIVERY_FEE = 89;

const SHOE_SIZES = [
  { value: "UK 5 / US 6", label: "UK 5 / US 6" },
  { value: "UK 6 / US 7", label: "UK 6 / US 7" },
  { value: "UK 7 / US 8", label: "UK 7 / US 8" },
  { value: "UK 8 / US 9", label: "UK 8 / US 9" },
  { value: "UK 9 / US 10", label: "UK 9 / US 10" },
  { value: "UK 10 / US 11", label: "UK 10 / US 11" }
];

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let products = [];
let cart = [];

const money = (amount) =>
  `R${Number(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// =====================================================
// LOAD REAL PRODUCTS FROM SUPABASE
// =====================================================

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = '<p class="loading">Loading the collection...</p>';

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, type, price, color, image, tag")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product loading error:", error);
    grid.innerHTML =
      "<p>We could not load the collection. Please try again later.</p>";
    return;
  }

  products = data || [];

  if (!products.length) {
    grid.innerHTML = "<p>No products are available yet.</p>";
    return;
  }

  renderProducts();
}

// =====================================================
// DISPLAY PRODUCTS AND SIZE SELECTORS
// =====================================================

function renderProducts() {
  const grid = document.getElementById("product-grid");

  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image">
        ${product.tag
          ? `<span class="product-tag">${escapeHTML(product.tag)}</span>`
          : ""}
        <img
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy">
      </div>

      <div class="product-info">
        <div>
          <h3>${escapeHTML(product.name)}</h3>
          <p>${escapeHTML(product.type)}${product.color
            ? ` · ${escapeHTML(product.color)}`
            : ""}</p>
        </div>
        <strong>${money(product.price)}</strong>
      </div>

      <label class="shoe-size-label" for="size-${escapeHTML(product.id)}">
        Choose size
      </label>

      <select
        class="shoe-size-select"
        id="size-${escapeHTML(product.id)}"
        aria-label="Choose shoe size for ${escapeHTML(product.name)}">
        <option value="">Select UK / US size</option>
        ${SHOE_SIZES.map((size) => `
          <option value="${size.value}">${size.label}</option>
        `).join("")}
      </select>

      <button
        type="button"
        class="add-button"
        data-add-product="${escapeHTML(product.id)}">
        Add to bag
      </button>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.addProduct;
      const selector = document.getElementById(`size-${productId}`);
      const selectedSize = selector.value;

      if (!selectedSize) {
        alert("Please choose a shoe size first.");
        selector.focus();
        return;
      }

      addToCart(productId, selectedSize, button);
    });
  });
}

// =====================================================
// SHOPPING CART
// Different sizes of the same shoe are separate items.
// =====================================================

function addToCart(productId, shoeSize, button) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.find(
    (item) => item.id === productId && item.shoe_size === shoeSize
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      ...product,
      shoe_size: shoeSize,
      quantity: 1
    });
  }

  updateCart();

  if (button) {
    const originalText = button.textContent;
    button.textContent = "Added to bag ✓";
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  }
}

function changeQuantity(productId, shoeSize, amount) {
  const item = cart.find(
    (product) =>
      product.id === productId && product.shoe_size === shoeSize
  );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(
      (product) =>
        !(product.id === productId && product.shoe_size === shoeSize)
    );
  }

  updateCart();
}

function getSubtotal() {
  return cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
}

function getTotal() {
  return cart.length ? getSubtotal() + DELIVERY_FEE : 0;
}

function updateCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);

  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-subtotal").textContent = money(getSubtotal());
  document.getElementById("cart-delivery").textContent =
    money(cart.length ? DELIVERY_FEE : 0);
  document.getElementById("cart-total").textContent = money(getTotal());

  const cartItems = document.getElementById("cart-items");

  if (!cart.length) {
    cartItems.innerHTML = "<p>Your bag is empty.</p>";
  } else {
    cartItems.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.name)}">

        <div>
          <h3>${escapeHTML(item.name)}</h3>
          <p>Size: ${escapeHTML(item.shoe_size)}</p>
          <p>${money(item.price)} each</p>

          <div class="quantity">
            <button
              type="button"
              data-quantity-id="${escapeHTML(item.id)}"
              data-quantity-size="${escapeHTML(item.shoe_size)}"
              data-quantity-change="-1"
              aria-label="Remove one">−</button>

            <span>${item.quantity}</span>

            <button
              type="button"
              data-quantity-id="${escapeHTML(item.id)}"
              data-quantity-size="${escapeHTML(item.shoe_size)}"
              data-quantity-change="1"
              aria-label="Add one">+</button>
          </div>
        </div>

        <strong>${money(Number(item.price) * item.quantity)}</strong>
      </div>
    `).join("");

    cartItems.querySelectorAll("[data-quantity-id]").forEach((button) => {
      button.addEventListener("click", () => {
        changeQuantity(
          button.dataset.quantityId,
          button.dataset.quantitySize,
          Number(button.dataset.quantityChange)
        );
      });
    });
  }

  const checkoutButton = document.getElementById("checkout-button");
  checkoutButton.disabled = cart.length === 0;
  checkoutButton.style.opacity = cart.length === 0 ? "0.5" : "1";

  document.getElementById("checkout-subtotal").textContent = money(getSubtotal());
  document.getElementById("checkout-total").textContent = money(getTotal());
}

// =====================================================
// OPEN AND CLOSE BAG
// =====================================================

function toggleCart() {
  document.getElementById("cart-overlay").classList.toggle("hidden");
}

function closeCart(event) {
  if (event.target.id === "cart-overlay") {
    document.getElementById("cart-overlay").classList.add("hidden");
  }
}

// =====================================================
// GUEST CHECKOUT
// =====================================================

function openCheckout() {
  if (!cart.length) {
    alert("Your shopping bag is empty.");
    return;
  }

  document.getElementById("cart-overlay").classList.add("hidden");
  document.getElementById("checkout-error").textContent = "";

  updateCart();
  document.getElementById("checkout-overlay").classList.remove("hidden");
}

function closeCheckout() {
  document.getElementById("checkout-overlay").classList.add("hidden");
}

// =====================================================
// COLLECT CUSTOMER AND DELIVERY DETAILS
// =====================================================

function getCheckoutDetails() {
  return {
    first_name: document.getElementById("first-name").value.trim(),
    last_name: document.getElementById("last-name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address_line1: document.getElementById("address-line1").value.trim(),
    address_line2: document.getElementById("address-line2").value.trim(),
    suburb: document.getElementById("suburb").value.trim(),
    city: document.getElementById("city").value.trim(),
    province: document.getElementById("province").value.trim(),
    postal_code: document.getElementById("postal-code").value.trim(),
    delivery_instructions:
      document.getElementById("delivery-instructions").value.trim()
  };
}

// =====================================================
// CHECKOUT AND PAYFAST REDIRECT
// =====================================================

document.getElementById("checkout-form").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const errorBox = document.getElementById("checkout-error");
    const payButton = document.getElementById("pay-button");

    errorBox.textContent = "";

    if (!cart.length) {
      errorBox.textContent = "Your shopping bag is empty.";
      return;
    }

    const customer = getCheckoutDetails();

    const requiredFields = [
      ["first_name", "first name"],
      ["last_name", "last name"],
      ["email", "email address"],
      ["phone", "mobile number"],
      ["address_line1", "street address"],
      ["suburb", "suburb"],
      ["city", "city or town"],
      ["province", "province"],
      ["postal_code", "postal code"]
    ];

    const missing = requiredFields.find(([key]) => !customer[key]);

    if (missing) {
      errorBox.textContent = `Please enter your ${missing[1]}.`;
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errorBox.textContent = "Please enter a valid email address.";
      return;
    }

    const items = cart.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
      shoe_size: item.shoe_size
    }));

    payButton.disabled = true;
    payButton.textContent = "Preparing secure checkout...";

    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          ...customer,
          items,
          site_url: window.location.origin
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Could not start checkout."
        );
      }

      if (!result.process_url || !result.fields) {
        throw new Error("The payment service returned an incomplete response.");
      }

      const paymentForm = document.createElement("form");
      paymentForm.method = "POST";
      paymentForm.action = result.process_url;

      Object.entries(result.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        paymentForm.appendChild(input);
      });

      document.body.appendChild(paymentForm);
      paymentForm.submit();
    } catch (error) {
      console.error("Checkout error:", error);

      errorBox.textContent =
        error.message || "Something went wrong. Please try again.";

      payButton.disabled = false;
      payButton.textContent = "Continue to PayFast →";
    }
  }
);

// =====================================================
// INITIALISE WEBSITE
// =====================================================

document.getElementById("year").textContent = new Date().getFullYear();

updateCart();
loadProducts();
