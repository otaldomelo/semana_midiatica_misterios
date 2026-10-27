function analisarTexto(event) {
  event.preventDefault();

  const text = document.getElementById('inputText').value;
  if (!text.trim()) return;

  const detectedList = document.getElementById('detectedPatterns');
  detectedList.innerHTML = '';

  let points = 0;
  let patterns = [];

  const upperCount = (text.match(/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars > 0 && (upperCount / totalChars) > 0.25) {
    points += 30;
    patterns.push('Uso elevado de letras maiúsculas (Sensacionalismo/Alarde).');
  }

  if (/!{2,}/.test(text) || /\?{2,}/.test(text)) {
    points += 20;
    patterns.push('Excesso de pontos de exclamação ou interrogação (Gatilho de urgência).');
  }

  const urgentKeywords = ['urgente', 'compartilhe', 'repasse', 'antes que apaguem', 'cuidado', 'alerta', 'segredo', 'provado'];
  const lowerText = text.toLowerCase();
  let foundKeywords = urgentKeywords.filter(word => lowerText.includes(word));
  
  if (foundKeywords.length > 0) {
    points += 30;
    patterns.push(`Termos de apelo emocional detectados: "${foundKeywords.join(', ')}".`);
  }

  if (!/https?:\/\//i.test(text)) {
    points += 20;
    patterns.push('Ausência de hiperlinks ou fontes formais de checagem.');
  }

  const resultBox = document.getElementById('resultBox');
  const riskBadge = document.getElementById('riskBadge');
  const progressBar = document.getElementById('progressBar');

  resultBox.style.display = 'block';
  progressBar.style.width = Math.min(points, 100) + '%';

  if (points <= 30) {
    riskBadge.className = 'badge bg-success';
    riskBadge.innerText = 'Baixo Risco de Desinformação';
    progressBar.className = 'progress-bar bg-success';
  } else if (points <= 60) {
    riskBadge.className = 'badge bg-warning text-dark';
    riskBadge.innerText = 'Suspeita Moderada';
    progressBar.className = 'progress-bar bg-warning';
  } else {
    riskBadge.className = 'badge bg-danger';
    riskBadge.innerText = 'Alto Risco de Fake News';
    progressBar.className = 'progress-bar bg-danger';
  }

  if (patterns.length === 0) {
    detectedList.innerHTML = '<li class="text-success">Nenhum padrão direto de linguagem sensacionalista foi encontrado no texto.</li>';
  } else {
    patterns.forEach(p => {
      const li = document.createElement('li');
      li.className = 'mb-1';
      li.innerHTML = `• ${p}`;
      detectedList.appendChild(li);
    });
  }
}

function limparTexto() {
  document.getElementById('inputText').value = '';
  document.getElementById('resultBox').style.display = 'none';
}