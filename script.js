/* =========================================================
   CPPEM · OPERAÇÃO ALVORADA (11ª edição) — script

   O bloco de tracking segue a referência de TRACKING.md (mesma doc usada no
   PMPE, com a §14 adaptada a este site). Nomenclatura, barreiras e ordem de
   listeners NÃO são estilo pessoal — são o vínculo da conversão. Antes de
   mexer, leia §6.0 e §7.8, e rode `node validar-tracking.js .`
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     CONFIG — os únicos valores específicos deste site (§8.1)

     Ao replicar em outro site, TODO item daqui precisa ser trocado. Nenhum
     sobrevive ao copiar/colar, e esquecer o `formId` é a causa nº 1 da Falha A.

     O que NÃO entra aqui de propósito: os ids dos campos e do botão. Eles são
     canônicos (§6.0) — `lead_name`, `lead_email`, `lead_phone`, `lead_submit`
     são iguais em todas as landings e ficam como literais no código para o
     validador conseguir conferi-los contra o HTML.
     ========================================================= */
  var CONFIG = {
    /* id opaco do <form> no painel da PixelX. Vive em DOIS lugares: aqui e no
       index.html. Trocar só um deixa `form === null`, a barreira nunca casa
       (`e.target !== form` sempre verdadeiro) e a página recarrega com os
       dados na URL. */
    formId: "IPEyzyfmJhKQEYIXAlZH",

    /* Planilha Always On (backend único de captura, Google Apps Script).
       LIGADO desde que a página virou lista de espera: agora o lead é o
       produto, e ele tem que cair onde a equipe trabalha os leads.

       O `?aba=OPERACAO` é o rótulo de origem desta landing no Apps Script
       (ORIGENS.OPERACAO), e é ele que manda a linha para a aba `Venda_Direta`
       — o mesmo destino que os leads desta página já tinham. Mudar de aba não
       se faz aqui: é no ABA_POR_ORIGEM do google-apps-script.js, que depois
       precisa ser republicado como nova versão da implantação.

       O loop de envio pula endpoint vazio (`if (!url) return;`), então
       esvaziar esta string desliga o envio sem quebrar nada. */
    sheetEndpoint: "https://script.google.com/macros/s/AKfycbxdFplWVSfhTjvyIA7HIWb645xRjGNhBVhTdTf5UMjo0lSpW_A_jCuys0qB4uImKXPQ/exec?aba=OPERACAO",
    sheetTab: "OPERACAO",

    /* Segundo destino DESLIGADO: o webhook do n8n grava na planilha
       "Operação Alvorada 11ª Edição — Leads", que é a lista de COMPRADORES da
       11ª edição. Misturar lista de espera com quem já comprou estragaria as
       duas. Para religar, devolva a URL:
       https://webhook.cppem.com.br/webhook/alvorada-lead */
    sheetEndpointExtra: "",

    pagina: "Operação Alvorada",

    /* Não há mais produto nem checkout: esta página capta para a lista de
       espera da próxima edição. O texto abaixo é o que vai para a coluna
       "produto" da planilha, e é o que diferencia estes leads dos leads de
       venda que esta mesma origem já gravou. */
    produtoPadrao: "Lista de espera — próxima Operação Alvorada",

    redirectDelay: 1500,     // §7.6 — abaixo de ~1s começa a perder eventos
    phoneMode: "celular_br"  // §8.6 — "celular_br" | "celular_ou_fixo_br" | "internacional"
  };

  /* =========================================================
     Emissor de Lead — Modelo A (§5): quem dispara é o PAINEL

     REGRA DE OURO: deve existir EXATAMENTE UM emissor de Lead.

     LEAD_MODE = "painel" → Modelo A. A regra de conversão do painel da PixelX
       dispara no evento `submit`, vinculada ao id opaco do <form>. É por isso
       que a barreira abaixo PROPAGA quando os dados são válidos: cortar a
       propagação ali zeraria a conversão.

       Consequência obrigatória (§11-D): o site não pode ter nenhum emissor
       próprio. Nada de `fbq`, nada de push de Lead no dataLayer, nada de
       chamada manual à PixelX. O validador falha se aparecer qualquer um.

     LEAD_MODE = "site" → Modelo B, usado no PMPE. NÃO ligar aqui sem antes
       desligar a regra do painel: os dois ativos ao mesmo tempo é a Falha B.
       O caminho de migração está no template portável da §9.

     POR QUE O MODELO B FOI REMOVIDO DESTE SITE

     Antes o site chamava a PixelX diretamente. Uma chamada manual é
     NÃO-ROTEADA: não passa por regra de conversão nenhuma, então a PixelX a
     entrega pelo padrão da conta — que aqui era TODOS os destinos. Era isso
     que fazia o Lead aparecer nas três tags Meta.

     O mesmo mecanismo explica o sintoma oposto visto no PMPE (§8.7), onde a
     chamada manual não chegava a NENHUMA tag. Sem roteamento, o destino é o
     padrão da conta: pode ser tudo ou nada, nunca o destino certo por acaso.

     Quem roteia é a REGRA, e a regra só existe atrelada ao id do <form>.
     ========================================================= */
  var LEAD_MODE = "painel";   // "painel" (Modelo A) | "site" (Modelo B)

  /* ---------- ano ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header sticky + barra de progresso + parallax + dock ---------- */
  var header = document.getElementById("header");
  var progress = document.getElementById("progress");
  var heroBg = document.getElementById("heroBg");
  var dock = document.getElementById("dock");
  var ticking = false;

  function render() {
    var y = window.scrollY;
    header.classList.toggle("is-stuck", y > 40);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    /* A barra fixa do mobile só entra depois da hero — antes disso o próprio
       CTA da dobra já está na tela e ela só atrapalharia. */
    if (dock) dock.classList.toggle("is-on", y > window.innerHeight * 0.85);

    if (!reduced && heroBg && y < window.innerHeight * 1.2) {
      heroBg.style.transform = "translateY(" + (y * 0.16) + "px)";
    }
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  render();

  /* ---------- reveal on scroll (com escalonamento) ---------- */
  /* .ficha__item ficou de fora de propósito: a ficha mora na hero e já entra
     pela animação .anim d5 — dois fade-ins no mesmo bloco brigariam. */
  var targets = document.querySelectorAll(
    ".section__head, .card, .final__inner, .nota, .video__moldura, " +
    ".lista, .faq__item, .depo__item, .galeria figure"
  );
  Array.prototype.forEach.call(targets, function (el) { el.classList.add("reveal"); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (i++ * 80) + "ms";
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px" });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- brilho seguindo o cursor nos cards ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".card"), function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  /* ---------- partículas douradas na hero ---------- */
  var sparks = document.getElementById("sparks");
  if (sparks && !reduced) {
    for (var s = 0; s < 18; s++) {
      var p = document.createElement("i");
      p.className = "spark";
      p.style.left = (Math.random() * 100) + "%";
      p.style.bottom = (Math.random() * 45) + "%";
      p.style.animationDuration = (7 + Math.random() * 8).toFixed(1) + "s";
      p.style.animationDelay = (Math.random() * 9).toFixed(1) + "s";
      p.style.transform = "scale(" + (0.5 + Math.random()).toFixed(2) + ")";
      sparks.appendChild(p);
    }
  }

  /* ---------- vídeo institucional ----------
     O aviso de "em produção" só existe enquanto o iframe estiver sem src. No
     dia em que o embed for colado no index.html, o bloco vazio some sozinho —
     ninguém precisa lembrar de apagar nada. */
  var videoPlayer = document.querySelector(".video__player");
  var videoVazio = document.querySelector(".video__vazio");
  if (videoPlayer && videoVazio && videoPlayer.getAttribute("src")) {
    videoPlayer.hidden = false;
    videoVazio.hidden = true;
  }

  /* =========================================================
     Elementos do formulário (§6.0 — ids canônicos, não trocar)

     Referências explícitas em vez de form.elements[...]: com name="name", o
     acesso nomeado colide com a propriedade nativa HTMLFormElement.name (§7.3).
     ========================================================= */
  var form = document.getElementById(CONFIG.formId);
  var nomeInput = document.getElementById("lead_name");
  var emailInput = document.getElementById("lead_email");
  var telefoneInput = document.getElementById("lead_phone");
  var submitBtn = document.getElementById("lead_submit");
  var btnLabel = submitBtn ? submitBtn.querySelector(".btn__label") : null;
  var spinner = submitBtn ? submitBtn.querySelector(".spinner") : null;

  /* §8.1 / §8.2 — falha barulhenta em vez de silenciosa. Sem isto o sintoma é
     "a página recarrega sozinha" e ninguém liga o defeito ao id do form. */
  if (!form) {
    console.error("[tracking] Formulário \"" + CONFIG.formId + "\" não encontrado. " +
                  "Confira CONFIG.formId e o id no index.html.");
  }
  if (document.querySelectorAll("[id=\"" + CONFIG.formId + "\"]").length > 1) {
    console.error("[tracking] id \"" + CONFIG.formId + "\" duplicado na página.");
  }

  /* =========================================================
     Validação (§7.7)

     NENHUMA formatação sai daqui. O valor do campo de telefone nunca é
     reescrito pelo site: a máscara é responsabilidade da PixelX, aplicada via
     classe `pxa_mask_phone` e configurada em `phone_mask` no painel (§6.1).
     Máscara própria brigaria com a dela e quebraria a captura no blur.
     ========================================================= */
  function setError(key, msg) {
    var input = CAMPOS[key];
    var errorEl = document.querySelector("[data-error-for=\"" + key + "\"]");

    if (input) input.classList.add("is-invalid");
    if (errorEl) errorEl.textContent = msg;
  }

  function clearError(key) {
    var input = CAMPOS[key];
    var errorEl = document.querySelector("[data-error-for=\"" + key + "\"]");

    if (input) input.classList.remove("is-invalid");
    if (errorEl) errorEl.textContent = "";
  }

  var CAMPOS = { name: nomeInput, email: emailInput, phone: telefoneInput };

  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };

  /* §7.7 — conta DÍGITOS, não caracteres, e remove o "+55" da máscara antes de
     contar, pelo "+" literal. A máscara da PixelX escreve "+{55}" como texto
     fixo, e esses dois dígitos mascaram números incompletos:
     "+55 (81) 9996-741" soma 11 dígitos e passaria por um teste ingênuo de
     "11 dígitos". Remover pelos dígitos seria ambíguo — o DDD 55 existe
     (Santa Maria/RS). */
  var isPhone = function (v) {
    var d = String(v || "").trim().replace(/^\+\s*55\s*/, "").replace(/\D/g, "");

    if (CONFIG.phoneMode === "celular_ou_fixo_br") return d.length === 10 || d.length === 11;
    if (CONFIG.phoneMode === "internacional")      return d.length >= 8 && d.length <= 15;

    return d.length === 11 && d[2] === "9";   // celular_br (padrão)
  };

  function validate() {
    var ok = true;

    var nome = nomeInput ? nomeInput.value.trim() : "";
    var email = emailInput ? emailInput.value.trim() : "";
    var tel = telefoneInput ? telefoneInput.value.trim() : "";

    clearError("name");
    clearError("email");
    clearError("phone");

    /* Só exige que exista um nome. NÃO exigir sobrenome: muita gente se
       cadastra como "Mark" ou "Itallo", e a regra anterior (precisar de um
       espaço) barrava essas pessoas no último passo antes do checkout.
       É também a regra do template portável do TRACKING.md §9. */
    if (nome.length < 2) {
      setError("name", "Informe seu nome.");
      ok = false;
    }

    if (!isEmail(email)) {
      setError("email", "Informe um e-mail válido.");
      ok = false;
    }

    if (!isPhone(tel)) {
      setError("phone", "Informe seu WhatsApp com DDD — ex: (81) 90000-0000.");
      ok = false;
    }

    return ok;
  }

  /* Revalida em tempo real só o campo que já está marcado como inválido, para
     não acusar erro em campo que o visitante ainda não terminou de preencher. */
  Object.keys(CAMPOS).forEach(function (k) {
    if (!CAMPOS[k]) return;
    CAMPOS[k].addEventListener("input", function () {
      if (CAMPOS[k].classList.contains("is-invalid")) validate();
    });
  });

  /* Superfície de diagnóstico no console (§10). Não existe emissor de Lead
     aqui: no Modelo A quem emite é a regra do painel.
       cppemTracking.isPhone("...")  -> testa a regra de telefone
       cppemTracking.state()         -> confere se a PixelX carregou e se o id
                                        do painel está no <form> */
  window.cppemTracking = {
    modelo: LEAD_MODE,
    isPhone: isPhone,
    state: function () {
      return {
        modelo: LEAD_MODE === "painel" ? "A (painel)" : "B (site)",
        pixelCarregado: !!window.pixel_x_app,
        formDoPainel: !!document.getElementById(CONFIG.formId)
      };
    }
  };

  /* ---------- envio ---------- */
  function loading(state) {
    if (!submitBtn) return;
    submitBtn.disabled = state;
    if (spinner) spinner.hidden = !state;
    if (btnLabel) btnLabel.textContent = state ? "ENVIANDO..." : "QUERO SER AVISADO";
  }

  /* Estado de sucesso. Esta página não tem checkout: o fim do caminho é a
     confirmação aqui mesmo. */
  var listaOk = document.getElementById("listaOk");

  function mostrarSucesso() {
    if (form) form.hidden = true;
    if (listaOk) {
      listaOk.hidden = false;
      listaOk.setAttribute("tabindex", "-1");
      listaOk.focus();
      listaOk.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  var enviado = false;   // guarda de idempotência (§9)

  function enviar() {
    if (enviado) return;
    enviado = true;

    loading(true);

    /* As CHAVES são as colunas da planilha e continuam em português de
       propósito. Elas não têm relação com a nomenclatura da §6.0, que governa
       os atributos do HTML — trocar uma pela outra quebra ou a planilha ou a
       conversão.

       `telefone` é o nome que o Apps Script lê (`dados.telefone`). Antes daqui
       ia como `whatsapp`, que a planilha simplesmente ignorava.

       Os VALORES vão exatamente como o visitante digitou: normalizar aqui
       faria a planilha divergir do que a PixelX capturou no blur. */
    var payload = {
      aba: CONFIG.sheetTab,
      pagina: CONFIG.pagina,
      produto: CONFIG.produtoPadrao,
      nome: nomeInput.value.trim(),
      email: emailInput.value.trim(),
      telefone: telefoneInput.value.trim(),
      origem: window.location.href,
      data_envio: new Date().toISOString()
    };

    /* JSON com Content-Type text/plain, e NÃO urlencoded: o Apps Script faz
       `JSON.parse(e.postData.contents)`, então um corpo urlencoded estourava no
       parse e caía no catch dele — sem gravar linha nenhuma e sem erro visível
       aqui, porque `no-cors` esconde a resposta. É o mesmo formato que a
       landing do PMPE usa contra este mesmo endpoint. */
    var corpo = JSON.stringify(payload);

    /* Fire-and-forget: com no-cors não dá para ler a resposta, então esperar
       não garante nada — só atrasaria o visitante. */
    [CONFIG.sheetEndpoint, CONFIG.sheetEndpointExtra].forEach(function (url) {
      if (!url) return;
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: corpo
      })["catch"](function (err) {
        console.error("[Form] Falha ao salvar em " + url + " (segue o fluxo):", err);
      });
    });

    /* §7.6 — a mesma espera de sempre, agora antes de TROCAR A TELA em vez de
       navegar: trocar o formulário pela confirmação na hora atropelaria a
       requisição assíncrona da conversão, exatamente como o redirect atropelava.
       Também §7.6: NADA de form.reset() antes daqui — a PixelX lê os campos no
       blur e o reset a faria gravar valores vazios. */
    setTimeout(mostrarSucesso, CONFIG.redirectDelay);
  }

  /* PRIMEIRA BARREIRA — clique do botão, em fase de captura (§7.8).
     Com dados inválidos, o preventDefault cancela a ação padrão do botão e o
     navegador NUNCA chega a gerar o evento "submit" — nem a PixelX nem o GTM
     veem nada. O Enter também passa por aqui, via submissão implícita.

     ⚠ Só dá preventDefault quando INVÁLIDO. Cancelar o clique sempre é o
     defeito da §7.4: mata o submit e com ele a conversão inteira. */
  if (submitBtn) {
    submitBtn.addEventListener("click", function (e) {
      if (!validate()) e.preventDefault();
    }, true);
  }

  /* SEGUNDA BARREIRA — "submit" capturado no DOCUMENT, em fase de captura (§7.8).
     Roda SEMPRE antes de qualquer listener registrado no <form>, inclusive o
     que a PixelX instala de dentro de um start() assíncrono — por ordem de
     registro não haveria garantia nenhuma.

     - Inválido -> stopImmediatePropagation: o evento morre aqui e nenhum Lead
                   é registrado com dado ruim. É stopImmediate, e não stop,
                   porque os listeners do <form> estão adiante no caminho.
     - Válido   -> PROPAGA, e é assim que a regra do painel registra o Lead.
                   Cortar a propagação aqui zeraria a conversão (§8.4).
                   No Modelo B seria o oposto: cortaria aqui e emitiria no site. */
  document.addEventListener("submit", function (e) {
    if (!form || e.target !== form) return;

    e.preventDefault();                   // nunca recarregar a página

    if (!validate()) {
      e.stopImmediatePropagation();
      var bad = form.querySelector(".is-invalid");
      if (bad) bad.focus();
      return;
    }

    enviar();
  }, true);
})();
