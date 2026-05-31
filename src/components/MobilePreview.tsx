import { type FC } from 'react';
import type { MobileContent, PdfStyles } from '../types';

interface Props {
  content: MobileContent;
  /** Estilos visuales aplicados dinámicamente a la preview (desde el chat) */
  styles?: PdfStyles;
}

/**
 * Vista previa del documento en un mockup de teléfono.
 *
 * v2: Renderiza HTML inline que refleja el mismo diseño visual que
 * MobileItineraryPDF.tsx genera de forma vectorial. Ya no depende de
 * renderMobileTemplate (eliminado en la migración a @react-pdf/renderer).
 *
 * El iframe se renderiza en modo sandbox para aislamiento total del DOM
 * principal (sin scripts, sin navegación, sin popups).
 */
const MobilePreview: FC<Props> = ({ content, styles }) => {
  const s = styles;

  const headerColor = s?.headerGradient ?? '#1e293b';
  const headerText = s?.headerTextColor ?? '#f1f5f9';
  const titleColor = s?.titleColor ?? '#ffffff';
  const priceColor = s?.priceColor ?? '#f59e0b';
  const headingColor = s?.headingColor ?? '#0f172a';
  const textColor = s?.textColor ?? '#334155';
  const accentColor = s?.accentColor ?? '#3b82f6';
  const cardBg = s?.cardBackground ?? '#f8fafc';
  const dividerColor = s?.dividerColor ?? '#e2e8f0';
  const mutedColor = s?.mutedColor ?? '#94a3b8';
  const bulletColor = s?.bulletColor ?? accentColor;
  const cardRadius = s?.cardRadius ?? 8;
  const fontFamily = s?.fontFamily ?? 'Arial, Helvetica, sans-serif';
  const headingFont = s?.headingFontFamily ?? fontFamily;
  const headingWeight = s?.headingFontWeight ?? '700';
  const baseSize = s?.fontSize ?? 14;

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');

  const daysHtml = (content.days ?? []).length
    ? `<div class="section"><div class="section-header"><span class="section-icon">🌍</span><span>ITINERARIO</span></div><div class="timeline">${(content.days ?? []).map((d, i) => `
      <div class="day-card">
        <div class="day-marker"><span class="day-marker-badge">${i + 1}</span></div>
        <div class="day-body">
          <div class="day-title">${d.emoji ? escapeHtml(d.emoji) + ' ' : ''}${escapeHtml(d.title)}</div>
          ${d.summary ? `<div class="day-summary">${escapeHtml(d.summary)}</div>` : ''}
          ${d.bullets.map(b => `<div class="bullet-row"><span class="bullet-dot"></span><span class="bullet-text">${escapeHtml(b)}</span></div>`).join('')}
        </div>
      </div>`).join('')}</div></div>`
    : '';

  const serviceLabels: Record<string, string> = {
    included: '✓ INCLUIDO',
    not_included: '✗ NO INCLUIDO',
    optional: '◉ OPCIONAL',
  };

  const serviceColors: Record<string, { bg: string; border: string; label: string }> = {
    included: { bg: '#f0fdf4', border: '#bbf7d0', label: '#16a34a' },
    not_included: { bg: '#fef2f2', border: '#fecaca', label: '#dc2626' },
    optional: { bg: '#eff6ff', border: '#bfdbfe', label: '#2563eb' },
  };

  const servicesHtml = (content.services ?? []).length
    ? `<div class="section"><div class="section-header"><span class="section-icon">🛠️</span><span>SERVICIOS</span></div><div class="services-grid">${(content.services ?? []).map(sv => {
      const colors = serviceColors[sv.category];
      return `<div class="service-block" style="background:${colors.bg};border-color:${colors.border}"><div class="service-label" style="color:${colors.label}">${serviceLabels[sv.category]}</div>${sv.items.map(i => `<div class="service-item">${escapeHtml(i)}</div>`).join('')}</div>`;
    }).join('')}</div></div>`
    : '';

  const accoHtml = (content.accommodations ?? []).length
    ? `<div class="section"><div class="section-header"><span class="section-icon">🏨</span><span>ALOJAMIENTOS</span></div><div class="acco-list">${(content.accommodations ?? []).map(a => `
      <div class="acco-card">
        <span class="acco-pin">📍</span>
        <div class="acco-info">
          <div class="acco-name">${escapeHtml(a.name)}</div>
          <div class="acco-meta">${[a.location, a.nights, a.board].filter(Boolean).join(' · ')}</div>
        </div>
      </div>`).join('')}</div></div>`
    : '';

  const notesHtml = (content.notes ?? []).length
    ? `<div class="section"><div class="section-header"><span class="section-icon">📋</span><span>NOTAS</span></div><div class="notes-list">${(content.notes ?? []).map(n => `<div class="note-item">${escapeHtml(n)}</div>`).join('')}</div></div>`
    : '';

  const footerHtml = content.pageNumber != null
    ? `<div class="footer">Página ${content.pageNumber}</div>`
    : '';

  const htmlString = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:${fontFamily};font-size:${baseSize}px;line-height:1.55;color:${textColor};background:#fff;width:340px;-webkit-font-smoothing:antialiased}
.header{background:${headerColor};color:${headerText};text-align:center;padding:22px 16px 18px;border-radius:0 0 ${cardRadius}px ${cardRadius}px;margin-bottom:14px}
.header h1{font-family:${headingFont};font-size:18px;font-weight:${headingWeight};color:${titleColor};text-transform:uppercase;line-height:1.15;margin-bottom:6px}
.price-badge{display:inline-block;background:${priceColor};color:#0f172a;font-size:11px;font-weight:800;padding:4px 14px;border-radius:16px}
.section{margin:16px 12px 18px}
.section-header{font-family:${headingFont};font-size:12px;font-weight:${headingWeight};color:${headingColor};text-transform:uppercase;border-bottom:2px solid ${dividerColor};padding-bottom:6px;margin-bottom:10px}
.section-icon{font-size:13px;margin-right:4px}
.day-card{display:flex;align-items:flex-start;background:${cardBg};border-radius:${cardRadius}px;border:1px solid ${dividerColor};padding:10px;margin-bottom:8px;font-size:12px}
.day-marker{width:34px;flex-shrink:0}
.day-marker-badge{display:inline-block;width:24px;height:24px;border-radius:50%;background:${accentColor};color:#fff;font-size:11px;font-weight:800;line-height:24px;text-align:center}
.day-body{flex:1}
.day-title{font-family:${headingFont};font-size:13px;font-weight:700;color:${headingColor};margin-bottom:2px}
.day-summary{font-size:10px;color:${mutedColor};margin-bottom:4px}
.bullet-row{display:flex;align-items:flex-start;margin-bottom:4px}
.bullet-dot{width:5px;height:5px;border-radius:50%;background:${bulletColor};flex-shrink:0;margin-top:4px;margin-right:8px}
.bullet-text{font-size:10px;color:${textColor};line-height:1.4}
.service-block{border-radius:${cardRadius}px;border:1px solid;padding:8px 12px;margin-bottom:8px}
.service-label{font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.service-item{font-size:10px;color:${textColor};line-height:1.4;padding:1px 0}
.acco-card{display:flex;align-items:flex-start;background:${cardBg};border-radius:${cardRadius}px;border:1px solid ${dividerColor};padding:10px;margin-bottom:6px}
.acco-pin{font-size:14px;margin-right:6px;flex-shrink:0}
.acco-info{flex:1}
.acco-name{font-size:12px;font-weight:700;color:${headingColor};margin-bottom:2px}
.acco-meta{font-size:9px;color:${mutedColor}}
.note-item{font-size:10px;color:${textColor};background:${cardBg};border-left:3px solid ${accentColor};border-radius:0 ${cardRadius}px ${cardRadius}px 0;padding:6px 10px;margin-bottom:6px;font-style:italic;line-height:1.45}
.footer{text-align:center;font-size:9px;color:${mutedColor};padding:16px 0 8px;text-transform:uppercase;opacity:.5}
</style>
</head>
<body>
<div class="header">
  <h1>${escapeHtml(content.title)}</h1>
  ${content.subtitle ? `<span class="price-badge">${escapeHtml(content.subtitle)}</span>` : ''}
</div>
${daysHtml}
${servicesHtml}
${accoHtml}
${notesHtml}
${footerHtml}
</body>
</html>`;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-sm font-medium text-slate-500 text-center">
        📱 Vista previa móvil
      </h3>

      {/* Phone mockup */}
      <div className="mx-auto max-w-[340px] bg-slate-900 rounded-[2.5rem] p-[10px] shadow-2xl">
        {/* Notch */}
        <div className="relative flex justify-center mb-2">
          <div className="w-24 h-6 bg-slate-900 rounded-b-xl flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* Screen — iframe with inline HTML mirroring MobileItineraryPDF design */}
        <div className="rounded-[1.75rem] overflow-hidden bg-white h-[500px]">
          <iframe
            srcDoc={htmlString}
            title="Mobile PDF Preview"
            className="w-full h-full border-0 bg-white"
            style={{ display: 'block' }}
          />
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-2">
          <div className="w-28 h-1 bg-slate-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
