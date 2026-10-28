const analyzerForm = document.getElementById("analyzerForm");
const inputText = document.getElementById("inputText");
const resultBox = document.getElementById("resultBox");
const riskBadge = document.getElementById("riskBadge");
const progressBar = document.getElementById("progressBar");
const detectedPatterns = document.getElementById("detectedPatterns");
const adviceBox = document.getElementById("adviceBox");
const analyzeButton = analyzerForm.querySelector('button[type="submit"]');
const analyzeButtonHTML = analyzeButton.innerHTML;

/* ---------- Padrões de texto ---------- */

const suspiciousPatterns = [
  { regex: /\b(urgente|agora mesmo|imediatamente|última chance)\b/i, label: "Linguagem de urgência." },
  { regex: /\b(compartilhe|repasse|envie para todos|mande para todo mundo)\b/i, label: "Pedido para compartilhar rapidamente." },
  { regex: /\b(antes que apaguem|a mídia esconde|estão escondendo|não querem que você saiba)\b/i, label: "Afirmação de conspiração sem contexto." },
  { regex: /\b(100% comprovado|cura milagrosa|garantido|segredo revelado)\b/i, label: "Promessa absoluta ou sensacionalista." },
  { regex: /!{2,}|\?{2,}/, label: "Pontuação exagerada para chamar atenção." },
  { regex: /\b(segundo especialistas|médicos alertam|cientistas dizem)\b/i, label: "Fonte vaga que precisa ser identificada." }
];

/* ---------- Pistas sobre o link ---------- */

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "wa.me"];
const SUSPICIOUS_TLDS = [".xyz", ".top", ".click", ".icu", ".buzz", ".tk", ".gq", ".ml", ".cf", ".work", ".rest", ".monster"];

function parseUrl(value) {
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return null;
    // Se o usuário não digitou o protocolo, não sabemos se era http; tratamos como https.
    url.__typedProtocol = /^https?:\/\//i.test(trimmed);
    return url;
  } catch {
    return null;
  }
}

function analyzeUrl(url) {
  const flags = [];
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (SHORTENERS.some(s => host === s)) {
    flags.push("Link encurtado: esconde o endereço de destino.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    flags.push("Endereço feito só de números (IP) em vez de um nome de site.");
  }
  if (SUSPICIOUS_TLDS.some(t => host.endsWith(t))) {
    flags.push("Terminação de domínio frequentemente usada em sites descartáveis.");
  }
  if (url.__typedProtocol && url.protocol === "http:") {
    flags.push("O link não usa conexão segura (HTTPS).");
  }
  if ((host.match(/-/g) || []).length >= 3 || host.length > 40) {
    flags.push("Endereço muito longo ou com muitos hífens, comum em sites que imitam outros.");
  }
  if (url.username || url.href.includes("@")) {
    flags.push("O link contém “@”, truque usado para disfarçar o destino real.");
  }
  return flags;
}

/* ---------- Busca do conteúdo do link ---------- */
/* Navegadores bloqueiam a leitura direta de outros sites (CORS), então usamos
   serviços públicos que devolvem o texto da página. O link é enviado a eles. */

const MAX_CHARS = 20000;

async function fetchWithTimeout(resource, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(resource, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, nav, footer, header, aside, form, iframe").forEach(el => el.remove());
  const title = (doc.querySelector("title")?.textContent || "").trim();
  const main = doc.querySelector("article") || doc.querySelector("main") || doc.body;
  const body = (main?.textContent || "").replace(/\s+/g, " ").trim();
  return { title, text: body };
}

async function fetchPageContent(url) {
  // 1) Leitor de páginas (devolve texto limpo)
  try {
    const raw = await fetchWithTimeout(`https://r.jina.ai/${url.href}`);
    const titleMatch = raw.match(/^Title:\s*(.+)$/m);
    const contentIndex = raw.indexOf("Markdown Content:");
    const text = (contentIndex >= 0 ? raw.slice(contentIndex + "Markdown Content:".length) : raw)
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 80) {
      return { title: titleMatch ? titleMatch[1].trim() : "", text: text.slice(0, MAX_CHARS) };
    }
  } catch (_) { /* tenta o próximo */ }

  // 2) Proxy que devolve o HTML bruto
  try {
    const html = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url.href)}`);
    const { title, text } = htmlToText(html);
    if (text.length > 80) {
      return { title, text: text.slice(0, MAX_CHARS) };
    }
  } catch (_) { /* sem conteúdo */ }

  return null;
}

/* ---------- Exibição do resultado ---------- */

function showResult(found, { notes = [], shortTextBonus = false } = {}) {
  const score = Math.min(100, found.length * 18 + (shortTextBonus ? 8 : 0));
  resultBox.hidden = false;
  riskBadge.className = "badge";
  if (score >= 55) {
    riskBadge.classList.add("bg-danger");
    riskBadge.textContent = "Atenção: várias pistas";
  } else if (score >= 25) {
    riskBadge.classList.add("bg-warning", "text-dark");
    riskBadge.textContent = "Investigue melhor";
  } else {
    riskBadge.classList.add("bg-success");
    riskBadge.textContent = "Poucas pistas detectadas";
  }
  progressBar.style.width = `${score}%`;
  progressBar.setAttribute("aria-valuenow", String(score));
  progressBar.setAttribute("aria-valuemin", "0");
  progressBar.setAttribute("aria-valuemax", "100");
  detectedPatterns.replaceChildren();

  const addItem = (text, muted = false) => {
    const li = document.createElement("li");
    li.textContent = text;
    if (muted) li.classList.add("text-secondary");
    detectedPatterns.appendChild(li);
  };

  notes.forEach(note => addItem(note, true));

  if (found.length) {
    found.forEach(label => addItem(label));
  } else {
    addItem("Nenhum dos padrões configurados foi encontrado. Isso não comprova que o conteúdo seja verdadeiro.");
  }

  adviceBox.textContent = "Conselho da Velma: este analisador procura apenas alguns padrões de texto e de link. Verifique data, autoria, fonte original e confirmação em outras fontes confiáveis.";
}

function setLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  inputText.disabled = isLoading;
  analyzeButton.innerHTML = isLoading
    ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Investigando link...'
    : analyzeButtonHTML;
}

/* ---------- Envio do formulário ---------- */

analyzerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = inputText.value.trim();
  if (!value) return;

  const url = parseUrl(value);

  // Modo texto (comportamento original)
  if (!url) {
    const found = suspiciousPatterns.filter(item => item.regex.test(value)).map(item => item.label);
    showResult(found, { shortTextBonus: value.length < 60 });
    return;
  }

  // Modo link
  setLoading(true);
  try {
    const found = analyzeUrl(url);
    const notes = [`Link analisado: ${url.hostname.replace(/^www\./, "")}`];

    const page = await fetchPageContent(url);
    if (page) {
      if (page.title) notes.push(`Título encontrado: ${page.title.slice(0, 140)}`);
      const content = `${page.title} ${page.text}`;
      suspiciousPatterns
        .filter(item => item.regex.test(content))
        .forEach(item => found.push(item.label));
    } else {
      notes.push("Não foi possível ler o conteúdo desta página (pode exigir login, bloquear leitura automática ou estar fora do ar). A análise considerou apenas o endereço. Se puder, cole o texto da notícia no campo.");
    }

    showResult(found, { notes });
  } finally {
    setLoading(false);
  }
});

document.getElementById("clearAnalyzer").addEventListener("click", () => {
  inputText.value = "";
  resultBox.hidden = true;
  inputText.focus();
});


/* ---------- Mural de relatos ---------- */

const reportsList = document.getElementById("reportsList");
const reportForm = document.getElementById("reportForm");
const reportName = document.getElementById("reportName");
const reportCategory = document.getElementById("reportCategory");
const reportText = document.getElementById("reportText");
const reportCount = document.getElementById("reportCount");
const charCount = document.getElementById("charCount");
const clearReportsButton = document.getElementById("clearReports");

const demoReports = [
  {
    name: "Equipe Mistérios S/IA",
    category: "Notícia suspeita",
    text: "EXEMPLO FICTÍCIO: recebi uma mensagem dizendo que uma escola seria fechada amanhã, mas ela não traz link nem comunicado oficial. Como posso verificar?",
    demo: true,
    time: "Exemplo"
  },
  {
    name: "Detetive Velma (exemplo)",
    category: "Possível deepfake",
    text: "EXEMPLO FICTÍCIO: um vídeo parece mostrar uma pessoa famosa anunciando algo estranho. A voz soa diferente e não encontrei o vídeo em canais oficiais.",
    demo: true,
    time: "Exemplo"
  },
  {
    name: "Salsicha e Scooby (exemplo)",
    category: "Golpe ou corrente",
    text: "EXEMPLO FICTÍCIO: uma corrente promete um prêmio se eu encaminhar a mensagem para dez pessoas. Não informa a organização responsável nem regras verificáveis.",
    demo: true,
    time: "Exemplo"
  },
  {
    name: "Daphne (exemplo)",
    category: "Outro mistério digital",
    text: "EXEMPLO FICTÍCIO: uma imagem antiga está circulando como se fosse de um acontecimento de hoje. Vale procurar a imagem original e conferir a data.",
    demo: true,
    time: "Exemplo"
  }
];

const sessionReports = [];

function renderReports() {
  reportsList.replaceChildren();
  const allReports = [...sessionReports, ...demoReports];
  reportCount.textContent = `${sessionReports.length} relato${sessionReports.length === 1 ? "" : "s"} da sessão`;

  if (!allReports.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhum relato por enquanto. O mistério aguarda a primeira pista!";
    reportsList.appendChild(empty);
    return;
  }

  allReports.forEach(report => {
    const card = document.createElement("article");
    card.className = "report-card";

    const meta = document.createElement("div");
    meta.className = "report-meta";

    const badge = document.createElement("span");
    badge.className = report.demo ? "demo-label" : "session-label";
    badge.textContent = report.demo ? "EXEMPLO FICTÍCIO" : "RELATO DESTA SESSÃO";

    const category = document.createElement("span");
    category.textContent = report.category;

    const time = document.createElement("span");
    time.textContent = report.time;

    meta.append(badge, category, time);

    const title = document.createElement("h4");
    title.textContent = report.name || "Detetive anônimo";

    const body = document.createElement("p");
    body.className = "report-body";
    body.textContent = report.text;

    card.append(meta, title, body);
    reportsList.appendChild(card);
  });
}

reportText.addEventListener("input", () => {
  charCount.textContent = String(reportText.value.length);
});

reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = reportText.value.trim();
  if (!text) {
    reportText.focus();
    return;
  }

  sessionReports.unshift({
    name: reportName.value.trim() || "Detetive anônimo",
    category: reportCategory.value,
    text,
    demo: false,
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  });

  renderReports();
  reportForm.reset();
  charCount.textContent = "0";
});

clearReportsButton.addEventListener("click", () => {
  sessionReports.length = 0;
  renderReports();
});

renderReports();