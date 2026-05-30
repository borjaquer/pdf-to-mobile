import { type FC, useMemo } from 'react';
import type { MobileContent, PdfStyles } from '../types';
import { DEFAULT_PDF_STYLES } from '../templates/mobilePdfTemplate';

interface Props {
  content: MobileContent;
  /** Estilos visuales aplicados dinámicamente a la preview (desde el chat) */
  styles?: PdfStyles;
}

/**
 * Vista previa del documento en un mockup de teléfono.
 *
 * Los estilos (colores, fuente, tamaño) se aplican inline desde `styles`
 * para que los cambios del chat de diseño se vean reflejados al instante.
 * Si no se pasan estilos, se usan los defaults del template.
 */
const MobilePreview: FC<Props> = ({ content, styles }) => {
  const s = useMemo(() => styles ?? DEFAULT_PDF_STYLES, [styles]);

  const rootStyle: React.CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: `${Math.max(10, s.fontSize - 2)}px`,
    color: s.textColor,
    backgroundColor: s.backgroundColor,
    lineHeight: 1.5,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 800,
    color: s.titleColor,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1.2,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '11px',
    color: s.subtitleColor ?? s.textColor,
    marginTop: '4px',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: s.headingColor,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    borderBottom: `2px solid ${s.dividerColor ?? '#e2e8f0'}`,
    paddingBottom: '6px',
    marginBottom: '10px',
  };

  const dayCardStyle: React.CSSProperties = {
    background: s.cardBackground ?? '#f8fafc',
    borderLeft: `3px solid ${s.accentColor}`,
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '10px',
  };

  const dayTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: s.headingColor,
    marginBottom: '2px',
  };

  const daySummaryStyle: React.CSSProperties = {
    fontSize: '12px',
    color: s.textColor,
    opacity: 0.8,
    marginBottom: '6px',
    lineHeight: 1.4,
  };

  const listItemStyle: React.CSSProperties = {
    fontSize: '12px',
    color: s.textColor,
    marginBottom: '2px',
    lineHeight: 1.4,
  };

  const bulletStyle: React.CSSProperties = {
    color: s.accentColor,
    flexShrink: 0,
  };

  const accoCardStyle: React.CSSProperties = {
    background: s.cardBackground ?? '#f8fafc',
    borderRadius: '6px',
    padding: '8px 12px',
    marginBottom: '6px',
  };

  const accoCityStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: s.headingColor,
  };

  const accoHotelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: s.textColor,
    opacity: 0.8,
    marginTop: '2px',
  };

  const noteStyle: React.CSSProperties = {
    fontSize: '12px',
    color: s.textColor,
    opacity: 0.75,
    marginBottom: '4px',
    fontStyle: 'italic',
  };

  const priceBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    background: s.priceColor ?? s.accentColor,
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 12px',
    borderRadius: '16px',
    letterSpacing: '0.3px',
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-sm font-medium text-slate-500 text-center">📱 Vista previa móvil</h3>

      {/* Phone mockup */}
      <div className="mx-auto max-w-[340px] bg-slate-900 rounded-[2.5rem] p-[10px] shadow-2xl">
        {/* Notch */}
        <div className="relative flex justify-center mb-2">
          <div className="w-24 h-6 bg-slate-900 rounded-b-xl flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* Screen — dynamic styles applied inline */}
        <div
          className="rounded-[1.75rem] overflow-hidden"
          style={{ backgroundColor: s.backgroundColor }}
        >
          <div
            className="text-xs space-y-3 max-h-[500px] overflow-y-auto p-4"
            style={rootStyle}
          >
            {/* Title + price badge */}
            <h2 style={titleStyle}>{content.title}</h2>
            {content.subtitle && (
              content.subtitle.includes('€') || content.subtitle.includes('$') || content.subtitle.includes('desde')
                ? <div style={priceBadgeStyle}>{content.subtitle}</div>
                : <p style={subtitleStyle}>{content.subtitle}</p>
            )}

            {/* Days */}
            {content.days.map((day, i) => (
              <div key={i} style={dayCardStyle}>
                <div style={dayTitleStyle}>{day.emoji} {day.title}</div>
                <div style={daySummaryStyle}>{day.summary}</div>
                <ul style={{ paddingLeft: '16px', marginTop: '4px', listStyle: 'none' }}>
                  {day.bullets.map((b, j) => (
                    <li key={j} style={listItemStyle} className="flex gap-1.5">
                      <span style={bulletStyle}>●</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Accommodations */}
            {content.accommodations && content.accommodations.length > 0 && (
              <div>
                <div style={sectionHeaderStyle}>🏨 ALOJAMIENTOS PREVISTOS</div>
                {content.accommodations.map((a, i) => (
                  <div key={i} style={accoCardStyle}>
                    <div style={accoCityStyle}>{a.location || a.name}</div>
                    <div style={accoHotelStyle}>
                      {a.location ? a.name : ''}{a.nights ? ` · ${a.nights}` : ''}{a.board ? ` (${a.board})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Services */}
            {content.services && content.services.length > 0 && (
              <div>
                {content.services.map((svc, i) => {
                  const label = svc.category === 'included' ? '✅ INCLUIDO'
                    : svc.category === 'not_included' ? '❌ NO INCLUIDO'
                    : '🔷 OPCIONAL';
                  const itemOpacity = svc.category === 'not_included' ? 0.65
                    : svc.category === 'optional' ? 0.8 : 1;

                  return (
                    <div key={i} className="mb-1">
                      <div style={sectionHeaderStyle}>{label}</div>
                      <ul style={{ paddingLeft: '16px', listStyle: 'none' }}>
                        {svc.items.map((item, j) => (
                          <li key={j} style={{ ...listItemStyle, opacity: itemOpacity }} className="flex gap-1.5">
                            <span style={bulletStyle}>●</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notes */}
            {content.notes && content.notes.length > 0 && (
              <div>
                <div style={sectionHeaderStyle}>📝 NOTAS</div>
                {content.notes.map((n, i) => (
                  <p key={i} style={noteStyle}>{n}</p>
                ))}
              </div>
            )}
          </div>
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
