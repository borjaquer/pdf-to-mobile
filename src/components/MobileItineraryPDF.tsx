import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { MobileContent, PdfStyles } from '../types';
import { DEFAULT_PDF_STYLES } from '../utils/defaultPdfStyles';

// ═══════════════════════════════════════════════════════════════
// HYPHENATION: Prohibir que @react-pdf/renderer corte palabras
// automaticamente (ej. "ALEMA-NIA" o "Es-trasburgo").
// ═══════════════════════════════════════════════════════════════
Font.registerHyphenationCallback((word) => [word]);

// ═══════════════════════════════════════════════════════════════
// FONT MAPPING: CSS font-family strings → @react-pdf/renderer fonts
//
// @react-pdf/renderer built-in fonts:
//   Helvetica / Helvetica-Bold / Helvetica-Oblique / Helvetica-BoldOblique
//   Times-Roman / Times-Bold / Times-Italic / Times-BoldItalic
//   Courier / Courier-Bold / Courier-Oblique / Courier-BoldOblique
// ═══════════════════════════════════════════════════════════════

// ─── FIX 1: Text Sanitizer ───────────────────────────────────
// Elimina emojis, HTML residual y Markdown que corrompen
// el renderizado de @react-pdf/renderer (caracteres basura como <DUia).
// Se aplica a TODO texto dinamico antes de pasarlo a <Text>.
// ──────────────────────────────────────────────────────────────
function sanitizeText(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')            // strip residual HTML tags
    .replace(/\*/g, '')                 // strip Markdown asterisks
    .replace(/[^\x00-\x7FáéíóúÁÉÍÓÚñÑüÜ¿¡\n\r\t ]/g, ''); // keep ASCII + Spanish chars
}

function mapToPdfFont(cssFamily: string): string {
  const lower = cssFamily.toLowerCase();
  if (lower.includes('times') || lower.includes('georgia') || lower.includes('serif')) {
    return 'Times-Roman';
  }
  // Default: Helvetica (covers Arial, Trebuchet MS, sans-serif)
  return 'Helvetica';
}

function mapToPdfFontWeight(weight: string): number | 'bold' {
  const parsed = parseInt(weight, 10);
  if (!isNaN(parsed)) return parsed;
  return 'bold';
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface Props {
  content: MobileContent;
  styles?: PdfStyles;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE COLOR CONSTANTS — semanticos, independientes de palette
// ═══════════════════════════════════════════════════════════════

const SERVICE_COLORS = {
  included:  { bg: '#f0fdf4', border: '#bbf7d0', label: '#16a34a', icon: '\u2713' },
  not_included: { bg: '#fef2f2', border: '#fecaca', label: '#dc2626', icon: '\u2717' },
  optional:  { bg: '#eff6ff', border: '#bfdbfe', label: '#2563eb', icon: '\u25C9' },
} as const;

const SERVICE_LABELS: Record<string, string> = {
  included: 'INCLUIDO',
  not_included: 'NO INCLUIDO',
  optional: 'OPCIONAL',
};

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface HeaderProps {
  content: MobileContent;
  s: ReturnType<typeof createStyles>;
}

const Header: React.FC<HeaderProps> = ({ content, s }) => (
  <View style={s.header} wrap={false}>
    <Text style={s.title}>{sanitizeText(content.title)}</Text>
    {content.subtitle ? (
      <View style={s.priceBadge} wrap={false}>
        <Text style={s.priceBadgeText}>{sanitizeText(content.subtitle)}</Text>
      </View>
    ) : null}
  </View>
);

interface SectionHeaderProps {
  icon: string;
  label: string;
  s: ReturnType<typeof createStyles>;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, label, s }) => (
  <View style={s.sectionHeader} wrap={false}>
    <Text style={s.sectionIcon}>{sanitizeText(icon)}</Text>
    <Text style={s.sectionHeaderText}>{sanitizeText(label)}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT: MobileItineraryPDF
// ═══════════════════════════════════════════════════════════════

const MobileItineraryPDF: React.FC<Props> = ({ content, styles }) => {
  const merged: PdfStyles = styles ?? DEFAULT_PDF_STYLES;
  const s = createStyles(merged);

  return (
    <Document>
      <Page size={[390, 844]} style={s.page}>
        {/* ── Header ── */}
        <Header content={content} s={s} />

        {/* ── Itinerario (Timeline Day Cards) ── */}
        {(content.days?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Título + primer día NUNCA se separan (previene título huérfano) */}
            <View wrap={false}>
              <SectionHeader icon={'\uD83C\uDF0D'} label="ITINERARIO" s={s} />
              <View style={s.dayCard} wrap={false}>
                <View style={s.dayMarker}>
                  <Text style={s.dayMarkerText}>1</Text>
                </View>
                <View style={s.dayBody}>
                  <Text style={s.dayTitle}>
                    {sanitizeText(content.days[0].title)}
                  </Text>
                  {content.days[0].summary ? (
                    <Text style={s.daySummary}>{sanitizeText(content.days[0].summary)}</Text>
                  ) : null}
                  {content.days[0].bullets.map((bullet, j) => (
                    <View key={j} style={s.bulletRow}>
                      <View style={s.bulletDot} />
                      <Text style={s.bulletText}>{sanitizeText(bullet)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            {/* Del índice 1 en adelante, saltan de página libremente */}
            {content.days.slice(1).map((day, i) => (
              <View key={i + 1} style={s.dayCard} wrap={false}>
                <View style={s.dayMarker}>
                  <Text style={s.dayMarkerText}>{i + 2}</Text>
                </View>
                <View style={s.dayBody}>
                  <Text style={s.dayTitle}>
                    {sanitizeText(day.title)}
                  </Text>
                  {day.summary ? (
                    <Text style={s.daySummary}>{sanitizeText(day.summary)}</Text>
                  ) : null}
                  {day.bullets.map((bullet, j) => (
                    <View key={j} style={s.bulletRow}>
                      <View style={s.bulletDot} />
                      <Text style={s.bulletText}>{sanitizeText(bullet)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Servicios ── */}
        {(content.services?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Título + primer servicio NUNCA se separan (previene título huérfano) */}
            <View wrap={false}>
              <SectionHeader icon={'\uD83D\uDEE0\uFE0F'} label="SERVICIOS" s={s} />
              {(() => {
                const sv = content.services![0];
                const colors = SERVICE_COLORS[sv.category];
                return (
                  <View
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: merged.cardRadius ?? 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginBottom: 8,
                    }}
                    wrap={false}
                  >
                    <Text style={{ ...s.serviceLabel, color: colors.label }}>
                      {sanitizeText(colors.icon)} {sanitizeText(SERVICE_LABELS[sv.category])}
                    </Text>
                    {sv.items.map((item, j) => (
                      <Text key={j} style={s.serviceItem}>{sanitizeText(item)}</Text>
                    ))}
                  </View>
                );
              })()}
            </View>
            {/* Del índice 1 en adelante, saltan de página libremente */}
            {content.services!.slice(1).map((sv, i) => {
              const colors = SERVICE_COLORS[sv.category];
              return (
                <View
                  key={i + 1}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: merged.cardRadius ?? 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                  }}
                  wrap={false}
                >
                  <Text style={{ ...s.serviceLabel, color: colors.label }}>
                    {sanitizeText(colors.icon)} {sanitizeText(SERVICE_LABELS[sv.category])}
                  </Text>
                  {sv.items.map((item, j) => (
                    <Text key={j} style={s.serviceItem}>{sanitizeText(item)}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Alojamientos ── */}
        {(content.accommodations?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Título + primer alojamiento NUNCA se separan (previene título huérfano) */}
            <View wrap={false}>
              <SectionHeader icon={'\uD83C\uDFE8'} label="ALOJAMIENTOS" s={s} />
              {(() => {
                const acco = content.accommodations![0];
                return (
                  <View style={s.accoCard} wrap={false}>
                    <Text style={s.accoPin}>{sanitizeText('\uD83D\uDCCD')}</Text>
                    <View style={s.accoInfo}>
                      <Text style={s.accoName}>{sanitizeText(acco.name)}</Text>
                      <Text style={s.accoMeta}>
                        {sanitizeText(
                          [acco.location, acco.nights, acco.board]
                            .filter(Boolean)
                            .join(' \u00B7 ')
                        )}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
            {/* Del índice 1 en adelante, saltan de página libremente */}
            {content.accommodations!.slice(1).map((acco, i) => (
              <View key={i + 1} style={s.accoCard} wrap={false}>
                <Text style={s.accoPin}>{sanitizeText('\uD83D\uDCCD')}</Text>
                <View style={s.accoInfo}>
                  <Text style={s.accoName}>{sanitizeText(acco.name)}</Text>
                  <Text style={s.accoMeta}>
                    {sanitizeText(
                      [acco.location, acco.nights, acco.board]
                        .filter(Boolean)
                        .join(' \u00B7 ')
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Notas ── */}
        {(content.notes?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Título + primera nota NUNCA se separan (previene título huérfano) */}
            <View wrap={false}>
              <SectionHeader icon={'\uD83D\uDCCB'} label="NOTAS" s={s} />
              <View style={s.noteItem} wrap={false}>
                <Text style={s.noteText}>{sanitizeText(content.notes![0])}</Text>
              </View>
            </View>
            {/* Del índice 1 en adelante, saltan de página libremente */}
            {content.notes!.slice(1).map((note, i) => (
              <View key={i + 1} style={s.noteItem} wrap={false}>
                <Text style={s.noteText}>{sanitizeText(note)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer fijo dinámico ── */}
        <View fixed style={s.footer}>
          <View style={s.footerContact}>
            <Text style={s.footerName}>{sanitizeText(content.agentName ?? '')}</Text>
            <Text style={s.footerPhone}>{sanitizeText(content.agentPhone ?? '')}</Text>
          </View>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES (generados dinamicamente a partir de PdfStyles)
//
// Flexbox nativo de @react-pdf/renderer — sin colapso de margenes,
// sin limitaciones de html2canvas. Alineacion perfecta.
// ═══════════════════════════════════════════════════════════════

function createStyles(styles: PdfStyles) {
  const cardRadius = styles.cardRadius ?? 8;

  const headingFont = mapToPdfFont(styles.headingFontFamily ?? styles.fontFamily);
  const headingWeight = mapToPdfFontWeight(styles.headingFontWeight ?? '700');
  const bodyFont = mapToPdfFont(styles.fontFamily);

  return StyleSheet.create({
    // ── Page ──────────────────────────────────────────────
    page: {
      backgroundColor: styles.backgroundColor,
      fontFamily: bodyFont,
      fontSize: styles.fontSize ?? 18,
      color: styles.textColor,
      padding: 24,
      paddingBottom: 40,
    },

    // ── Header ────────────────────────────────────────────
    header: {
      backgroundColor: styles.headerGradient ?? styles.accentColor,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 16,
      borderBottomLeftRadius: cardRadius,
      borderBottomRightRadius: cardRadius,
    },
    title: {
      fontFamily: headingFont,
      fontSize: 30,
      fontWeight: headingWeight as any,
      color: styles.titleColor,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    priceBadge: {
      backgroundColor: styles.priceColor ?? '#f59e0b',
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 16,
      marginTop: 8,
      alignSelf: 'center',
    },
    priceBadgeText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: 'center',
      fontFamily: 'Helvetica',
    },

    // ── Sections ─────────────────────────────────────────
    section: {
      marginHorizontal: 16,
      marginBottom: 18,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: styles.dividerColor ?? '#e2e8f0',
      paddingBottom: 6,
      marginBottom: 12,
    },
    sectionIcon: {
      fontSize: 18,
      marginRight: 6,
    },
    sectionHeaderText: {
      fontFamily: headingFont,
      fontSize: 22,
      fontWeight: headingWeight as any,
      color: styles.headingColor,
      textTransform: 'uppercase',
    },

    // ── Day Cards (Timeline) ──────────────────────────────
    // FIX 3: flexDirection:'row' + alignItems:'flex-start' + width:'100%' + marginBottom:12
    dayCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      marginBottom: 12,
      backgroundColor: styles.cardBackground ?? '#f8fafc',
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: styles.dividerColor ?? '#e2e8f0',
      padding: 10,
      fontFamily: bodyFont,
    },
    // FIX 2: Geometria estricta del circulo — 24x24, borderRadius 12, flexShrink 0
    dayMarker: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: styles.accentColor,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    // FIX 2: Texto sin margenes, paddings ni line-height conflictivo
    dayMarkerText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      fontFamily: 'Helvetica',
    },
    // FIX 3: Contenedor de texto adyacente con flex:1 + marginLeft:8
    dayBody: {
      flex: 1,
      marginLeft: 8,
    },
    dayTitle: {
      fontFamily: headingFont,
      fontSize: 24,
      fontWeight: 'bold',
      color: styles.headingColor,
      marginBottom: 2,
    },
    daySummary: {
      fontSize: 18,
      color: styles.mutedColor ?? styles.textColor,
      marginBottom: 4,
      lineHeight: 1.5,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: styles.bulletColor ?? styles.accentColor,
      marginTop: 3,
      marginRight: 8,
      marginLeft: 4,
    },
    bulletText: {
      flex: 1,
      fontSize: 18,
      color: styles.textColor,
      lineHeight: 1.5,
    },

    // ── Services ──────────────────────────────────────────
    serviceLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: 4,
      fontFamily: 'Helvetica',
    },
    serviceItem: {
      fontSize: 18,
      color: styles.textColor,
      lineHeight: 1.5,
      marginBottom: 1,
    },

    // ── Accommodations ────────────────────────────────────
    accoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: styles.cardBackground ?? '#f8fafc',
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: styles.dividerColor ?? '#e2e8f0',
      padding: 10,
      marginBottom: 6,
      fontFamily: bodyFont,
    },
    accoPin: {
      fontSize: 20,
      marginRight: 8,
      marginTop: 1,
    },
    accoInfo: {
      flex: 1,
    },
    accoName: {
      fontFamily: headingFont,
      fontSize: 20,
      fontWeight: 'bold',
      color: styles.headingColor,
      marginBottom: 2,
    },
    accoMeta: {
      fontSize: 16,
      color: styles.mutedColor ?? styles.textColor,
    },

    // ── Notes ─────────────────────────────────────────────
    noteItem: {
      backgroundColor: styles.cardBackground ?? '#f8fafc',
      borderLeftWidth: 3,
      borderLeftColor: styles.accentColor,
      borderTopRightRadius: cardRadius,
      borderBottomRightRadius: cardRadius,
      padding: 8,
      marginBottom: 6,
    },
    noteText: {
      fontSize: 18,
      color: styles.textColor,
      fontStyle: 'italic',
      fontFamily: bodyFont,
      lineHeight: 1.5,
    },

    // ── Footer (fijo, compacto, horizontal) ───────────────
    footer: {
      position: 'absolute',
      bottom: 25,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTop: '1 solid #E5E7EB',
      paddingTop: 8,
    },
    footerContact: {
      flexDirection: 'column',
    },
    footerName: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#374151',
      marginBottom: 2,
    },
    footerPhone: {
      fontSize: 13,
      color: '#6B7280',
    },
    footerPage: {
      fontSize: 13,
      color: '#9CA3AF',
    },
  });
}

export default MobileItineraryPDF;
