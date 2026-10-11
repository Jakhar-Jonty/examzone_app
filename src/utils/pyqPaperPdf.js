function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getOptionLabel(option, index) {
  if (typeof option === 'string') return String.fromCharCode(65 + index);
  return option.optionLabel || option.option || String.fromCharCode(65 + index);
}

function getOptionText(option) {
  if (typeof option === 'string') return option;
  return option.optionText || option.text || '';
}

export function buildPyqPaperHtml({ title, questions = [] }) {
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const count = questions.length;

  let body = `
    <html><head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #000; padding: 24px;">
      <h1 style="font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 6px;">
        ${escapeHtml(title || 'PYQ Paper')}
      </h1>
      <p style="text-align: center; color: #555; margin-bottom: 8px; font-size: 13px;">
        Previous Year Questions — Answer Key
      </p>
      <p style="text-align: center; color: #777; margin-bottom: 24px; font-size: 12px;">
        ${dateStr} · ${count} question${count === 1 ? '' : 's'}
      </p>
  `;

  questions.forEach((q, index) => {
    if (!q) return;
    const text = escapeHtml(q.questionText);
    const options = q.options || [];
    const correct = q.correctAnswer;
    const explanation = q.explanation;
    const meta = [q.subject, q.topic].filter(Boolean).join(' · ');

    body += `
      <div style="margin-bottom: 24px; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 14px;">
        <p style="font-size: 11px; color: #888; margin: 0 0 6px;">Q${index + 1}${meta ? ` · ${escapeHtml(meta)}` : ''}</p>
        <p style="font-size: 14px; font-weight: 600; margin: 0 0 10px; line-height: 1.5;">${text}</p>
        <ul style="margin: 0 0 10px; padding-left: 18px;">
    `;

    options.forEach((opt, i) => {
      const label = getOptionLabel(opt, i);
      const optText = escapeHtml(getOptionText(opt));
      const isCorrect = label === correct;
      body += `<li style="margin-bottom: 4px; ${isCorrect ? 'font-weight: 700; color: #15803d;' : ''}">${label}. ${optText}</li>`;
    });

    body += '</ul>';
    body += `<p style="margin: 0 0 6px;"><strong>Correct answer:</strong> ${escapeHtml(correct)}</p>`;

    if (explanation) {
      body += `<p style="margin: 0; font-size: 13px; color: #333; line-height: 1.5;"><strong>Explanation:</strong> ${escapeHtml(explanation)}</p>`;
    }

    body += '</div>';
  });

  body += '</body></html>';
  return body;
}

export function pyqPdfFileName(label) {
  const safe = String(label || 'PYQ')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  return `${safe}_Answer_Key_${new Date().toISOString().slice(0, 10)}.pdf`;
}
