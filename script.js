// Mistérios S/IA — funções demonstrativas para o protótipo.
const analyzerForm = document.getElementById("analyzerForm");
const inputText = document.getElementById("inputText");
const resultBox = document.getElementById("resultBox");
const riskBadge = document.getElementById("riskBadge");
const progressBar = document.getElementById("progressBar");
const detectedPatterns = document.getElementById("detectedPatterns");
const adviceBox = document.getElementById("adviceBox");

const suspiciousPatterns = [
  { regex: /\b(urgente|agora mesmo|imediatamente|última chance)\b/i, label: "Linguagem de urgência." },
  { regex: /\b(compartilhe|repasse|envie para todos|mande para todo mundo)\b/i, label: "Pedido para compartilhar rapidamente." },
  { regex: /\b(antes que apaguem|a mídia esconde|estão escondendo|não querem que você saiba)\b/i, label: "Afirmação de conspiração sem contexto." },
  { regex: /\b(100% comprovado|cura milagrosa|garantido|segredo revelado)\b/i, label: "Promessa absoluta ou sensacionalista." },
  { regex: /!{2,}|\?{2,}/, label: "Pontuação exagerada para chamar atenção." },
  { regex: /\b(segundo especialistas|médicos alertam|cientistas dizem)\b/i, label: "Fonte vaga que precisa ser identificada." }
];

analyzerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = inputText.value.trim();
  if (!text) return;

  const found = suspiciousPatterns.filter(item => item.regex.test(text));
  const score = Math.min(100, found.length * 18 + (text.length < 60 ? 8 : 0));
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

  if (found.length) {
    found.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.label;
      detectedPatterns.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Nenhum dos padrões configurados foi encontrado. Isso não comprova que o texto seja verdadeiro.";
    detectedPatterns.appendChild(li);
  }
  adviceBox.textContent = "Conselho da Velma: este analisador procura apenas alguns padrões de texto. Verifique data, autoria, fonte original e confirmação em outras fontes confiáveis.";
});

document.getElementById("clearAnalyzer").addEventListener("click", () => {
  inputText.value = "";
  resultBox.hidden = true;
  inputText.focus();
});

// Mural de relatos: os dados existem apenas na memória desta página.
// Recarregar/fechar a página apaga os relatos adicionados durante a sessão.
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
