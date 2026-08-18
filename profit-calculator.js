/* Basharti internal — COD profit calculator (Saudi e-commerce) */

(function () {
  "use strict";

  var CONFIG = window.BASHARTI_CONFIG || {};
  var API_BASE = (CONFIG.API_BASE || "").replace(/\/$/, "");

  var DEFAULTS = {
    aovSar: 195,
    sarUsd: 0.2667,
    unitPriceSar: 195,
    productCostUsd: 4,
    cplUsd: 0,
    confirmRate: 45,
    deliveryRate: 60,
    leadsScale: 1000,
    codConfirmed: 1.7,
    codDelivered: 4,
    codReturned: 1.3,
    codFulfilled: 0.8,
  };

  function $(id) { return document.getElementById(id); }

  function num(id, fallback) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? fallback : v;
  }

  function pct(id, fallback) {
    return num(id, fallback) / 100;
  }

  function fmtUsd(n) {
    var sign = n < 0 ? "-" : "+";
    return sign + "$" + Math.abs(n).toFixed(2);
  }

  function fmtPct(n) {
    return (n * 100).toFixed(1) + "%";
  }

  function inputs() {
    return {
      aovSar: num("aovSar", DEFAULTS.aovSar),
      sarUsd: num("sarUsd", DEFAULTS.sarUsd),
      unitPriceSar: num("unitPriceSar", DEFAULTS.unitPriceSar),
      productCostUsd: num("productCostUsd", DEFAULTS.productCostUsd),
      cplUsd: num("cplUsd", DEFAULTS.cplUsd),
      confirmRate: pct("confirmRate", DEFAULTS.confirmRate),
      deliveryRate: pct("deliveryRate", DEFAULTS.deliveryRate),
      leadsScale: num("leadsScale", DEFAULTS.leadsScale),
      codConfirmed: num("codConfirmed", DEFAULTS.codConfirmed),
      codDelivered: num("codDelivered", DEFAULTS.codDelivered),
      codReturned: num("codReturned", DEFAULTS.codReturned),
      codFulfilled: num("codFulfilled", DEFAULTS.codFulfilled),
    };
  }

  function piecesPerOrder(inp) {
    if (inp.unitPriceSar <= 0) return 1;
    return Math.max(1, inp.aovSar / inp.unitPriceSar);
  }

  function project(leads, inp) {
    var confirmed = leads * inp.confirmRate;
    var delivered = confirmed * inp.deliveryRate;
    var returned = confirmed - delivered;
    var aovUsd = inp.aovSar * inp.sarUsd;
    var pieces = piecesPerOrder(inp);

    var revenue = delivered * aovUsd;
    var adSpend = leads * inp.cplUsd;
    var productCost = delivered * inp.productCostUsd * pieces;
    var confirmFees = confirmed * inp.codConfirmed;
    var fulfillFees = confirmed * inp.codFulfilled;
    var deliveryFees = delivered * inp.codDelivered;
    var returnFees = returned * inp.codReturned;
    var opsCost = confirmFees + fulfillFees + deliveryFees + returnFees;
    var totalCost = adSpend + productCost + opsCost;
    var netProfit = revenue - totalCost;

    return {
      leads: leads,
      confirmed: confirmed,
      delivered: delivered,
      returned: returned,
      aovUsd: aovUsd,
      pieces: pieces,
      revenue: revenue,
      adSpend: adSpend,
      productCost: productCost,
      confirmFees: confirmFees,
      fulfillFees: fulfillFees,
      deliveryFees: deliveryFees,
      returnFees: returnFees,
      opsCost: opsCost,
      totalCost: totalCost,
      netProfit: netProfit,
      roi: totalCost > 0 ? (netProfit / totalCost) * 100 : 0,
      profitPerLead: leads > 0 ? netProfit / leads : 0,
      profitPerDelivery: delivered > 0 ? netProfit / delivered : 0,
      netPerDeliveredExAds: delivered > 0 ? (revenue - productCost - opsCost) / delivered : 0,
    };
  }

  function solveDeliveryBreakeven(inp, leads) {
    var lo = 0.001;
    var hi = 1;
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2;
      var trial = Object.assign({}, inp, { deliveryRate: mid });
      if (project(leads, trial).netProfit > 0) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  function solveConfirmBreakeven(inp, leads) {
    var lo = 0.001;
    var hi = 1;
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2;
      var trial = Object.assign({}, inp, { confirmRate: mid });
      if (project(leads, trial).netProfit > 0) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  function maxAffordableCpl(inp, leads) {
    var lo = 0;
    var hi = 200;
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2;
      var trial = Object.assign({}, inp, { cplUsd: mid });
      if (project(leads, trial).netProfit > 0) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function render() {
    var inp = inputs();
    var scale = project(inp.leadsScale, inp);
    var unit = project(1, inp);

    $("statAovUsd").textContent = "$" + scale.aovUsd.toFixed(2);
    $("statPieces").textContent = scale.pieces.toFixed(2);
    $("statNetDelivered").textContent = fmtUsd(scale.netPerDeliveredExAds);
    $("statNetDelivered").className = "pc-stat-value " + (scale.netPerDeliveredExAds >= 0 ? "pos" : "neg");

    $("beProfitLead").textContent = fmtUsd(unit.profitPerLead);
    $("beProfitLead").className = "pc-metric-value " + (unit.profitPerLead >= 0 ? "pos" : "neg");
    $("beDelivery").textContent = fmtPct(solveDeliveryBreakeven(inp, inp.leadsScale));
    $("beDeliveryNote").textContent = "Current: " + Math.round(inp.deliveryRate * 100) + "%";
    $("beCpl").textContent = "$" + maxAffordableCpl(inp, inp.leadsScale).toFixed(2);
    $("beCplNote").textContent = "Current CPL: $" + inp.cplUsd.toFixed(2);
    $("beConfirm").textContent = fmtPct(solveConfirmBreakeven(inp, inp.leadsScale));
    $("beConfirmNote").textContent = "Current: " + Math.round(inp.confirmRate * 100) + "%";

    $("scaleFunnel").textContent =
      Math.round(scale.leads) + " leads → " +
      Math.round(scale.confirmed) + " confirmed → " +
      Math.round(scale.delivered) + " delivered";
    $("scaleRevenue").textContent = fmtUsd(scale.revenue).replace("+", "");
    $("scaleAdSpend").textContent = "-$" + scale.adSpend.toFixed(2);
    $("scaleProduct").textContent = "-$" + scale.productCost.toFixed(2);
    $("scaleConfirm").textContent = "-$" + scale.confirmFees.toFixed(2);
    $("scaleFulfill").textContent = "-$" + scale.fulfillFees.toFixed(2);
    $("scaleDelivery").textContent = "-$" + scale.deliveryFees.toFixed(2);
    $("scaleReturn").textContent = "-$" + scale.returnFees.toFixed(2);
    $("scaleTotalCost").textContent = "-$" + scale.totalCost.toFixed(2);
    $("scaleNet").textContent = fmtUsd(scale.netProfit);
    $("scaleNet").className = "pc-scale-total " + (scale.netProfit >= 0 ? "pos" : "neg");
    $("scaleRoi").textContent = (scale.roi >= 0 ? "+" : "") + scale.roi.toFixed(1) + "%";
    $("scaleRoi").className = "pc-scale-metric " + (scale.roi >= 0 ? "pos" : "neg");
    $("scalePpl").textContent = fmtUsd(scale.profitPerLead);
    $("scalePpl").className = "pc-scale-metric " + (scale.profitPerLead >= 0 ? "pos" : "neg");
    $("scalePpd").textContent = fmtUsd(scale.profitPerDelivery);
    $("scalePpd").className = "pc-scale-metric " + (scale.profitPerDelivery >= 0 ? "pos" : "neg");
  }

  function bindInputs() {
    var ids = [
      "aovSar", "sarUsd", "unitPriceSar", "productCostUsd", "cplUsd",
      "confirmRate", "deliveryRate", "leadsScale",
      "codConfirmed", "codDelivered", "codReturned", "codFulfilled",
    ];
    ids.forEach(function (id) {
      $(id).addEventListener("input", render);
    });
  }

  function loadStoreAov() {
    if (!API_BASE) {
      $("loadAovStatus").textContent = "API_BASE فارغ — استخدمي 195 يدوياً";
      return;
    }
    var token = $("adminToken").value.trim();
    if (!token) {
      $("loadAovStatus").textContent = "أدخلي ADMIN_TOKEN أولاً";
      return;
    }
    $("loadAovStatus").textContent = "جاري التحميل...";
    fetch(API_BASE + "/api/admin/orders", { headers: { "X-Admin-Token": token } })
      .then(function (r) {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then(function (orders) {
        var completed = orders.filter(function (o) { return o.status === "completed"; });
        if (!completed.length) {
          $("loadAovStatus").textContent = "لا توجد طلبات مكتملة بعد — استخدمي 195";
          return;
        }
        var sum = completed.reduce(function (s, o) { return s + (o.total_sar || 0); }, 0);
        var avg = Math.round(sum / completed.length);
        $("aovSar").value = avg;
        $("loadAovStatus").textContent = "AOV من " + completed.length + " طلب: " + avg + " ر.س";
        render();
      })
      .catch(function () {
        $("loadAovStatus").textContent = "فشل التحميل — تحققي من التوكن";
      });
  }

  bindInputs();
  $("btnLoadAov").addEventListener("click", loadStoreAov);
  render();
})();
