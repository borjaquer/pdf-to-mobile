import { type FC, useMemo } from 'react';
import type { MobileContent, PdfStyles } from '../types';

interface Props {
  content: MobileContent;
  /** Estilos visuales aplicados dinámicamente a la preview (desde el chat) */
  styles?: PdfStyles;
}

/**
 * Vista previa del documento en un mockup de teléfono.
 *
 * v3: Renderiza HTML inline que refleja el diseño del dossier objetivo
 * (crema/navy/dorado, días sin bullets, hoteles por ciudad, comidas plus).
 *
 * Estrategia anti-caché: el iframe lleva un key={cacheKey} derivado de
 * un hash del HTML generado.
 */
const MobilePreview: FC<Props> = ({ content, styles }) => {
  const s = styles;

  const headerColor = s?.headerGradient ?? '#0F2C3D';
  const headerText = s?.headerTextColor ?? '#FFFFFF';
  const titleColor = s?.titleColor ?? '#FFFFFF';
  const headingColor = s?.headingColor ?? '#0F2C3D';
  const textColor = s?.textColor ?? '#4A5568';
  const accentColor = s?.accentColor ?? '#C5A880';
  const cardBg = s?.cardBackground ?? '#F4EFEA';
  const bgColor = s?.backgroundColor ?? '#FDFBF9';
  const mutedColor = s?.mutedColor ?? '#A0AEC0';
  const fontFamily = s?.fontFamily ?? 'Arimo, Arial, sans-serif';
  const headingFont = s?.headingFontFamily ?? 'Tinos, Georgia, serif';

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');

  // ── Days (sin bullets, sin emoji, sin cards) ──
  const daysHtml = (content.days ?? []).length
    ? `<div class="section">
        <div class="section-header">
          <span class="section-emoji">🗺️</span>
          <span>ITINERARIO DE VIAJE</span>
        </div>
        <div class="section-underline"></div>
        ${(content.days ?? []).map(d => `
        <div class="day-block">
          <div class="day-label">Día ${d.n ?? 0}</div>
          <div class="day-title">${escapeHtml(d.titulo)}</div>
          <div class="day-summary">${escapeHtml(d.resumen)}</div>
        </div>`).join('')}
        </div>`
    : '';

  // ── Servicios (bullets planos) ──
  const serviciosHtml = (content.serviciosIncluidos ?? []).length
    ? `<div class="section">
        <div class="section-header">
          <span class="section-emoji">✅</span>
          <span>SERVICIOS INCLUIDOS</span>
        </div>
        <div class="section-underline"></div>
        ${(content.serviciosIncluidos ?? []).map(sv => `
        <div class="bullet-row"><span class="bullet-dot">•</span><span class="bullet-text">${escapeHtml(sv)}</span></div>`).join('')}
        </div>`
    : '';

  // ── Alojamientos (2-columnas) ──
  const accoHtml = (content.accommodations ?? []).length
    ? `<div class="section">
        <div class="section-header">
          <span class="section-emoji">🏨</span>
          <span>ALOJAMIENTOS PREVISTOS</span>
        </div>
        <div class="section-underline"></div>
        ${(content.accommodations ?? []).map(a => `
        <div class="acco-row">
          <span class="acco-city">${escapeHtml(a.ciudad)}</span>
          <span class="acco-hoteles">${escapeHtml(a.hoteles.join(' / '))}</span>
        </div>`).join('')}
        </div>`
    : '';

  // ── Comidas Plus ──
  const comidasHtml = content.opcionComidasPlus
    ? `<div class="section">
        <div class="section-header">
          <span class="section-emoji">🍽️</span>
          <span>OPCIÓN COMIDAS PLUS</span>
        </div>
        <div class="section-underline"></div>
        <div class="comidas-card">${escapeHtml(content.opcionComidasPlus)}</div>
        </div>`
    : '';

  const htmlString = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:${fontFamily};font-size:11px;line-height:1.5;color:${textColor};background:${bgColor};width:298px;-webkit-font-smoothing:antialiased}
.hero{background:${headerColor};color:${headerText};text-align:center;padding:24px 18px 16px;margin-bottom:16px}
.hero h1{font-family:${headingFont};font-size:14px;color:${titleColor};text-transform:uppercase;line-height:1.2;margin-bottom:6px}
.hero-rule{width:50px;height:2px;background:${accentColor};margin:8px auto}
.hero-tagline{font-family:${headingFont};font-style:italic;font-size:9px;color:${accentColor}}
.tarifa-badge{display:inline-block;border:1px solid ${accentColor};padding:3px 12px;margin-top:8px;border-radius:2px}
.tarifa-badge span{font-size:8px;color:#fff;text-transform:uppercase}
.section{margin:14px 18px 8px}
.section-header{display:flex;align-items:center;font-family:${headingFont};font-size:11px;font-weight:700;color:${headingColor};text-transform:uppercase}
.section-emoji{font-size:11px;margin-right:4px}
.section-underline{height:1px;background:${accentColor};margin:4px 0 8px}
.day-block{margin-bottom:12px}
.day-label{font-family:${headingFont};font-style:italic;font-weight:700;font-size:10px;color:${accentColor};margin-bottom:2px}
.day-title{font-family:${headingFont};font-weight:700;font-size:10px;color:${headingColor};margin-bottom:3px}
.day-summary{font-size:9px;line-height:1.45;text-align:justify}
.bullet-row{display:flex;align-items:flex-start;margin-bottom:3px}
.bullet-dot{width:14px;font-size:9px;text-align:center;flex-shrink:0}
.bullet-text{flex:1;font-size:9px;line-height:1.45;text-align:justify}
.acco-row{display:flex;border-bottom:0.5px solid ${accentColor};padding-bottom:3px;margin-bottom:3px}
.acco-city{font-family:${headingFont};font-weight:700;font-size:9px;color:${headingColor};width:72px}
.acco-hoteles{font-size:8px;flex:1}
.comidas-card{background:${cardBg};border-left:2px solid ${headingColor};padding:8px 10px;font-size:9px;line-height:1.5;text-align:justify}
.footer{text-align:right;padding:12px 18px 8px;font-family:${headingFont};font-style:italic;font-size:7px;color:${mutedColor}}
</style>
</head>
<body>
<div class="hero">
  <h1>${escapeHtml(content.title)}</h1>
  <div class="hero-rule"></div>
  ${content.tagline ? `<div class="hero-tagline">${escapeHtml(content.tagline)}</div>` : ''}
  ${content.tarifaDesde ? `<div class="tarifa-badge"><span>TARIFA DESDE ${escapeHtml(content.tarifaDesde.replace(/Desde\s*/i, ''))}</span></div>` : ''}
</div>
${daysHtml}
${serviciosHtml}
${accoHtml}
${comidasHtml}
<div class="footer">1</div>
</body>
</html>`;

  // ── Anti-cache: hash simple del HTML ──
  const cacheKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < htmlString.length; i++) {
      const chr = htmlString.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'preview-' + Math.abs(hash).toString(36);
  }, [htmlString]);

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

        {/* Screen — iframe with inline HTML */}
        <div className="rounded-[1.75rem] overflow-hidden bg-white h-[500px]">
          <iframe
            key={cacheKey}
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
