/* Basharti storefront logic.
 * No frameworks — vanilla JS. Talks to the FastAPI backend for products
 * and orders, and mirrors key events to TikTok Pixel (client) + the
 * server-side /api/e relay (CAPI) using a shared event_id per occurrence
 * so TikTok can de-duplicate browser vs. server events correctly.
 */

(function () {
  "use strict";

  var CONFIG = window.BASHARTI_CONFIG || {};
  var API_BASE = (CONFIG.API_BASE || "").replace(/\/$/, "");
  var PIXEL_ID = CONFIG.TIKTOK_PIXEL_ID || "";
  var CART_KEY = "basharti_cart_v1";

  var state = {
    products: {},      // id -> product
    cart: loadCart(),  // [{productId, quantity}]
    activeProductId: null,
  };

  // -------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function newEventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "ev-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {}
  }

  function apiUrl(path) {
    return API_BASE + path;
  }

  // -------------------------------------------------------------------
  // TikTok Pixel + server-side CAPI relay
  // -------------------------------------------------------------------
  function initPixel() {
    if (!PIXEL_ID) return;
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (t, e) {
        t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) {
        var e = ttq._i[t] || [];
        for (var n = 0; n < e.methods.length; n++) ttq.setAndDefer(e, e.methods[n]);
        return e;
      };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var scriptEl = document.createElement("script");
        scriptEl.type = "text/javascript";
        scriptEl.async = true;
        scriptEl.src = r + "?sdkid=" + e + "&lib=" + t;
        var firstScript = document.getElementsByTagName("script")[0];
        firstScript.parentNode.insertBefore(scriptEl, firstScript);
      };
      ttq.load(PIXEL_ID);
      ttq.page();
    })(window, document, "ttq");
  }

  function pixelTrack(eventName, properties, eventId) {
    if (!PIXEL_ID || !window.ttq) return;
    try {
      window.ttq.track(eventName, properties || {}, { event_id: eventId });
    } catch (e) { /* pixel not ready yet — non-fatal */ }
  }

  function serverTrack(eventName, eventId, orderId, payload) {
    if (!API_BASE) return;
    fetch(apiUrl("/api/e"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: eventName,
        eventId: eventId,
        orderId: orderId || null,
        payload: payload || {},
      }),
    }).catch(function () { /* best-effort, never block the UI on this */ });
  }

  // Fires both the browser pixel and the server-side CAPI relay with the
  // SAME event_id so TikTok de-duplicates them into a single event.
  function track(eventName, tiktokProperties, capiPayload) {
    var eventId = newEventId();
    pixelTrack(eventName, tiktokProperties, eventId);
    serverTrack(eventName, eventId, null, capiPayload);
    return eventId;
  }

  // -------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------
  function fmtPrice(price) { return price + " ر.س"; }

  function loadProducts() {
    fetch(apiUrl("/api/products"))
      .then(function (res) { if (!res.ok) throw new Error("bad status"); return res.json(); })
      .then(function (products) {
        state.products = {};
        products.forEach(function (p) { state.products[p.id] = p; });
        renderProductGrid(products);
      })
      .catch(function () {
        $("#productGrid").innerHTML = '<p class="loading">تعذر تحميل المنتجات حالياً، حاول تحديث الصفحة.</p>';
      });
  }

  function renderProductGrid(products) {
    var grid = $("#productGrid");
    if (!products.length) {
      grid.innerHTML = '<p class="loading">لا توجد منتجات حالياً.</p>';
      return;
    }
    grid.innerHTML = products.map(function (p) {
      var thumb = p.image
        ? '<img src="' + escapeAttr(p.image) + '" alt="' + escapeAttr(p.name) + '" />'
        : "🌸";
      return (
        '<div class="product-card" data-product-id="' + escapeAttr(p.id) + '" data-action="open-product">' +
          '<div class="product-thumb">' + thumb + "</div>" +
          '<div class="product-info">' +
            "<h3>" + escapeHtml(p.name) + "</h3>" +
            '<p class="product-desc">' + escapeHtml(p.description || "") + "</p>" +
            '<span class="product-price">' + fmtPrice(p.price) + "</span>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(str) { return escapeHtml(str); }

  // -------------------------------------------------------------------
  // Product modal
  // -------------------------------------------------------------------
  function openProduct(productId) {
    var p = state.products[productId];
    if (!p) return;
    state.activeProductId = productId;

    var thumb = p.image
      ? '<img src="' + escapeAttr(p.image) + '" alt="' + escapeAttr(p.name) + '" />'
      : "🌸";

    $("#productModalBody").innerHTML = (
      '<div class="product-modal-thumb">' + thumb + "</div>" +
      "<h2>" + escapeHtml(p.name) + "</h2>" +
      '<p class="muted">' + escapeHtml(p.description || "") + "</p>" +
      '<div class="product-price">' + fmtPrice(p.price) + "</div>" +
      '<div class="qty-row">' +
        '<button type="button" data-action="qty-dec">−</button>' +
        '<span id="modalQty">1</span>' +
        '<button type="button" data-action="qty-inc">+</button>' +
      "</div>" +
      '<button class="btn btn-primary btn-block" data-action="add-to-cart">أضف إلى السلة</button>'
    );

    $("#productOverlay").hidden = false;

    track("ViewContent", {
      content_id: p.id,
      content_name: p.name,
      currency: "SAR",
      value: p.price,
    }, {
      productIds: [p.id],
      value: p.price,
      currency: "SAR",
    });
  }

  function closeProduct() {
    $("#productOverlay").hidden = true;
    state.activeProductId = null;
  }

  function currentModalQty() {
    return parseInt($("#modalQty").textContent, 10) || 1;
  }

  function addActiveProductToCart() {
    var productId = state.activeProductId;
    var qty = currentModalQty();
    if (!productId) return;

    var existing = state.cart.find(function (i) { return i.productId === productId; });
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + qty);
    } else {
      state.cart.push({ productId: productId, quantity: qty });
    }
    saveCart();
    updateCartCount();
    closeProduct();

    var p = state.products[productId];
    if (p) {
      track("AddToCart", {
        content_id: p.id,
        content_name: p.name,
        currency: "SAR",
        value: p.price * qty,
      }, {
        productIds: [p.id],
        value: p.price * qty,
        currency: "SAR",
      });
    }
    openCart();
  }

  // -------------------------------------------------------------------
  // Cart
  // -------------------------------------------------------------------
  function cartTotal() {
    return state.cart.reduce(function (sum, item) {
      var p = state.products[item.productId];
      return sum + (p ? p.price * item.quantity : 0);
    }, 0);
  }

  function cartCount() {
    return state.cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }

  function updateCartCount() {
    $("#cartCount").textContent = cartCount();
  }

  function renderCart() {
    var container = $("#cartItems");
    if (!state.cart.length) {
      container.innerHTML = '<p class="cart-empty">سلتك فارغة</p>';
      $("#checkoutBtn").disabled = true;
    } else {
      container.innerHTML = state.cart.map(function (item) {
        var p = state.products[item.productId];
        if (!p) return "";
        return (
          '<div class="cart-item">' +
            "<div>" +
              '<div class="cart-item-name">' + escapeHtml(p.name) + "</div>" +
              '<div class="cart-item-meta">' + item.quantity + " × " + fmtPrice(p.price) + "</div>" +
            "</div>" +
            '<button class="cart-item-remove" data-action="remove-item" data-product-id="' + escapeAttr(item.productId) + '">إزالة</button>' +
          "</div>"
        );
      }).join("");
      $("#checkoutBtn").disabled = false;
    }
    $("#cartTotal").textContent = fmtPrice(cartTotal());
    updateCartCount();
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(function (i) { return i.productId !== productId; });
    saveCart();
    renderCart();
  }

  function openCart() {
    renderCart();
    $("#cartOverlay").hidden = false;
  }

  function closeCart() { $("#cartOverlay").hidden = true; }

  // -------------------------------------------------------------------
  // Checkout
  // -------------------------------------------------------------------
  function openCheckout() {
    if (!state.cart.length) return;
    closeCart();
    $("#checkoutError").hidden = true;
    $("#checkoutOverlay").hidden = false;

    var items = state.cart.map(function (i) { return i.productId; });
    track("InitiateCheckout", {
      currency: "SAR",
      value: cartTotal(),
      content_ids: items,
    }, {
      productIds: items,
      value: cartTotal(),
      currency: "SAR",
    });
  }

  function closeCheckout() { $("#checkoutOverlay").hidden = true; }

  function submitCheckout(evt) {
    evt.preventDefault();
    var form = evt.target;
    var submitBtn = $("#submitOrderBtn");
    var errorEl = $("#checkoutError");
    errorEl.hidden = true;

    if (!state.cart.length) return;

    var payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      city: form.city.value.trim(),
      address: form.address.value.trim(),
      items: state.cart.map(function (i) { return { productId: i.productId, quantity: i.quantity }; }),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "جاري إرسال الطلب...";

    fetch(apiUrl("/api/orders/prepare"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.detail || "تعذر إرسال الطلب"); });
        return res.json();
      })
      .then(function (prepared) {
        var completeEventId = newEventId();
        return fetch(apiUrl("/api/orders/complete"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: prepared.orderId, eventId: completeEventId }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error("تعذر تأكيد الطلب");
            return res.json();
          })
          .then(function () {
            var contentIds = state.cart.map(function (i) { return i.productId; });
            pixelTrack("CompletePayment", {
              currency: "SAR",
              value: prepared.total,
              content_ids: contentIds,
            }, completeEventId);
            // Server already dispatches the CompletePayment CAPI event as
            // part of /api/orders/complete, so we don't call /api/e here —
            // this avoids double logging while keeping pixel + CAPI in sync
            // via the shared completeEventId.
            return prepared;
          });
      })
      .then(function (prepared) {
        form.reset();
        state.cart = [];
        saveCart();
        updateCartCount();
        closeCheckout();
        showThankYou(prepared.orderId);
      })
      .catch(function (err) {
        errorEl.textContent = err.message || "حدث خطأ، حاول مرة أخرى.";
        errorEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "تأكيد الطلب";
      });
  }

  function showThankYou(orderId) {
    $("#thankYouOrderId").textContent = orderId;
    $("#thankYouOverlay").hidden = false;
  }

  function closeThankYou() { $("#thankYouOverlay").hidden = true; }

  // -------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------
  document.addEventListener("click", function (evt) {
    var target = evt.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    switch (action) {
      case "open-product":
        openProduct(target.getAttribute("data-product-id"));
        break;
      case "close-product":
        closeProduct();
        break;
      case "qty-inc": {
        var incEl = $("#modalQty");
        incEl.textContent = Math.min(10, currentModalQty() + 1);
        break;
      }
      case "qty-dec": {
        var decEl = $("#modalQty");
        decEl.textContent = Math.max(1, currentModalQty() - 1);
        break;
      }
      case "add-to-cart":
        addActiveProductToCart();
        break;
      case "open-cart":
        openCart();
        break;
      case "close-cart":
        closeCart();
        break;
      case "remove-item":
        removeFromCart(target.getAttribute("data-product-id"));
        break;
      case "go-checkout":
        openCheckout();
        break;
      case "close-checkout":
        closeCheckout();
        break;
      case "close-thankyou":
        closeThankYou();
        break;
      case "go-shop":
        evt.preventDefault();
        closeCart();
        closeProduct();
        closeCheckout();
        closeThankYou();
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
    }
  });

  $("#checkoutForm").addEventListener("submit", submitCheckout);

  document.addEventListener("keydown", function (evt) {
    if (evt.key === "Escape") {
      closeProduct();
      closeCart();
      closeCheckout();
    }
  });

  // -------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------
  initPixel();
  loadProducts();
  updateCartCount();

  if (!API_BASE) {
    console.warn("BASHARTI_CONFIG.API_BASE is empty — set it in config.js once the backend is deployed.");
  }
})();
