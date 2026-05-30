import type { MobileContent, PdfStyles } from '../types';

/**
 * Default styles for the PDF template — inspired by the agency dossier design
 * seen in ejemplo_como_debe_quedar_la_version_adatada_a_moviles.pdf
 */
export const DEFAULT_PDF_STYLES: PdfStyles = {
  titleColor: '#1a1a2e',
  headingColor: '#0f172a',
  textColor: '#1e293b',
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontSize: 14,
  priceColor: '#2563eb',
  subtitleColor: '#64748b',
  dividerColor: '#e2e8f0',
  cardBackground: '#f8fafc',
};

/**
 * Template HTML/CSS mobile-first para el PDF final.
 * Diseño tipo "dossier de agencia" con secciones iconografiadas,
 * badge de precio, cards de día y jerarquía tipográfica clara.
 *
 * @param content - Datos estructurados del documento
 * @param styles - Opcional. Estilos CSS personalizados (colores, fuente, tamaño)
 */
export function renderMobileTemplate(content: MobileContent, styles?: PdfStyles): string {
  const s = styles ?? DEFAULT_PDF_STYLES;

  // ── Price badge ────────────────────────────────────────────
  const priceBadgeHtml = content.subtitle
    ? `<div class="price-badge">${content.subtitle}</div>`
    : '';

  // ── Days (cards con borde izquierdo de acento) ─────────────
  const daysHtml = content.days.length ? `
    <div class="section">
      <div class="section-header">&#x1F5FA;&#xFE0F; ITINERARIO DE VIAJE</div>
      ${content.days.map(d => `
        <div class="day-card">
          <div class="day-title">${d.emoji} ${d.title}</div>
          <div class="day-summary">${d.summary}</div>
          <ul>${d.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>
      `).join('')}
    </div>
  ` : '';

  // ── Included services ──────────────────────────────────────
  const included = content.services?.filter(sv => sv.category === 'included') ?? [];
  const notIncluded = content.services?.filter(sv => sv.category === 'not_included') ?? [];
  const optional = content.services?.filter(sv => sv.category === 'optional') ?? [];

  const includedHtml = included.length ? `
    <div class="section">
      <div class="section-header">&#x2705; SERVICIOS INCLUIDOS</div>
      ${included.map(sv => sv.items.map(i => `<div class="check-item">&#x2713; ${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  const notIncludedHtml = notIncluded.length ? `
    <div class="section">
      <div class="section-header">&#x274C; NO INCLUIDO</div>
      ${notIncluded.map(sv => sv.items.map(i => `<div class="cross-item">&#x2717; ${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  const optionalHtml = optional.length ? `
    <div class="section">
      <div class="section-header">&#x1F537; OPCIONAL</div>
      ${optional.map(sv => sv.items.map(i => `<div class="opt-item">&#x25C9; ${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  // ── Accommodations ─────────────────────────────────────────
  const accHtml = content.accommodations?.length ? `
    <div class="section">
      <div class="section-header">&#x1F3E8; ALOJAMIENTOS PREVISTOS</div>
      ${content.accommodations.map(a => `
        <div class="acco-card">
          <div class="acco-city">${a.location || a.name}</div>
          <div class="acco-hotel">${a.location ? a.name : ''} ${a.nights ? `· ${a.nights}` : ''}${a.board ? ` (${a.board})` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // ── Notes ──────────────────────────────────────────────────
  const notesHtml = content.notes?.length ? `
    <div class="section">
      <div class="section-header">&#x1F4DD; NOTAS</div>
      ${content.notes.map(n => `<div class="note-item">${n}</div>`).join('')}
    </div>
  ` : '';

  // ── Page number ────────────────────────────────────────────
  const pageNumberHtml = content.pageNumber
    ? `<div class="page-number">${content.pageNumber}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${s.fontFamily};
    font-size: ${s.fontSize}px;
    line-height: 1.5;
    color: ${s.textColor};
    background-color: ${s.backgroundColor};
    padding: 16px 16px 40px;
    max-width: 100%;
  }
  /* ── Header ── */
  .header { text-align: center; margin-bottom: 20px; }
  h1 {
    font-size: 20px;
    font-weight: 800;
    color: ${s.titleColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    line-height: 1.2;
  }
  .price-badge {
    display: inline-block;
    background: ${s.priceColor ?? s.accentColor};
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    padding: 4px 16px;
    border-radius: 20px;
    margin-top: 6px;
    letter-spacing: 0.3px;
  }
  .subtitle-text {
    font-size: 12px;
    color: ${s.subtitleColor ?? s.textColor};
    margin-top: 4px;
  }
  /* ── Section headers ── */
  .section { margin-top: 18px; }
  .section-header {
    font-size: 13px;
    font-weight: 700;
    color: ${s.headingColor};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 2px solid ${s.dividerColor ?? '#e2e8f0'};
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  /* ── Day cards ── */
  .day-card {
    background: ${s.cardBackground ?? '#f8fafc'};
    border-left: 3px solid ${s.accentColor};
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }
  .day-title {
    font-size: 14px;
    font-weight: 700;
    color: ${s.headingColor};
    margin-bottom: 2px;
  }
  .day-summary {
    font-size: 12px;
    color: ${s.textColor};
    opacity: 0.8;
    margin-bottom: 6px;
    line-height: 1.4;
  }
  /* ── Lists ── */
  ul { padding-left: 18px; margin-top: 4px; }
  li {
    font-size: 12px;
    color: ${s.textColor};
    margin-bottom: 2px;
    line-height: 1.4;
  }
  li::marker { color: ${s.accentColor}; font-size: 10px; }
  /* ── Service items ── */
  .check-item, .cross-item, .opt-item {
    font-size: 12px;
    padding: 3px 0;
    line-height: 1.4;
  }
  .check-item { color: ${s.textColor}; }
  .cross-item { color: ${s.textColor}; opacity: 0.65; }
  .opt-item  { color: ${s.textColor}; opacity: 0.8; }
  /* ── Accommodation cards ── */
  .acco-card {
    background: ${s.cardBackground ?? '#f8fafc'};
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 6px;
  }
  .acco-city {
    font-size: 13px;
    font-weight: 700;
    color: ${s.headingColor};
  }
  .acco-hotel {
    font-size: 12px;
    color: ${s.textColor};
    opacity: 0.8;
    margin-top: 2px;
  }
  /* ── Notes ── */
  .note-item {
    font-size: 12px;
    color: ${s.textColor};
    opacity: 0.75;
    margin-bottom: 4px;
    font-style: italic;
  }
  /* ── Page number ── */
  .page-number {
    position: fixed;
    bottom: 12px;
    right: 16px;
    font-size: 11px;
    color: ${s.textColor};
    opacity: 0.4;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="header">
  <h1>${content.title}</h1>
  ${priceBadgeHtml}
</div>
${daysHtml}
${includedHtml}
${notIncludedHtml}
${optionalHtml}
${accHtml}
${notesHtml}
${pageNumberHtml}
</body>
</html>`;
}

export default renderMobileTemplate;
