import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { MobileContent, PdfStyles } from '../types';
import { DEFAULT_PDF_STYLES } from '../utils/defaultPdfStyles';

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
      <Page size="A5" style={s.page}>
        {/* ── Header ── */}
        <Header content={content} s={s} />

        {/* ── Itinerario (Timeline Day Cards) ── */}
        {(content.days?.length ?? 0) > 0 && (
          <View style={s.section}>
            <SectionHeader icon={'\uD83C\uDF0D'} label="ITINERARIO" s={s} />
            {content.days.map((day, i) => (
              <View key={i} style={s.dayCard} wrap={false}>
                {/* FIX 2: Geometria estricta del circulo */}
                <View style={s.dayMarker}>
                  <Text style={s.dayMarkerText}>{i + 1}</Text>
                </View>
                {/* FIX 3: Contenedor con flex:1 + marginLeft:8 previene solapamiento */}
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
            <SectionHeader icon={'\uD83D\uDEE0\uFE0F'} label="SERVICIOS" s={s} />
            {content.services!.map((sv, i) => {
              const colors = SERVICE_COLORS[sv.category];
              return (
                <View
                  key={i}
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
            <SectionHeader icon={'\uD83C\uDFE8'} label="ALOJAMIENTOS" s={s} />
            {content.accommodations!.map((acco, i) => (
              <View key={i} style={s.accoCard} wrap={false}>
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
            <SectionHeader icon={'\uD83D\uDCCB'} label="NOTAS" s={s} />
            {content.notes!.map((note, i) => (
              <View key={i} style={s.noteItem} wrap={false}>
                <Text style={s.noteText}>{sanitizeText(note)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        {content.pageNumber != null && (
          <Text style={s.footer}>
            {sanitizeText(`Pagina ${content.pageNumber}`)}
          </Text>
        )}
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
      fontSize: styles.fontSize ?? 14,
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
      fontSize: 20,
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
      fontSize: 11,
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
      fontSize: 13,
      marginRight: 6,
    },
    sectionHeaderText: {
      fontFamily: headingFont,
      fontSize: 12,
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
      fontSize: 12,
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
      fontSize: 13,
      fontWeight: 'bold',
      color: styles.headingColor,
      marginBottom: 2,
    },
    daySummary: {
      fontSize: 10,
      color: styles.mutedColor ?? styles.textColor,
      marginBottom: 4,
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
      fontSize: 10,
      color: styles.textColor,
      lineHeight: 1.4,
    },

    // ── Services ──────────────────────────────────────────
    serviceLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: 4,
      fontFamily: 'Helvetica',
    },
    serviceItem: {
      fontSize: 10,
      color: styles.textColor,
      lineHeight: 1.4,
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
      fontSize: 14,
      marginRight: 8,
      marginTop: 1,
    },
    accoInfo: {
      flex: 1,
    },
    accoName: {
      fontFamily: headingFont,
      fontSize: 12,
      fontWeight: 'bold',
      color: styles.headingColor,
      marginBottom: 2,
    },
    accoMeta: {
      fontSize: 9,
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
      fontSize: 10,
      color: styles.textColor,
      fontStyle: 'italic',
      fontFamily: bodyFont,
      lineHeight: 1.5,
    },

    // ── Footer ────────────────────────────────────────────
    footer: {
      textAlign: 'center',
      fontSize: 8,
      color: styles.mutedColor ?? styles.textColor,
      paddingBottom: 12,
      paddingTop: 20,
      textTransform: 'uppercase',
      fontFamily: bodyFont,
    },
  });
}

export default MobileItineraryPDF;
