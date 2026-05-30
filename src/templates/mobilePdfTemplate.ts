import type { MobileContent, PdfStyles } from '../types';

/**
 * Default styles for the PDF template — agency-grade design system.
 *
 * Color palette: deep navy header, clean white body, blue accents.
 * Typography scale: 20px (h1) → 14px (h2) → 12px (body) → 11px (meta).
 * Spacing: 8px grid, generous whitespace for readability on small screens.
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
  headerGradient: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)',
  headerTextColor: '#f1f5f9',
  bulletColor: '#3b82f6',
  mutedColor: '#94a3b8',
  cardRadius: 8,
};

/**
 * Template HTML/CSS mobile-first para el PDF final.
 * Diseño profesional tipo "dossier de agencia de viajes" con:
 * - Header con gradiente y badge de precio dorado
 * - Timeline visual para itinerario (cards con número de día)
 * - Sistema de color semántico para servicios (✓ verde, ✗ rojo, ◉ azul)
 * - Cards de alojamiento con iconografía de ubicación
 * - Sección de notas con borde lateral distintivo
 *
 * Optimizado para A5 (148×210mm) a 96dpi → ~559×794px viewport.
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
  const daysHtml = content.days.length ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">&#x1F30D;</span>
        <span>ITINERARIO</span>
      </div>
      <div class="timeline">
        ${content.days.map((d, i) => `
          <div class="day-card">
            <div class="day-marker">${i + 1}</div>
            <div class="day-body">
              <div class="day-title">${d.emoji ? d.emoji + ' ' : ''}${d.title}</div>
              ${d.summary ? `<div class="day-summary">${d.summary}</div>` : ''}
              ${d.bullets.length ? `
                <ul class="day-bullets">
                  ${d.bullets.map(b => `<li>${b}</li>`).join('')}
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
              <div class="acco-meta">
                ${a.location ? `<span class="acco-location">${a.location}</span>` : ''}
                ${a.nights ? `<span class="acco-divider">·</span><span>${a.nights}</span>` : ''}
                ${a.board ? `<span class="acco-divider">·</span><span>${a.board}</span>` : ''}
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
    ? `<div class="footer-bar">Página ${content.pageNumber}</div>`
    : '';

  // ═══════════════════════════════════════════════════════════
  // HTML + CSS
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
    -webkit-font-smoothing: antialiased;
  }

  /* ── Header ───────────────────────────────────────────── */
  .header {
    background: ${s.headerGradient ?? s.accentColor};
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
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  /* ── Sections ─────────────────────────────────────────── */
  .section { margin: 20px 16px 24px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: ${s.headingColor};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 2px solid ${s.dividerColor ?? '#e2e8f0'};
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .section-icon { font-size: 16px; }

  /* ── Timeline / Day Cards ─────────────────────────────── */
  .timeline { position: relative; }
  .day-card {
    display: flex;
    gap: 12px;
    background: ${s.cardBackground ?? '#f8fafc'};
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
    transition: none;
  }
  .day-marker {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${s.accentColor};
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
  }
  .day-body { flex: 1; min-width: 0; }
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
    padding-left: 16px;
    list-style: none;
  }
  .day-bullets li {
    font-size: 12px;
    color: ${s.textColor};
    margin-bottom: 3px;
    line-height: 1.45;
    position: relative;
    padding-left: 4px;
  }
  .day-bullets li::before {
    content: '';
    position: absolute;
    left: -14px;
    top: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${s.bulletColor ?? s.accentColor};
  }

  /* ── Services Grid ────────────────────────────────────── */
  .services-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .service-block {
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 10px 14px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
  }
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
  .acco-list { display: flex; flex-direction: column; gap: 8px; }
  .acco-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: ${s.cardBackground ?? '#f8fafc'};
    border-radius: ${s.cardRadius ?? 8}px;
    padding: 10px 14px;
    border: 1px solid ${s.dividerColor ?? '#e2e8f0'};
  }
  .acco-pin { font-size: 18px; line-height: 1; margin-top: 1px; }
  .acco-info { flex: 1; min-width: 0; }
  .acco-name {
    font-size: 13px;
    font-weight: 700;
    color: ${s.headingColor};
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .acco-meta {
    font-size: 11px;
    color: ${s.mutedColor ?? s.textColor};
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .acco-divider { opacity: 0.4; }

  /* ── Notes ────────────────────────────────────────────── */
  .notes-list { display: flex; flex-direction: column; gap: 8px; }
  .note-item {
    font-size: 12px;
    color: ${s.textColor};
    background: ${s.cardBackground ?? '#f8fafc'};
    border-left: 3px solid ${s.accentColor};
    border-radius: 0 ${s.cardRadius ?? 8}px ${s.cardRadius ?? 8}px 0;
    padding: 8px 12px;
    line-height: 1.5;
    font-style: italic;
  }

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
