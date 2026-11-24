/* PVW: interações do site (sem dependências) */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  window.dataLayer = window.dataLayer || [];
  function track(ev) { window.dataLayer.push(ev); }

  /* ---------- menu mobile ---------- */
  (function () {
    var b = $(".burger"); if (!b) return;
    function set(open) {
      document.body.classList.toggle("menu-open", open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
    b.addEventListener("click", function () { set(!document.body.classList.contains("menu-open")); });
    $$("#nav a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  })();

  /* ---------- vídeo do hero (só desktop; economiza dados) ---------- */
  (function () {
    var v = $("#hero-video"); if (!v) return;
    var mq = window.matchMedia("(min-width: 960px)");
    var saver = navigator.connection && navigator.connection.saveData;
    function load() {
      if (!mq.matches || v.getAttribute("data-ok")) return;
      v.setAttribute("data-ok", "1");
      v.src = v.getAttribute("data-src");
      if (reduce || saver) { v.preload = "none"; return; }
      v.preload = "metadata";
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    load();
    if (mq.addEventListener) mq.addEventListener("change", load);
  })();

  /* ---------- depoimentos: botões da rolagem horizontal ---------- */
  $$(".hs__head").forEach(function (head) {
    var box = head.nextElementSibling; if (!box) return;
    $$(".hs__btn", head).forEach(function (b) {
      b.addEventListener("click", function () {
        var card = box.firstElementChild, step = (card ? card.offsetWidth : 360) + 24;
        box.scrollBy({ left: parseInt(b.getAttribute("data-dir"), 10) * step, behavior: reduce ? "auto" : "smooth" });
      });
    });
    /* arrastar com o mouse (no celular a rolagem por toque já funciona) */
    var down = false, sx = 0, sl = 0, moved = false;
    box.addEventListener("pointerdown", function (e) {
      if (box.hasAttribute("data-pin")) return;
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = box.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; box.classList.add("drag"); }
      if (moved) box.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () { if (!down) return; down = false; box.classList.remove("drag"); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { box.scrollBy({ left: 360, behavior: "smooth" }); }
      if (e.key === "ArrowLeft") { box.scrollBy({ left: -360, behavior: "smooth" }); }
    });
  });

  /* ---------- rolagem horizontal guiada pela rolagem da página: a seção fica fixa e as fotos andam para o lado até o fim ---------- */
  (function () {
    if (reduce) return;
    var items = [];
    $$(".hscroll").forEach(function (box) {
      var sec = box.closest("section"); if (!sec) return;
      var pin = document.createElement("div"); pin.className = "pin";
      sec.parentNode.insertBefore(pin, sec); pin.appendChild(sec);
      sec.classList.add("pin__sec"); box.setAttribute("data-pin", "1");
      pin.style.background = getComputedStyle(sec).backgroundColor;
      items.push({ pin: pin, sec: sec, box: box });
    });
    if (!items.length) return;
    var hd = document.querySelector(".hd");
    /* altura do cabeçalho enquanto a página rola (a faixa de cima sai de vista) */
    function hdH() { if (!hd) return 0; return Math.max(0, hd.offsetHeight + (parseFloat(getComputedStyle(hd).top) || 0)); }
    function size() {
      var h = hdH();
      items.forEach(function (it) {
        it.sec.style.minHeight = "calc(100vh - " + h + "px)"; it.sec.style.top = h + "px";
        it.max = Math.max(0, it.box.scrollWidth - it.box.clientWidth);
        it.pin.style.height = (it.sec.offsetHeight + it.max) + "px";
      });
      update();
    }
    function update() {
      var h = hdH(), y = window.scrollY;
      items.forEach(function (it) {
        if (!it.max) return;
        var start = it.pin.getBoundingClientRect().top + y - h;
        it.box.scrollLeft = Math.max(0, Math.min(it.max, y - start));
      });
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", size);
    window.addEventListener("load", size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
    /* setas: andam a página (e, com ela, as fotos) */
    $$(".hs__btn").forEach(function (b) {
      b.addEventListener("click", function (e) {
        var head = b.closest(".hs__head"), box = head && head.nextElementSibling;
        if (!box || !box.hasAttribute("data-pin")) return;
        e.stopImmediatePropagation();
        var card = box.firstElementChild, step = (card ? card.offsetWidth : 300) + 24;
        window.scrollBy({ top: parseInt(b.getAttribute("data-dir"), 10) * step, behavior: "smooth" });
      }, true);
    });
  })();

  /* ---------- depoimentos: foto e painel sincronizados com a rolagem ---------- */
  (function () {
    var tr = $("#tq-track"), ph = $("#tq-photo"); if (!tr || !ph) return;
    var slides = $$(".tq__slide", tr), cur = 0;
    function show(i) {
      if (i === cur) return; cur = i;
      var s = slides[i]; ph.src = s.getAttribute("data-foto"); ph.alt = "Foto de " + s.getAttribute("data-nome");
    }
    tr.addEventListener("scroll", function () { show(Math.max(0, Math.min(slides.length - 1, Math.round(tr.scrollLeft / tr.clientWidth)))); }, { passive: true });
    $$(".tq__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = parseInt(b.getAttribute("data-dir"), 10), nxt = cur + d;
        if (nxt >= slides.length) nxt = 0; if (nxt < 0) nxt = slides.length - 1;
        tr.scrollTo({ left: nxt * tr.clientWidth, behavior: reduce ? "auto" : "smooth" });
      });
    });
    tr.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") tr.scrollBy({ left: tr.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") tr.scrollBy({ left: -tr.clientWidth, behavior: "smooth" });
    });
  })();

  /* ---------- vídeo da seção "em ação": botão de play grande ---------- */
  (function () {
    var v = $("#vid-main"), b = $("#vid-play"); if (!v || !b) return;
    var fr = v.parentNode;
    b.addEventListener("click", function () {
      v.controls = true; fr.classList.add("playing");
      var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; });
    });
    v.addEventListener("ended", function () { fr.classList.remove("playing"); v.controls = false; });
  })();

  /* ---------- aparecer ao rolar (textos e imagens) ---------- */
  (function () {
    var root = document.documentElement;
    if (!("IntersectionObserver" in window) || reduce) { root.classList.remove("js"); return; }
    var sel = [
      ".nums__grid > div", ".selos li", ".h2", ".eyebrow", ".lede", ".checks li", ".filtros", ".count",
      ".oc", ".step", ".intro p", ".expertise li", ".svc__c", ".band h2", ".band .btn", ".bagrid", ".vid__txt", ".vid__frame",
      ".tq4", ".socs", ".ft__box", ".ft__cols > div", ".logos li", ".faq details", ".contato .lede", ".contato .btn", ".cl li", ".note",
      ".ohero .bc", ".ohero h1", ".ohero .tag", ".ohero__img", ".odet__txt > *", ".odet__box", ".vids figure", ".gal > *", ".ba2 > *"
    ].join(",");
    var seen = [];
    $$(sel).forEach(function (e) {
      if (e.closest(".hero") || e.closest(".hd") || seen.indexOf(e) >= 0) return;
      seen.push(e);
      var sibs = Array.prototype.filter.call(e.parentNode.children, function (x) { return x.className === e.className; });
      e.style.setProperty("--d", (Math.max(0, sibs.indexOf(e)) % 3) * 110 + "ms");
      e.classList.add("rv");
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target; io.unobserve(t); t.classList.add("in");
        /* depois da animação, devolve o controle ao hover do próprio componente */
        setTimeout(function () { t.classList.remove("rv", "in"); t.style.removeProperty("--d"); }, 1300);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    seen.forEach(function (e) { io.observe(e); });
  })();

  /* ---------- contadores ---------- */
  (function () {
    var els = $$("[data-count]"); if (!els.length) return;
    function fmt(n) { return n.toLocaleString("en-US"); }
    function run(el) {
      var to = parseInt(el.getAttribute("data-count"), 10), suf = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = "+" + fmt(to) + suf; return; }
      var t0 = null, dur = 1800;
      function f(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = "+" + fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suf;
        if (p < 1) requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- filtros do portfólio ---------- */
  (function () {
    var grid = $("#ogrid"); if (!grid) return;
    var sel = $("#f-bairro"), chips = $$("#f-tipos .chip"), count = $("#f-count"), vazio = $("#f-vazio");
    var cards = $$(".oc", grid), tipo = "";
    /* mosaico: fotos quadradas (sq) e em formato story (st), alternando. Em 4 colunas cada coluna fecha com 1 quadrada + 1 story */
    var PAT4 = ["st", "sq", "st", "sq", "st", "st", "sq", "sq"], PAT2 = ["st", "sq", "sq", "st"];
    var mq = window.matchMedia("(min-width:960px)");
    function pat() { return mq.matches ? PAT4 : PAT2; }
    function sizes(n, off) { var P = pat(), a = []; for (var i = 0; i < n; i++) a.push(P[(i + (off || 0)) % P.length]); return a; }
    function visible() { return cards.filter(function (c) { return !c.hidden; }); }
    function setSizes(vis, sz) {
      cards.forEach(function (c) { c.classList.remove("m-sq", "m-st"); c.style.gridRowEnd = ""; });
      vis.forEach(function (c, i) { c.classList.add("m-" + sz[i]); });
      vis.forEach(function (c) { c.style.gridRowEnd = "span " + Math.ceil(c.offsetHeight); });
    }
    var curOff = 0;
    function layout() { var vis = visible(); setSizes(vis, sizes(vis.length, curOff)); }
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    layout();
    /* anima a troca de posição e de tamanho das fotos (técnica FLIP) */
    function flip(mutate) {
      var before = {}; visible().forEach(function (c) { before[cards.indexOf(c)] = c.getBoundingClientRect(); });
      mutate();
      if (reduce || !grid.animate) return;
      visible().forEach(function (c) {
        var f = before[cards.indexOf(c)], l = c.getBoundingClientRect();
        if (!f) { c.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" }); return; }
        var dx = f.left - l.left, dy = f.top - l.top, sx = f.width / l.width, sy = f.height / l.height;
        if (!dx && !dy && sx === 1 && sy === 1) return;
        c.animate([{ transformOrigin: "top left", transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")" }, { transformOrigin: "top left", transform: "none" }], { duration: 620, easing: "cubic-bezier(.2,.7,.2,1)" });
      });
    }
    function apply(fromUser) {
      var b = sel.value, n = 0;
      flip(function () {
        cards.forEach(function (c) {
          var ok = (!b || c.getAttribute("data-bairro") === b) && (!tipo || (" " + c.getAttribute("data-tipos") + " ").indexOf(" " + tipo + " ") >= 0);
          c.hidden = !ok; if (ok) n++;
        });
        layout();
      });
      count.textContent = n + (n === 1 ? " obra" : " obras");
      vazio.hidden = n !== 0;
      if (fromUser) track({ event: "filtro_portfolio", filtro_bairro: b || "todos", filtro_tipo: tipo || "todos", resultados: n });
    }
    var sh = $("#f-shuffle");
    if (sh) sh.addEventListener("click", function () {
      flip(function () {
        var order = cards.slice().sort(function () { return Math.random() - 0.5; });
        order.forEach(function (c) { grid.appendChild(c); });
        cards = order;
        curOff = Math.floor(Math.random() * pat().length);
        layout();
      });
      track({ event: "filtro_portfolio", filtro_bairro: "misturar", filtro_tipo: "misturar", resultados: visible().length });
    });
    sel.addEventListener("change", function () { apply(true); });
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        tipo = ch.getAttribute("data-tipo");
        chips.forEach(function (x) { x.setAttribute("aria-pressed", x === ch ? "true" : "false"); });
        apply(true);
      });
    });
  })();

  /* ---------- mapa: o bairro da lista acende no mapa ---------- */
  (function () {
    var mapa = $("#mapa"); if (!mapa) return;
    $$(".mapa__list li").forEach(function (li) {
      function on(v) { var g = mapa.querySelector('.mp[data-n="' + li.textContent + '"]'); if (g) g.classList.toggle("on", v); }
      li.addEventListener("mouseenter", function () { on(true); });
      li.addEventListener("mouseleave", function () { on(false); });
    });
  })();

  /* ---------- página de obra: evento de visualização ---------- */
  (function () {
    var o = document.body.getAttribute("data-obra");
    if (o) track({ event: "obra_view", obra: o });
  })();

  /* ---------- ano no rodapé ---------- */
  var y = document.getElementById("ano");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- cookies e consentimento (Consent Mode v2) ---------- */
  (function () {
    var KEY = "pvw-consent", bar = document.getElementById("ck"), modal = document.getElementById("ck-modal"), pixelLoaded = false;
    function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
    function loadPixel() {
      var id = window.PVW && window.PVW.pixel;
      if (pixelLoaded || !id) return; pixelLoaded = true;
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      fbq("init", id); fbq("track", "PageView");
    }
    function grant() {
      if (window.gtag) gtag("consent", "update", {
        ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted",
        analytics_storage: "granted", functionality_storage: "granted", personalization_storage: "granted", security_storage: "granted"
      });
      loadPixel();
    }
    function hideAll() { if (bar) bar.hidden = true; if (modal) modal.hidden = true; }
    var saved = get();
    if (saved === "granted") grant();
    if (!saved && bar) bar.hidden = false;
    function accept() { set("granted"); grant(); hideAll(); }
    function reject() { set("denied"); hideAll(); }
    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
    on("ck-accept", accept); on("ck-reject", reject); on("ck-all", accept); on("ck-min", reject);
    on("ck-settings", function () { modal.hidden = false; }); on("ck-settings-link", function () { modal.hidden = false; });
    on("ck-close", function () { modal.hidden = true; });
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal) modal.hidden = true; });
  })();
})();
