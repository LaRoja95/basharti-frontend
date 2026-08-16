/* Basharti (بشرتي) storefront logic.
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

  // Shown if the API is temporarily unreachable (store still browsable).
  var FALLBACK_PRODUCTS = [
    {
      id: "scar-gel-tcm",
      name: "جل مرهم لإزالة آثار الندبات وحب الشباب",
      description: "تركيبة TCM بسنتيلا آسياتيكا ونياسيناميد — 30 جرام.",
      price: 199,
      image: "assets/products/scar-gel/hero-product.png?v=3",
    },
    { id: "serum-vitc", name: "سيروم فيتامين سي للوجه", description: "سيروم مضاد للأكسدة لتفتيح وتوحيد لون البشرة", price: 89, image: "" },
    { id: "cream-hydra", name: "كريم ترطيب مكثف", description: "ترطيب عميق لمدة 24 ساعة لجميع أنواع البشرة", price: 69, image: "" },
    { id: "sunscreen-spf50", name: "واقي شمس SPF 50", description: "حماية عالية من أشعة الشمس بملمس خفيف غير دهني", price: 75, image: "" },
    { id: "cleanser-gentle", name: "غسول لطيف للوجه", description: "ينظف دون أن يجرد البشرة من رطوبتها الطبيعية", price: 49, image: "" },
  ];

  var FALLBACK_REGIONS = [
    { id: "riyadh", name: "الرياض", shippingCost: 0 },
    { id: "makkah", name: "مكة المكرمة", shippingCost: 0 },
    { id: "eastern", name: "المنطقة الشرقية", shippingCost: 0 },
  ];

  var state = {
    products: {},      // id -> product
    regions: {},        // id -> region {name, shippingCost}
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
  function fmtPrice(price) { return price.toLocaleString("ar-SA") + " ر.س"; }

  function productMeta(productId) {
    var meta = (CONFIG.PRODUCT_META || {})[productId] || {};
    return {
      emoji: meta.emoji || "✨",
      category: meta.category || "تجميل",
      gradient: meta.gradient || "linear-gradient(135deg, #fce4ec, #e8a0ac)",
      image: meta.image || "",
    };
  }

  function renderProductThumb(p) {
    var meta = productMeta(p.id);
    var img = meta.image || p.image;
    if (img) {
      return '<img src="' + escapeAttr(img) + '" alt="' + escapeAttr(p.name) + '" loading="lazy" />';
    }
    var meta = productMeta(p.id);
    return (
      '<div class="product-thumb-placeholder" style="background:' + meta.gradient + '">' +
        '<span aria-hidden="true">' + meta.emoji + '</span>' +
      '</div>'
    );
  }

  function renderProductCategory(p) {
    var cat = productMeta(p.id).category;
    return '<span class="product-category">' + escapeHtml(cat) + '</span>';
  }

  function loadProducts() {
    fetch(apiUrl("/api/products"))
      .then(function (res) { if (!res.ok) throw new Error("bad status"); return res.json(); })
      .then(function (products) {
        state.products = {};
        products.forEach(function (p) { state.products[p.id] = p; });
        renderProductGrid(products);
      })
      .catch(function () {
        state.products = {};
        FALLBACK_PRODUCTS.forEach(function (p) { state.products[p.id] = p; });
        renderProductGrid(FALLBACK_PRODUCTS);
      });
  }

  function renderProductGrid(products) {
    var grid = $("#productGrid");
    if (!products.length) {
      grid.innerHTML = '<p class="loading">لا توجد منتجات حالياً.</p>';
      return;
    }
    grid.innerHTML = products.map(function (p) {
      return (
        '<article class="product-card" data-product-id="' + escapeAttr(p.id) + '" data-action="open-product">' +
          '<div class="product-thumb">' +
            renderProductCategory(p) +
            renderProductThumb(p) +
          '</div>' +
          '<div class="product-info">' +
            "<h3>" + escapeHtml(p.name) + "</h3>" +
            '<p class="product-desc">' + escapeHtml(p.description || "") + "</p>" +
            '<div class="product-footer">' +
              '<span class="product-price">' + fmtPrice(p.price) + "</span>" +
              '<span class="product-cod">COD</span>' +
            '</div>' +
          "</div>" +
        "</article>"
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
  // Shipping regions (wilayas)
  // -------------------------------------------------------------------
  function loadRegions() {
    fetch(apiUrl("/api/regions"))
      .then(function (res) { if (!res.ok) throw new Error("bad status"); return res.json(); })
      .then(function (regions) {
        state.regions = {};
        regions.forEach(function (r) { state.regions[r.id] = r; });
        var select = $("#regionSelect");
        if (!select) return;
        var placeholder = select.querySelector('option[value=""]');
        select.innerHTML = "";
        if (placeholder) select.appendChild(placeholder);
        regions.forEach(function (r) {
          var opt = document.createElement("option");
          opt.value = r.id;
          opt.textContent = r.name;
          select.appendChild(opt);
        });
      })
      .catch(function () {
        state.regions = {};
        FALLBACK_REGIONS.forEach(function (r) { state.regions[r.id] = r; });
        var select = $("#regionSelect");
        if (!select) return;
        var placeholder = select.querySelector('option[value=""]');
        select.innerHTML = "";
        if (placeholder) select.appendChild(placeholder);
        FALLBACK_REGIONS.forEach(function (r) {
          var opt = document.createElement("option");
          opt.value = r.id;
          opt.textContent = r.name;
          select.appendChild(opt);
        });
      });
  }

  function selectedRegion() {
    var select = $("#regionSelect");
    return select ? state.regions[select.value] : null;
  }

  function updateCheckoutSummary() {
    var subtotal = cartTotal();
    var region = selectedRegion();
    $("#summarySubtotal").textContent = fmtPrice(subtotal);
    $("#summaryShipping").textContent = region ? "مجاني" : "—";
    $("#summaryTotal").textContent = fmtPrice(subtotal);
  }

  // -------------------------------------------------------------------
  // Product modal
  // -------------------------------------------------------------------
  function openProduct(productId) {
    var p = state.products[productId];
    if (!p) return;
    state.activeProductId = productId;

    var thumb = renderProductThumb(p);

    $("#productModalBody").innerHTML = (
      '<div class="product-modal-thumb">' + thumb + "</div>" +
      '<p class="muted" style="margin:0 0 8px;font-weight:800">' + escapeHtml(productMeta(p.id).category) + '</p>' +
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
    updateCheckoutSummary();

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
      regionId: form.regionId.value,
      city: form.city.value.trim(),
      address: form.address.value.trim(),
      items: state.cart.map(function (i) { return { productId: i.productId, quantity: i.quantity }; }),
    };

    if (!payload.regionId) {
      errorEl.textContent = "الرجاء اختيار المنطقة";
      errorEl.hidden = false;
      return;
    }

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
        var items = state.cart.map(function (i) {
          var p = state.products[i.productId];
          return {
            name: p ? p.name : i.productId,
            quantity: i.quantity,
            price: p ? p.price : 0,
          };
        });
        form.reset();
        state.cart = [];
        saveCart();
        updateCartCount();
        closeCheckout();
        goToThankYou(prepared, {
          name: payload.name,
          regionName: prepared.regionName,
          items: items,
        });
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

  function goToThankYou(prepared, details) {
    try {
      sessionStorage.setItem("basharti:lastOrder", JSON.stringify({
        orderId: prepared.orderId,
        total: prepared.total,
        subtotal: prepared.subtotal,
        shipping: prepared.shipping || 0,
        regionName: prepared.regionName || details.regionName || "",
        name: details.name || "",
        items: details.items || [],
      }));
    } catch (e) {}
    window.location.href = "thank-you.html?order=" + encodeURIComponent(prepared.orderId);
  }

  // -------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------
  document.addEventListener("click", function (evt) {
    var target = evt.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    switch (action) {
      case "open-product":
        window.location.href = "product.html?id=" + encodeURIComponent(target.getAttribute("data-product-id"));
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
      case "go-shop":
        evt.preventDefault();
        closeCart();
        closeProduct();
        closeCheckout();
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
    }
  });

  $("#checkoutForm").addEventListener("submit", submitCheckout);
  $("#regionSelect").addEventListener("change", updateCheckoutSummary);

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
  loadRegions();
  updateCartCount();

  if (sessionStorage.getItem("basharti:openCart")) {
    sessionStorage.removeItem("basharti:openCart");
    setTimeout(openCart, 300);
  }

  if (!API_BASE) {
    console.warn("BASHARTI_CONFIG.API_BASE is empty — set it in config.js once the backend is deployed.");
  }
})();
