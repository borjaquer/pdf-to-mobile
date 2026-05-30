import type { MobileContent, PdfStyles } from '../types';

/**
 * Default styles for the PDF template — agency-grade design system.
 *
 * ⚠️ IMPORTANTE: html2pdf.js (html2canvas) tiene limitaciones con:
 *   - linear-gradient → se reemplaza con color sólido
 *   - box-shadow → eliminado
 *   - ::before/::after pseudo-elementos → reemplazados por elementos reales
 *   - gap en flexbox → reemplazado por margins
 *   - flex-wrap → reemplazado por layout más simple
 *
 * Color palette: deep navy header, clean white body, blue accents.
 * Typography scale: 22px (h1) → 14px (h2) → 13px (card title) → 12px (body) → 11px (meta).
 */
export const DEFAULT_PDF_STYLES: PdfStyles = {
  titleColor: '#ffffff',
  headingColor: '#0f172a',
  textColor: '#334155',
  accentColor: '#3b82f6',
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  fontSize: 14,
  priceColor: '#f59e0b',
  subtitleColor: '#cbd5e1',
  dividerColor: '#e2e8f0',
  cardBackground: '#f8fafc',
  headerGradient: '#1e293b', // sólido — html2canvas no soporta gradient
  headerTextColor: '#f1f5f9',
  bulletColor: '#3b82f6',
  mutedColor: '#94a3b8',
  cardRadius: 8,
};

/**
 * Template HTML/CSS mobile-first para el PDF final.
 *
 * Diseño profesional tipo "dossier de agencia de viajes" con:
 * - Header navy sólido y badge de precio dorado
 * - Timeline visual para itinerario (cards con número de día)
 * - Sistema de color semántico para servicios (✓ verde, ✗ rojo, ◉ azul)
 * - Cards de alojamiento con iconografía de ubicación
 * - Sección de notas con borde lateral distintivo
 *
 * Optimizado para A5 (148×210mm) a 96dpi → ~559×794px viewport.
 *
 * ⚠️ CSS compatible con html2pdf.js/html2canvas:
 *   - Sin linear-gradient (se usa color sólido)
 *   - Sin box-shadow
 *   - Sin pseudo-elementos ::before/::after
 *   - Sin gap en flexbox (se usa margin)
 *   - Sin flex-wrap
 *
 * @param content - Datos estructurados del documento
 * @param styles - Opcional. Estilos CSS personalizados
 */
export function renderMobileTemplate(content: MobileContent, styles?: PdfStyles): string {
  const s = styles ?? DEFAULT_PDF_STYLES;

  // ── Header ──────────────────────────────────────────────────
  const priceBadgeHtml = content.subtitle
    ? `<span class="price-badge">${content.subtitle}</span>`
    : '';

  // ── Days (timeline cards) ───────────────────────────────────
  const daysHtml = (content.days ?? []).length ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">&#x1F30D;</span>
        <span>ITINERARIO</span>
      </div>
      <div class="timeline">
        ${(content.days ?? []).map((d, i) => `
          <div class="day-card">
            <div class="day-marker">${i + 1}</div>
            <div class="day-body">
              <div class="day-title">${d.emoji ? d.emoji + ' ' : ''}${d.title}</div>
              ${d.summary ? `<div class="day-summary">${d.summary}</div>` : ''}
              ${d.bullets.length ? `
                <ul class="day-bullets">
                  ${d.bullets.map(b => `
                    <li>
                      <span class="bullet-dot"></span>
                      <span class="bullet-text">${b}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // ── Services ────────────────────────────────────────────────
  const included = content.services?.filter(sv => sv.category === 'included') ?? [];
  const notIncluded = content.services?.filter(sv => sv.category === 'not_included') ?? [];
  const optional = content.services?.filter(sv => sv.category === 'optional') ?? [];

  const includedHtml = included.length ? `
    <div class="service-block service-included">
      <div class="service-label">&#x2713; INCLUIDO</div>
      ${included.map(sv => sv.items.map(i => `<div class="service-item">${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  const notIncludedHtml = notIncluded.length ? `
    <div class="service-block service-excluded">
      <div class="service-label">&#x2717; NO INCLUIDO</div>
      ${notIncluded.map(sv => sv.items.map(i => `<div class="service-item">${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  const optionalHtml = optional.length ? `
    <div class="service-block service-optional">
      <div class="service-label">&#x25C9; OPCIONAL</div>
      ${optional.map(sv => sv.items.map(i => `<div class="service-item">${i}</div>`).join('')).join('')}
    </div>
  ` : '';

  const servicesHtml = (included.length + notIncluded.length + optional.length) ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">&#x1F6E0;&#xFE0F;</span>
        <span>SERVICIOS</span>
      </div>
      <div class="services-grid">
        ${includedHtml}
        ${notIncludedHtml}
        ${optionalHtml}
      </div>
    </div>
  ` : '';

  // ── Accommodations ──────────────────────────────────────────
  const accHtml = content.accommodations?.length ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">&#x1F3E8;</span>
        <span>ALOJAMIENTOS</span>
      </div>
      <div class="acco-list">
        ${content.accommodations.map(a => `
          <div class="acco-card">
            <div class="acco-pin">&#x1F4CD;</div>
            <div class="acco-info">
              <div class="acco-name">${a.name}</div>
              <div class="acco-meta-line">
                ${a.location ? `<span class="acco-location">${a.location}</span>` : ''}
                ${a.location && a.nights ? '<span class="acco-divider">·</span>' : ''}
                ${a.nights ? `<span>${a.nights}</span>` : ''}
                ${(a.location || a.nights) && a.board ? '<span class="acco-divider">·</span>' : ''}
                ${a.board ? `<span>${a.board}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // ── Notes ──────────────────────────────────────────────────
  const notesHtml = content.notes?.length ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">&#x1F4CB;</span>
        <span>NOTAS</span>
      </div>
      <div class="notes-list">
        ${content.notes.map(n => `<div class="note-item">${n}</div>`).join('')}
      </div>
    </div>
  ` : '';

  // ── Footer ──────────────────────────────────────────────────
  const pageNumberHtml = content.pageNumber
    ? `<div class="footer-bar">P&aacute;gina ${content.pageNumber}</div>`
    : '';

  // ═══════════════════════════════════════════════════════════
  // HTML + CSS (html2pdf.js / html2canvas compatible)
  // ═══════════════════════════════════════════════════════════
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  /* ── Reset & Base ─────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${s.fontFamily};
    font-size: ${s.fontSize}px;
    line-height: 1.55;
    color: ${s.textColor};
    background: ${s.backgroundColor};
    width: 559px;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Header ───────────────────────────────────────────── */
  .header {
    background: ${s.headerGradient ?? '#1e293b'};
    color: ${s.headerTextColor ?? '#ffffff'};
    text-align: center;
    padding: 28px 20px 24px;
    margin: 0 0 20px 0;
    border-radius: 0 0 ${s.cardRadius ?? 8}px ${s.cardRadius ?? 8}px;
  }
  h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
    line-height: 1.15;
    margin-bottom: 8px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .header-subtitle {
    font-size: 12px;
    color: ${s.subtitleColor ?? 'rgba(255,255,255,0.7)'};
    margin-top: 2px;
    letter-spacing: 0.2px;
  }
  .price-badge {
    display: inline-block;
    background: ${s.priceColor ?? '#f59e0b'};
    color: #0f172a;
    font-size: 13px;
    font-weight: 800;
    padding: 5px 18px;
    border-radius: 20px;
    margin-top: 10px;
    letter-spacing: 0.2px;
  }

  /* ── Sections ─────────────────────────────────────────── */
  .section { margin: 20px 16px 24px; }
  .section-header {
    display: table;
  }
  .section-header > * {
    display: table-cell;
    vertical-align: middle;
  }
  .section-header {
    font-size: 14px;
    font-weight: 700;
    color: ${s.headingColor};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 2px solid ${s.dividerColor ?? '#e2e8f0'};
    padding-bottom: 8px;
    margin-bottom: 14px;
    width: 100%;
  }
  .section-icon {
    font-size: 16px;
    width: 26px;
    text-align: center;
  }

  /* ── Timeline / Day Cards ─────────────────────────────── */
  .day-card {
    display: table;
    width: 100%;
    table-layout: fixed;
    background: ${s.cardBackground ?? '#f8fafc'};
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
  }
  .day-marker {
    display: table-cell;
    vertical-align: top;
    width: 42px;
  }
  .day-marker-inner {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${s.accentColor};
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    line-height: 30px;
    text-align: center;
    vertical-align: middle;
  }
  .day-body { display: table-cell; vertical-align: top; }
  .day-title {
    font-size: 14px;
    font-weight: 700;
    color: ${s.headingColor};
    margin-bottom: 4px;
    line-height: 1.3;
  }
  .day-summary {
    font-size: 12px;
    color: ${s.mutedColor ?? s.textColor};
    margin-bottom: 6px;
    line-height: 1.45;
  }
  .day-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .day-bullets li {
    font-size: 12px;
    color: ${s.textColor};
    margin-bottom: 3px;
    line-height: 1.45;
  }
  .bullet-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${s.bulletColor ?? s.accentColor};
    margin-right: 8px;
    vertical-align: middle;
  }
  .bullet-text {
    vertical-align: middle;
  }

  /* ── Services Grid ────────────────────────────────────── */
  .services-grid {
    display: block;
  }
  .service-block {
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 10px 14px;
    margin-bottom: 10px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
  }
  .service-block:last-child { margin-bottom: 0; }
  .service-included {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
  .service-excluded {
    background: #fef2f2;
    border-color: #fecaca;
  }
  .service-optional {
    background: #eff6ff;
    border-color: #bfdbfe;
  }
  .service-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .service-included .service-label { color: #16a34a; }
  .service-excluded .service-label { color: #dc2626; }
  .service-optional  .service-label { color: #2563eb; }
  .service-item {
    font-size: 12px;
    color: ${s.textColor};
    padding: 2px 0;
    line-height: 1.45;
  }

  /* ── Accommodations ───────────────────────────────────── */
  .acco-list { display: block; }
  .acco-card {
    display: table;
    width: 100%;
    table-layout: fixed;
    background: ${s.cardBackground ?? '#f8fafc'};
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 10px 14px;
    margin-bottom: 8px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
  }
  .acco-card:last-child { margin-bottom: 0; }
  .acco-pin {
    display: table-cell;
    vertical-align: top;
    font-size: 18px;
    line-height: 1;
    width: 28px;
    text-align: center;
  }
  .acco-info { display: table-cell; vertical-align: top; }
  .acco-name {
    font-size: 13px;
    font-weight: 700;
    color: ${s.headingColor};
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .acco-meta-line {
    font-size: 11px;
    color: ${s.mutedColor ?? s.textColor};
    white-space: nowrap;
  }
  .acco-divider { margin: 0 4px; opacity: 0.4; }

  /* ── Notes ────────────────────────────────────────────── */
  .notes-list { display: block; }
  .note-item {
    font-size: 12px;
    color: ${s.textColor};
    background: ${s.cardBackground ?? '#f8fafc'};
    border-left: 3px solid ${s.accentColor};
    border-radius: 0 ${s.cardRadius ?? 8}px ${s.cardRadius ?? 8}px 0;
    padding: 8px 12px;
    margin-bottom: 8px;
    line-height: 1.5;
    font-style: italic;
  }
  .note-item:last-child { margin-bottom: 0; }

  /* ── Footer ───────────────────────────────────────────── */
  .footer-bar {
    text-align: center;
    font-size: 10px;
    color: ${s.mutedColor ?? s.textColor};
    padding: 20px 0 12px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    opacity: 0.5;
  }
</style>
</head>
<body>
<div class="header">
  <h1>${content.title}</h1>
  ${priceBadgeHtml}
</div>
${daysHtml}
${servicesHtml}
${accHtml}
${notesHtml}
${pageNumberHtml}
</body>
</html>`;
}

export default renderMobileTemplate;
