#!/usr/bin/env node
/**
 * Gera o site estático da PVW a partir de data/*.json.
 *   node scripts/build.js
 * Saída: index.html, obras/<slug>/index.html e sitemap.xml (na raiz do projeto).
 * Para cadastrar uma obra nova, edite data/obras.json e rode este comando. Não precisa mexer no layout.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const site = read("site.json");
const conteudo = read("conteudo.json");
const { tipos, obras } = read("obras.json");

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const nf = (n) => Number(n).toLocaleString("en-US");

/* ---------- ícones (traço, 24x24) ---------- */
const ic = (inner, extra = "") => `<svg class="i ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
const ICONS = {
  visita: ic('<path d="M9 4h6v3H9z"/><path d="M7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1"/><circle cx="12" cy="14" r="3"/><path d="m14.2 16.2 2 2"/>'),
  carpintaria: ic('<path d="m14 5 5 5-2.5 2.5-5-5z"/><path d="m11.5 9.5L4 17l3 3 7.5-7.5"/>'),
  alvenaria: ic('<rect x="3" y="5" width="18" height="14"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19"/>'),
  hidraulica: ic('<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>'),
  eletrica: ic('<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>'),
  cobertura: ic('<path d="M3 12 12 4l9 8"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>'),
  acabamento: ic('<rect x="4" y="3" width="14" height="5" rx="1"/><path d="M18 5.5h2v5h-8v3"/><rect x="10.5" y="13.5" width="3" height="7" rx="1"/>'),
  gesso: ic('<rect x="3" y="4" width="18" height="16"/><path d="M3 12h18M9 4v8M15 12v8"/>'),
  gourmet: ic('<path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.6.8-2.6 1.5-3.5.3 1 .9 1.6 1.5 1.8C11 7.5 11 5 12 3z"/><path d="M5 21h14"/>'),
  mail: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  phone: ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  insta: ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  pin: ic('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  star: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  arrow: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chev: ic('<path d="m6 9 6 6 6-6"/>'),
  check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
};
const waFile = path.join(ROOT, "data", "whatsapp-icon.svg");
const WA_SVG = fs.existsSync(waFile) ? fs.readFileSync(waFile, "utf8") : '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>';

/* ---------- helpers ---------- */
const WA = site.whatsappUrl; // URL EXATO: o gatilho de conversão do GTM compara com este valor
const waLink = (cls, txt) => `<a class="btn ${cls}" href="${WA}" target="_blank" rel="noopener">${txt}</a>`;
const labelTipo = (t) => tipos[t] || t;

function pic(basePath, alt, w, h, attrs = "", loading = "lazy") {
  const avif = exists(basePath.replace(/\.\w+$/, ".avif"));
  const src = basePath;
  const img = `<img src="${R}${src}" width="${w}" height="${h}" alt="${esc(alt)}" ${loading === "eager" ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" ${attrs}>`;
  return avif ? `<picture><source type="image/avif" srcset="${R}${basePath.replace(/\.\w+$/, ".avif")}">${img}</picture>` : img;
}
let R = ""; // prefixo relativo ("" na home, "../../" nas obras)

const crumbs = (items) => JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it[0], item: it[1] })) });

function head({ title, desc, canonical, image, jsonld, preload }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#2a45eb">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="48x48" href="${R}favicon-48.png">
<link rel="apple-touch-icon" href="${R}favicon-192.png">
<link rel="preload" href="${R}fonts/Archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.classList.add("js")</script>
${preload || ""}<link rel="stylesheet" href="${R}css/style.css">

<!-- Consent Mode v2: tudo negado até o visitante aceitar o banner (como no site anterior) -->
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'denied',wait_for_update:500});
</script>
<!-- Google Tag Manager (${site.gtm}: tag de conversão do Google Ads + GA4) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${site.gtm}');</script>
${jsonld.map((j) => `<script type="application/ld+json">${j}</script>`).join("\n")}
</head>`;
}

function header(isHome) {
  const h = isHome ? "" : `${R}index.html`;
  const links = [["obras", "Obras"], ["processo", "Processo"], ["servicos", "Serviços"], ["depoimentos", "Depoimentos"], ["faq", "FAQ"], ["contato", "Contato"]];
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${site.gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="hd" id="topo">
  <div class="hd__top">
    <div class="wrap hd__topin">
      <a class="brand" href="${R}index.html" aria-label="${esc(site.nome)}, página inicial"><img class="brand__c" src="${R}img/logo-cor.webp" width="48" height="44" alt="${esc(site.nome)}"><img class="brand__w" src="${R}img/logo-branca.webp" width="125" height="114" alt="" aria-hidden="true"></a>
      <ul class="hd__info">
        <li><span class="hd__ic">${ICONS.mail}</span><div><b>Envie um e-mail</b><a href="mailto:${site.email}">${esc(site.email)}</a></div></li>
        <li><span class="hd__ic">${ICONS.phone}</span><div><b>Ligue para nós</b><a href="tel:${site.telefone}">${esc(site.whatsappTexto)}</a></div></li>
      </ul>
      <div class="hd__soc">
        <a href="${site.instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram ${esc(site.instagramUsuario)}">${ICONS.insta}</a>
        ${site.googleMeuNegocioUrl ? `<a href="${site.googleMeuNegocioUrl}" target="_blank" rel="noopener" aria-label="PVW no Google">${ICONS.star}</a>` : ""}
      </div>
    </div>
  </div>
  <div class="hd__bar">
    <div class="wrap hd__barin">
      <nav class="nav" id="nav" aria-label="Principal">
        ${links.map(([id, t]) => `<a href="${h}#${id}">${t}</a>`).join("\n        ")}
      </nav>
      ${waLink("btn--cta hd__cta", "Solicite um orçamento")}
      <button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

function footer() {
  const dados = [];
  if (site.cnpj) dados.push(`CNPJ ${esc(site.cnpj)}`);
  if (site.registroProfissional) dados.push(esc(site.registroProfissional));
  if (site.endereco) dados.push(esc(site.endereco));
  const navLinks = [["obras", "Obras"], ["processo", "Processo"], ["servicos", "Serviços"], ["depoimentos", "Depoimentos"], ["faq", "FAQ"], ["contato", "Contato"]];
  return `<footer class="ft">
  <div class="wrap">
    <div class="ft__box">
      <div class="ft__item">${ICONS.pin}<div><h3>Atendimento</h3><p>${esc(conteudo.area.regioes.join(", "))}</p>${site.endereco ? `<p>${esc(site.endereco)}</p>` : ""}</div></div>
      <div class="ft__item">${ICONS.phone}<div><h3>Ligue ou chame no WhatsApp</h3><p><a href="tel:${site.telefone}">${esc(site.whatsappTexto)}</a></p></div></div>
      <div class="ft__item">${ICONS.mail}<div><h3>E-mail</h3><p><a href="mailto:${site.email}">${esc(site.email)}</a></p></div></div>
    </div>
    <div class="ft__cols">
      <div><h3>Sobre a PVW</h3><p>${esc(conteudo.rodape)}</p><a class="ft__more" href="${R}index.html#sobre">Ler mais</a></div>
      <div><h3>Navegação</h3><ul class="ft__nav">${navLinks.map(([id, t]) => `<li><a href="${R}index.html#${id}">${t}</a></li>`).join("")}</ul></div>
      <div><h3>Serviços</h3><ul class="ft__nav">${conteudo.servicos.map((s) => `<li><a href="${R}index.html#servicos">${esc(s.titulo)}</a></li>`).join("")}</ul></div>
    </div>
    <div class="ft__bar">
      <div class="ft__soc"><span>Siga a PVW</span>
        <a href="${site.instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram ${esc(site.instagramUsuario)}">${ICONS.insta}</a>
        ${site.googleMeuNegocioUrl ? `<a href="${site.googleMeuNegocioUrl}" target="_blank" rel="noopener" aria-label="PVW no Google">${ICONS.star}</a>` : ""}
      </div>
      ${waLink("btn--cta", "Solicite um orçamento")}
    </div>
    ${dados.length ? `<p class="ft__dados">${dados.join(" · ")}</p>` : ""}
    <p class="ft__copy">© <span id="ano">2026</span> | ${esc(site.nome)}</p>
  </div>
</footer>

<a class="wa" href="${WA}" target="_blank" rel="noopener" aria-label="Falar com a PVW no WhatsApp">${WA_SVG}</a>

<div class="ck" id="ck" role="dialog" aria-label="Aviso de cookies" hidden>
  <div class="wrap">
    <p>Nós usamos cookies para dar a você uma melhor experiência em nosso site. Você pode descobrir mais sobre quais cookies estamos usando ou desativá-los em <button class="lnk" type="button" id="ck-settings-link">configurações</button>.</p>
    <div class="ck__b">
      <button class="pill" type="button" id="ck-accept">Aceitar</button>
      <button class="pill" type="button" id="ck-reject">Rejeitar</button>
      <button class="pill pill--o" type="button" id="ck-settings">Configurações</button>
    </div>
  </div>
</div>
<div class="modal" id="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ck-t" hidden>
  <div class="modal__in">
    <h2 id="ck-t">Política de Privacidade</h2>
    <p>Este site usa cookies para que possamos fornecer a melhor experiência de usuário possível. As informações de cookies são armazenadas em seu navegador e executam funções como reconhecê-lo quando você retorna ao nosso site e ajudar nossa equipe a entender quais seções do site você considera mais interessantes e úteis.</p>
    <p><b>Cookies estritamente necessários:</b> devem estar ativados o tempo todo para que possamos salvar suas preferências de cookies.</p>
    <p><b>Cookies de medição e anúncios:</b> ajudam a medir os contatos vindos do site e dos anúncios. Só são ativados se você aceitar.</p>
    <div class="ck__b">
      <button class="pill" type="button" id="ck-all">Habilitar todos</button>
      <button class="pill pill--o" type="button" id="ck-min">Somente necessários</button>
      <button class="pill pill--o" type="button" id="ck-close">Fechar</button>
    </div>
  </div>
</div>
<script>window.PVW=${JSON.stringify({ pixel: site.metaPixel })};</script>
<script src="${R}js/main.js" defer></script>
</body>
</html>`;
}

const sociais = () => {
  const l = [];
  l.push(`<a class="soc" href="${site.instagramUrl}" target="_blank" rel="noopener">${ICONS.insta}<span>Siga ${esc(site.instagramUsuario)} no Instagram</span></a>`);
  if (site.googleMeuNegocioUrl) l.push(`<a class="soc" href="${site.googleMeuNegocioUrl}" target="_blank" rel="noopener">${ICONS.star}<span>Avalie a PVW no Google</span></a>`);
  return `<div class="socs">${l.join("")}</div>`;
};

/* ---------- cartões de obra ---------- */
/* padrão do mosaico (l = grande 2x2, w = largo 2x1, t = alto 1x2, s = pequeno). O mesmo padrão existe em js/main.js */
const MOSAICO = ["l", "s", "s", "w", "t", "s", "w", "s", "s", "s"];
function cardObra(o, linkPrefix, tam) {
  const tag = o.status === "real" ? '<span class="tag tag--real">Obra real</span>' : '<span class="tag tag--ph">Foto ilustrativa</span>';
  const meta = [o.bairro || "Bairro a informar", o.tipos.map(labelTipo).join(", ")].join(" · ");
  const img = pic(`img/obras/${o.imagem}-card.webp`, o.titulo, 720, 450).replace(/(<img src="[^"]*-card\.webp")/, `$1 srcset="${R}img/obras/${o.imagem}-card.webp 720w${exists(`img/obras/${o.imagem}-lg.webp`) ? `, ${R}img/obras/${o.imagem}-lg.webp 1280w` : ""}" sizes="(min-width:960px) 50vw, 100vw"`);
  return `<article class="oc${tam ? " m-" + tam : ""}" data-bairro="${esc(o.bairro)}" data-tipos="${esc(o.tipos.join(" "))}">
  <a class="oc__a" href="${linkPrefix}obras/${o.slug}/index.html">
    <div class="oc__img">${img}${tag}</div>
    <span class="oc__hover" aria-hidden="true"><small>${esc(o.tipos.map(labelTipo).join(", "))}</small><strong>${esc(o.titulo)}</strong><em>Ver obra</em></span>
    <div class="oc__b">${ICONS.arrow}<div><p class="oc__m">${esc(meta)}</p><h3>${esc(o.titulo)}</h3></div></div>
  </a>
</article>`;
}

/* ---------- HOME ---------- */
function home() {
  R = "";
  const c = conteudo;
  const bairros = [...new Set(obras.map((o) => o.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const tiposUsados = Object.keys(tipos).filter((t) => obras.some((o) => o.tipos.includes(t)));
  const title = `Reformas e Construção no Rio de Janeiro | ${site.nome}`;
  const desc = "Aqui na PVW Construção e Reformas nós transformamos sonhos em realidade com qualidade e compromisso absoluto com os prazos acordados.";
  const ld = {
    "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: site.nome, url: site.dominio + "/",
    telephone: "+55 21 96852-4550", email: site.email, image: site.dominio + "/img/logo.jpg", description: "Reformas e construção residencial e comercial no Rio de Janeiro: estruturas, alvenaria, elétrica, hidráulica, gesso, acabamento e áreas gourmet.",
    areaServed: ["Rio de Janeiro", "Niterói"], sameAs: [site.instagramUrl, ...(site.googleMeuNegocioUrl ? [site.googleMeuNegocioUrl] : [])],
  };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const heroAvif = exists("img/hero.avif");
  const out = [];
  out.push(head({ title, desc, canonical: site.dominio + "/", image: site.dominio + "/img/hero.webp", jsonld: [JSON.stringify(ld), JSON.stringify(faqLd)], preload: `<link rel="preload" as="image" href="img/hero.${heroAvif ? "avif" : "webp"}" ${heroAvif ? 'type="image/avif"' : ""} fetchpriority="high">\n` }));
  out.push(`<body class="home">`);
  out.push(header(true));
  out.push(`<main id="conteudo">
<section class="hero">
  <div class="hero__bg">${pic("img/hero.webp", "", 1280, 726, "", "eager")}</div>
  <div class="wrap hero__in hero__grid">
    <div class="hero__txt">
      <p class="kicker">${esc(site.nome)} · Rio de Janeiro</p>
      <h1>${esc(c.hero.titulo)}</h1>
      <p class="lead">${esc(c.hero.subtitulo)}</p>
      <div class="hero__cta">${waLink("btn--cta btn--lg", "Solicite um orçamento")}<a class="btn btn--ghost btn--lg" href="#obras">Ver obras</a></div>
    </div>
    <div class="hero__phone">
      <div class="phone" role="group" aria-label="Vídeo da obra do muro de divisa">
        <span class="phone__btn phone__btn--a" aria-hidden="true"></span><span class="phone__btn phone__btn--b" aria-hidden="true"></span><span class="phone__btn phone__btn--c" aria-hidden="true"></span>
        <div class="phone__screen">
          <video id="hero-video" muted loop playsinline controls preload="none" poster="img/obras/video-obra-muro.webp" data-src="video/VideoObraMuro.mp4" aria-label="Vídeo da obra do muro de divisa de terreno"></video>
          <span class="phone__notch" aria-hidden="true"></span>
          <span class="phone__tag">Obra real</span>
        </div>
      </div>
      <a class="phone__cap" href="obras/muro-de-divisa/index.html"><span>Muro de divisa de terreno</span><b>Ver obra ${ICONS.arrow}</b></a>
    </div>
  </div>
</section>
<div class="area" aria-label="Área de atendimento">
  <div class="wrap area__in">
    <p class="area__l">${ICONS.pin}Atendemos ${c.area.regioes.map(esc).join(", ")}</p>
    <ul class="area__list">${c.area.bairros.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
  </div>
</div>

<section class="nums" aria-label="Números da PVW">
  <div class="wrap">
    <div class="nums__grid">
      <div><b class="num" data-count="${site.numeros.anos}">+${site.numeros.anos}</b><span>Anos de Experiência</span></div>
      <div><b class="num" data-count="${site.numeros.m2}" data-suffix="m²">+${nf(site.numeros.m2)}m²</b><span>Construídos</span></div>
      <div><b class="num" data-count="${site.numeros.projetos}">+${site.numeros.projetos}</b><span>Projetos Entregues</span></div>
    </div>
    <ul class="selos">${c.selos.map((s) => `<li>${ICONS.check}${esc(s)}</li>`).join("")}</ul>
  </div>
</section>

<section class="sec" id="obras">
  <div class="wrap">
    <h2 class="h2">Conheça algumas de nossas Obras Executadas</h2>
    <p class="lede">${esc(c.portfolioTexto)}</p>
    <ul class="checks">${c.portfolioLista.map((t) => `<li>${ICONS.check}<span>${esc(t)}</span></li>`).join("")}</ul>
    <div class="filtros" role="group" aria-label="Filtrar obras">
      <label class="sel"><span>Bairro</span><select id="f-bairro"><option value="">Todos os bairros</option>${bairros.map((b) => `<option>${esc(b)}</option>`).join("")}</select></label>
      <div class="chips" id="f-tipos"><button type="button" class="chip" data-tipo="" aria-pressed="true">Todos</button>${tiposUsados.map((t) => `<button type="button" class="chip" data-tipo="${t}" aria-pressed="false">${esc(tipos[t])}</button>`).join("")}</div>
      <button type="button" class="chip chip--sh" id="f-shuffle" aria-label="Misturar a ordem e o tamanho das fotos">Misturar</button>
    </div>
    <p class="count" id="f-count" role="status" aria-live="polite">${obras.length} obras</p>
    <div class="ogrid" id="ogrid">
      ${obras.map((o, i) => cardObra(o, "", MOSAICO[i % MOSAICO.length])).join("\n      ")}
    </div>
    <p class="empty" id="f-vazio" hidden>Nenhuma obra com esses filtros.</p>
    <p class="note">As fotos marcadas como "Foto ilustrativa" são provisórias e serão trocadas por fotos reais das obras.</p>
  </div>
</section>

<section class="sec" id="sobre">
  <div class="wrap sobre">
    <div class="sobre__txt">
      <h2 class="h2">Sobre a PVW</h2>
      ${c.intro.map((p) => `<p>${esc(p)}</p>`).join("")}
    </div>
    <figure class="frame"><img src="img/obras/sobre.webp" width="720" height="900" loading="lazy" decoding="async" alt="Muro de divisa pronto, com luminárias e plantas: obra real da PVW"></figure>
  </div>
</section>

<section class="split" id="processo">
  <div class="split__img"><img src="img/obras/processo.webp" width="720" height="1280" loading="lazy" decoding="async" alt="Obra da PVW em andamento"></div>
  <div class="split__panel">
    <div class="split__in">
      <h2 class="h2">Reformar nunca foi tão fácil</h2>
      <ol class="steps2">
        ${c.processo.map((p, i) => `<li><span class="steps2__n">0${i + 1}</span><div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div></li>`).join("\n        ")}
      </ol>
    </div>
  </div>
</section>

<section class="xband" aria-label="Nossa expertise">
  <div class="wrap">
    <h3 class="xband__t">Nossa expertise inclui:</h3>
    <ul class="xband__l">
      ${c.expertise.map((e, i) => `<li>${[ICONS.alvenaria, ICONS.acabamento, ICONS.carpintaria][i % 3]}<p>${esc(e)}</p></li>`).join("\n      ")}
    </ul>
  </div>
</section>

<section class="sec sec--ice" id="servicos">
  <div class="wrap">
    <h2 class="h2">Nossos Serviços: Soluções Completas e de Alta Qualidade</h2>
    <div class="svc">
      ${c.servicos.map((s) => `<article class="svc__c"><img src="img/svc-${s.foto}.webp" width="600" height="500" loading="lazy" decoding="async" alt=""><span class="svc__i">${ICONS[s.icone]}</span><div class="svc__o"><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></article>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap band__in"><h2>${esc(c.ctaFinal.titulo)}</h2>${waLink("btn--cta btn--lg", "Solicite um orçamento")}</div>
</section>

<section class="sec sec--dark" id="antes-depois">
  <div class="wrap">
    <div class="hs__head">
      <h2 class="h2">Antes e <em>depois</em></h2>
      <div class="hs__ctl">
        <button type="button" class="hs__btn hs__btn--prev" data-dir="-1" aria-label="Fotos anteriores">${ICONS.arrow}</button>
        <button type="button" class="hs__btn" data-dir="1" aria-label="Próximas fotos">${ICONS.arrow}</button>
      </div>
    </div>
    <div class="hscroll bagrid" tabindex="0" role="region" aria-label="Fotos de antes e depois (role para o lado)">
      ${Array.from({ length: 9 }, (_, i) => `<figure class="bac"><span class="bac__n">${String(i + 1).padStart(2, "0")}</span>${pic(`img/antes-depois-${i + 1}.webp`, `Obra executada pela PVW: foto do antes e do depois (${i + 1})`, 640, 968)}</figure>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="vband" id="video">
  <img class="vband__bg" src="img/video-poster.webp" width="1280" height="620" loading="lazy" decoding="async" alt="">
  <video id="vid-main" preload="none" playsinline aria-label="Vídeo PVW Reformas em ação"><source src="video/video-pvw.mp4" type="video/mp4">Seu navegador não reproduz vídeo.</video>
  <div class="vband__in">
    <button type="button" class="vband__play" id="vid-play" aria-label="Reproduzir vídeo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>
    <h2 class="h2">Vídeo PVW Reformas em <em>ação</em></h2>
    ${waLink("btn--cta btn--lg", "Solicite um orçamento")}
  </div>
</section>

<section class="sec sec--tq" id="depoimentos">
  <div class="wrap">
    <div class="tq" id="tq">
      <figure class="tq__photo"><img id="tq-photo" src="img/dep-${c.depoimentos[0].foto}-lg.webp" width="378" height="378" alt="Foto de ${esc(c.depoimentos[0].nome)}"></figure>
      <div class="tq__panel">
        <h2 class="tq__t">Quem já contratou a PVW</h2>
        <div class="tq__track" id="tq-track" tabindex="0" role="region" aria-label="Depoimentos de clientes">
          ${c.depoimentos.map((d) => `<div class="tq__slide" data-foto="img/dep-${d.foto}-lg.webp" data-nome="${esc(d.nome)}"><span class="tq__q"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h4l2-4V7H5v6h3zm9 0h4l2-4V7h-6v6h3z"/></svg></span><blockquote><p>${esc(d.texto)}</p></blockquote><p class="tq__who"><b>${esc(d.nome)}</b><span>${esc(d.profissao)}</span>${d.obra ? `<em>${esc(d.obra)}</em>` : ""}</p></div>`).join("\n          ")}
        </div>
      </div>
      <div class="tq__ctl">
        <button type="button" class="tq__btn tq__btn--prev" data-dir="-1" aria-label="Depoimento anterior">${ICONS.arrow}</button>
        <button type="button" class="tq__btn" data-dir="1" aria-label="Próximo depoimento">${ICONS.arrow}</button>
      </div>
    </div>
    ${sociais()}
  </div>
</section>

<section class="sec sec--tight" id="parceiros" aria-label="Parceiros">
  <div class="wrap">
    <h2 class="eyebrow eyebrow--c">Parceiros PVW</h2>
    <ul class="logos">${c.parceiros.map((p) => `<li><img src="img/parceiro-${p.arquivo}.webp" width="${p.w}" height="${p.h}" loading="lazy" alt="${esc(p.nome)}"></li>`).join("")}</ul>
  </div>
</section>

<section class="sec sec--ice" id="faq">
  <div class="wrap wrap--s">
    <h2 class="h2">Dúvidas frequentes</h2>
    <div class="faq">
      ${c.faq.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}${ICONS.chev}</summary><p>${esc(f.a)}</p></details>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="sec contato" id="contato">
  <div class="wrap">
    <h2 class="h2">Solicite um Orçamento!</h2>
    <p class="lede">${esc(c.ctaFinal.texto)}</p>
    ${waLink("btn--cta btn--lg", "Solicite um orçamento")}
    <ul class="cl">
      <li>${ICONS.phone}<a href="tel:${site.telefone}">${esc(site.whatsappTexto)}</a></li>
      <li>${ICONS.mail}<a href="mailto:${site.email}">${esc(site.email)}</a></li>
      <li>${ICONS.insta}<a href="${site.instagramUrl}" target="_blank" rel="noopener">${esc(site.instagramUsuario)}</a></li>
      ${site.horario ? `<li>${esc(site.horario)}</li>` : ""}
    </ul>
  </div>
</section>
</main>`);
  out.push(footer());
  fs.writeFileSync(path.join(ROOT, "index.html"), out.join("\n"));
}

/* ---------- PÁGINA DE OBRA ---------- */
function paginaObra(o, i) {
  R = "../../";
  const c = conteudo;
  const url = `${site.dominio}/obras/${o.slug}`;
  const meta = [o.bairro || "Bairro a informar", o.tipos.map(labelTipo).join(", ")].join(" · ");
  const first = o.descricao[0] || "Obra da PVW Construção e Reformas no Rio de Janeiro.";
  const desc = first.length > 155 ? first.slice(0, 152).replace(/\s+\S*$/, "") + "..." : first;
  const title = `${o.titulo} | ${site.nome}`;
  const ph = (txt) => `<div class="ph"><span>${txt}</span><small>Placeholder</small></div>`;
  const galeria = o.galeria.length ? o.galeria.map((g) => `<figure>${pic(g, o.titulo, 800, 600)}</figure>`).join("") : [1, 2, 3].map(() => ph("Foto a inserir")).join("");
  const antesDepois = `<div class="ba2">${ph("Foto do antes: a inserir")}${ph("Foto do depois: a inserir")}</div>`;
  const videos = o.videos.length ? `<h2 class="h2 h2--s">Etapas da obra</h2><div class="vids">${o.videos.map((v) => `<figure><video controls preload="none" poster="${R}${v.poster}" playsinline><source src="${R}${v.src}" type="video/mp4"></video><figcaption>${esc(v.legenda)}</figcaption></figure>`).join("")}</div>` : "";
  const outras = obras.filter((x) => x.slug !== o.slug).slice(0, 3);
  const status = o.status === "real" ? '<span class="tag tag--real tag--inline">Obra real</span>' : '<span class="tag tag--ph tag--inline">Foto e dados ilustrativos</span>';
  const html = [];
  html.push(head({
    title, desc, canonical: url, image: `${site.dominio}/img/obras/${o.imagem}-card.webp`,
    jsonld: [crumbs([["Início", site.dominio + "/"], ["Obras", site.dominio + "/#obras"], [o.titulo, url]])],
  }));
  html.push(`<body class="obra" data-obra="${o.slug}">`);
  html.push(header(false));
  html.push(`<main id="conteudo">
<section class="ohero">
  <div class="wrap">
    <nav class="bc" aria-label="Você está em"><a href="${R}index.html">Início</a><span>/</span><a href="${R}index.html#obras">Obras</a><span>/</span><span aria-current="page">${esc(o.titulo)}</span></nav>
    <p class="oc__m">${esc(meta)}</p>
    <h1>${esc(o.titulo)}</h1>
    ${status}
  </div>
  <div class="wrap ohero__img">${pic(exists(`img/obras/${o.imagem}-lg.webp`) ? `img/obras/${o.imagem}-lg.webp` : `img/obras/${o.imagem}-card.webp`, o.titulo, 1280, 800, "", "eager")}</div>
</section>

<section class="sec">
  <div class="wrap odet">
    <div class="odet__txt">
      <h2 class="h2 h2--s">Sobre a obra</h2>
      ${o.subtitulo ? `<h3 class="osub">${esc(o.subtitulo)}</h3>` : ""}
      ${o.descricao.length ? o.descricao.map((p) => `<p>${esc(p)}</p>`).join("") : `<p class="ph-txt">[Descrição da obra a informar]</p>`}
    </div>
    <aside class="odet__box" aria-label="Dados da obra">
      <dl>
        <dt>Bairro</dt><dd class="${o.bairro ? "" : "ph-txt"}">${esc(o.bairro || "[a informar]")}</dd>
        <dt>Tipo de obra</dt><dd>${esc(o.tipos.map(labelTipo).join(", "))}</dd>
        <dt>Escopo executado</dt><dd class="${o.escopo ? "" : "ph-txt"}">${esc(o.escopo || "[a informar]")}</dd>
        <dt>Prazo</dt><dd class="${o.prazo ? "" : "ph-txt"}">${esc(o.prazo || "[a informar]")}</dd>
      </dl>
      ${waLink("btn--cta btn--block", "Solicite um orçamento")}
    </aside>
  </div>
</section>

<section class="sec sec--ice">
  <div class="wrap">
    ${videos}
    <h2 class="h2 h2--s">Galeria</h2>
    <div class="gal">${galeria}</div>
    <h2 class="h2 h2--s h2--mt">Antes e depois</h2>
    ${antesDepois}
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <h2 class="h2 h2--s">Outras obras</h2>
    <div class="ogrid ogrid--plain">${outras.map((x) => cardObra(x, R)).join("\n")}</div>
    <p class="center"><a class="btn btn--ghost-d" href="${R}index.html#obras">Ver todas as obras</a></p>
  </div>
</section>
</main>`);
  html.push(footer());
  const dir = path.join(ROOT, "obras", o.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html.join("\n"));
}

/* ---------- sitemap ---------- */
function sitemap() {
  const d = new Date().toISOString().slice(0, 10);
  const urls = [site.dominio + "/", ...obras.map((o) => `${site.dominio}/obras/${o.slug}`)];
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join("\n")}\n</urlset>\n`);
}

// limpa páginas de obras antigas e gera de novo
fs.rmSync(path.join(ROOT, "obras"), { recursive: true, force: true });
home();
obras.forEach(paginaObra);
sitemap();
console.log(`Site gerado: index.html + ${obras.length} páginas de obra + sitemap.xml`);
