# Site PVW, layout v2 (HTML estático para a Vercel)

O layout anterior (cópia do site do WordPress) está salvo em `backup/site-v1/`. As imagens que o v2 deixou de usar estão em `backup/img-nao-usadas/`.

## Ver no computador

Dê dois cliques em `index.html`.

## Cadastrar uma obra nova (sem mexer no layout)

1. Edite `data/obras.json` e copie um bloco de obra existente. Campos: `slug`, `titulo`, `bairro`, `tipos`, `status` (`real` ou `placeholder`), `imagem`, `descricao`, `escopo`, `prazo`, `videos`, `galeria`.
2. Ponha a foto em `img/obras/<imagem>-card.webp` (720 x 450) e, se quiser, `<imagem>-lg.webp`.
3. Rode `node scripts/build.js`. Ele gera `index.html`, uma página por obra em `obras/<slug>/` e o `sitemap.xml`.

As obras aparecem em **mosaico** (fotos de tamanhos diferentes). Ao filtrar por bairro ou tipo, ou ao clicar em "Misturar", as fotos trocam de lugar e de tamanho com animação. Os filtros de bairro e de tipo se montam sozinhos a partir do JSON. Tipos disponíveis: reforma completa, gesso e drywall, elétrica, pintura, galpão, área gourmet, estrutura e muros.

Textos do site, depoimentos, FAQ, serviços e parceiros ficam em `data/conteudo.json`. Telefone, e-mail, links e números ficam em `data/site.json` (o link do Google Meu Negócio, CNPJ, endereço, registro profissional e horário só aparecem no site quando você preencher).

## Marcado como placeholder (a trocar)

- Fotos das obras com a etiqueta "Foto ilustrativa" (todas, menos o muro de divisa, que é obra real em vídeo).
- Escopo e prazo de cada obra: "[a informar]".
- A foto do hero (print enviado pelo dono, de baixa resolução).

## Cores

Preto e azul. O laranja ficou guardado: para usar nos botões, troque as 3 variáveis `--cta` no topo de `css/style.css` (há um comentário com os valores).

## Rastreio (não foi alterado)

- GTM `GTM-N2ZLJRGK` (conversão do Google Ads e GA4) no `<head>`.
- Todo botão de WhatsApp usa o URL exato `https://wa.me/+5521968524550`. Não coloque `?text=` nele.
- Consentimento negado até o visitante aceitar. O Meta Pixel `567760389126157` só carrega depois do "Aceitar".
- Eventos novos no `dataLayer`: `obra_view` e `filtro_portfolio` (a tag no GTM precisa ser criada por você).

## Desempenho (Lighthouse mobile, medido no computador local)

- Acessibilidade 100, boas práticas 100, SEO 100.
- Desempenho 93 sem o GTM e 84 com o GTM. A diferença vem inteira dos scripts do Google (tempo bloqueado de ~400 ms), não do código do site.

## Publicar na Vercel

O `.vercelignore` publica só os arquivos do site (inclui `obras/`). Nada foi enviado ainda.
Repositório do GitHub clonado (vazio) em `C:\Projetos\pvw-github`.
Antes de apontar o domínio: teste a conversão no modo de visualização do GTM e confirme com o responsável técnico (CREA) o uso do vídeo do muro.
