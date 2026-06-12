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

// ═══════════════════════════════════════════════════════════════
// FONT REGISTRATION — Tinos (≈ Liberation Serif) + Arimo (≈ Nimbus Sans)
// TTF estáticos self-hosted en /public/fonts.
// ═══════════════════════════════════════════════════════════════
Font.register({
  family: 'Tinos',
  fonts: [
    { src: '/fonts/Tinos-Regular.ttf' },
    { src: '/fonts/Tinos-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Tinos-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/Tinos-BoldItalic.ttf', fontStyle: 'italic', fontWeight: 'bold' },
  ],
});

Font.register({
  family: 'Arimo',
  fonts: [
    { src: '/fonts/Arimo-Regular.ttf' },
    { src: '/fonts/Arimo-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Arimo-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/Arimo-BoldItalic.ttf', fontStyle: 'italic', fontWeight: 'bold' },
  ],
});

// ═══════════════════════════════════════════════════════════════
// HYPHENATION: Prohibir que @react-pdf/renderer corte palabras
// ═══════════════════════════════════════════════════════════════
Font.registerHyphenationCallback((word) => [word]);

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — dimensiones exactas del dossier objetivo
// ═══════════════════════════════════════════════════════════════
const PAGE_WIDTH = 298;   // pt
const PAGE_HEIGHT = 694;  // pt
const MARGIN_H = 34;      // pt (12 mm)
const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN_H; // 230 pt

// Colores directos (no dependen de PdfStyles para los elementos fijos del dossier)
const CREAM = '#FDFBF9';
const NAVY = '#0F2C3D';
const GOLD = '#C5A880';
const BEIGE = '#F4EFEA';
const SLATE = '#4A5568';
const MUTED = '#A0AEC0';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface Props {
  content: MobileContent;
  styles?: PdfStyles;
}

// ═══════════════════════════════════════════════════════════════
// SANITIZER
// ═══════════════════════════════════════════════════════════════

function sanitize(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/\*/g, '');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS — Split de texto para wrap condicional
// ═══════════════════════════════════════════════════════════════

/**
 * Divide un string en ~200 caracteres en un límite de palabra (espacio).
 * Esto produce ~2-3 líneas de texto a 11.5pt en columna de 230pt,
 * suficiente para que el título no quede huérfano pero lo bastante
 * compacto para caber en el espacio restante de la página actual.
 */
const CHUNK_CHARS = 200;

function splitAtWordBoundary(text: string, maxChars: number): [string, string] {
  if (text.length <= maxChars) return [text, ''];

  // Buscar el último espacio dentro del límite
  let splitIdx = text.lastIndexOf(' ', maxChars);

  // Si no hay espacio en el rango, cortar forzosamente en maxChars
  if (splitIdx === -1 || splitIdx < maxChars * 0.5) {
    splitIdx = maxChars;
  }

  return [text.substring(0, splitIdx).trimEnd(), text.substring(splitIdx).trimStart()];
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT: MobileItineraryPDF v3 — Dossier Móvil
// Patrón "Cabecera Absoluta + Espaciador":
//   - Página tiene paddingTop: 40 (margen en págs 2,3,…)
//   - heroBand es position:absolute con top:0, left:0, right:0
//     → full-bleed anclado al borde físico del papel
//   - heroSpacer invisible empuja el contenido de la pág 1
// ═══════════════════════════════════════════════════════════════

const MobileItineraryPDF: React.FC<Props> = ({ content, styles: _styles }) => {
  void _styles; // PdfStyles prop reservado para futura personalización; el dossier usa estilos fijos

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={s.page}>
        {/* ═══ 1. HERO BAND — absoluta, full-bleed, solo visible en pág 1 ═══ */}
        <View style={s.heroBand}>
          <Text style={s.headerTitle}>{sanitize(content.title)}</Text>
          <View style={s.headerDivider} />
          {content.tagline ? (
            <Text style={s.headerSubtitle}>{sanitize(content.tagline)}</Text>
          ) : null}
          {content.tarifaDesde ? (
            <View style={s.priceBadge}>
              <Text style={s.priceText}>
                {sanitize(`TARIFA DESDE ${content.tarifaDesde.replace(/Desde\s*/i, '')}`)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ═══ 2. ESPACIADOR INVISIBLE — empuja el contenido bajo la cabecera en pág 1 ═══ */}
        <View style={s.heroSpacer} />

        {/* ═══ 3. CONTENIDO NORMAL ═══ */}

        {/* ═══ ITINERARIO ═══ */}
        {(content.days?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>ITINERARIO DE VIAJE</Text>
            </View>
            <View style={s.sectionUnderline} />

            {content.days.map((day, index) => {
              // Split en ~200 chars (≈2-3 líneas) en límite de palabra —
              // suficiente para anclar el título sin forzar salto de página
              const resumen = sanitize(day.resumen);
              const [firstChunk, restChunk] = splitAtWordBoundary(resumen, CHUNK_CHARS);

              return (
                <View key={index} style={s.dayContainer}>
                  {/* Bloque indivisible: Label + Título + primeras ~2-3 líneas */}
                  <View wrap={false}>
                    <Text style={s.dayLabel}>Día {day.n || index + 1}</Text>
                    <Text style={s.dayTitle}>{sanitize(day.titulo)}</Text>
                    <Text style={[s.dayText, { marginBottom: 0 }]}>{firstChunk}</Text>
                  </View>

                  {/* El resto del párrafo fluye libremente a la página siguiente si es necesario */}
                  {restChunk ? <Text style={s.dayText}>{restChunk}</Text> : null}
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ SERVICIOS INCLUIDOS ═══ */}
        {(content.serviciosIncluidos?.length ?? 0) > 0 && (
          /* EL CONTENEDOR PADRE DEBE PODER ROMPERSE (SIN wrap={false}) */
          <View style={s.section}>
            {/* BLOQUE INDIVISIBLE: Título + underline + primer bullet (índice 0) */}
            <View wrap={false}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>SERVICIOS INCLUIDOS</Text>
              </View>
              <View style={s.sectionUnderline} />
              <View style={s.bulletRow}>
                <Text style={s.bulletDot}>{'\u2022'}</Text>
                <Text style={s.bulletText}>{sanitize(content.serviciosIncluidos[0])}</Text>
              </View>
            </View>
            {/* EL RESTO DE LA LISTA: Fluye libremente rellenando las páginas siguientes */}
            {content.serviciosIncluidos.slice(1).map((servicio, index) => (
              <View key={index + 1} style={s.bulletRow} wrap={false}>
                <Text style={s.bulletDot}>{'\u2022'}</Text>
                <Text style={s.bulletText}>{sanitize(servicio)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ ALOJAMIENTOS ═══ */}
        {(content.accommodations?.length ?? 0) > 0 && (
          <View style={s.section}>
            {/* Bloque indivisible: Título + Primera Fila */}
            <View wrap={false}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>ALOJAMIENTOS PREVISTOS</Text>
              </View>
              <View style={s.sectionUnderline} />

              <View style={s.accoRow}>
                <Text style={s.accoCity}>{sanitize(content.accommodations[0].ciudad)}</Text>
                <Text style={s.accoHoteles}>
                  {sanitize(content.accommodations[0].hoteles.join(' / '))}
                </Text>
              </View>
            </View>

            {/* Resto de filas (pueden saltar de página) */}
            {content.accommodations.slice(1).map((item, index) => (
              <View key={index + 1} style={s.accoRow} wrap={false}>
                <Text style={s.accoCity}>{sanitize(item.ciudad)}</Text>
                <Text style={s.accoHoteles}>
                  {sanitize(item.hoteles.join(' / '))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ OPCIÓN COMIDAS PLUS ═══ */}
        {content.opcionComidasPlus ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>OPCIÓN COMIDAS PLUS</Text>
            </View>
            <View style={s.sectionUnderline} />

            <View style={s.comidasCard} wrap={false}>
              <Text style={s.comidasText}>{sanitize(content.opcionComidasPlus)}</Text>
            </View>
          </View>
        ) : null}

        {/* ═══ FOOTER PREMIUM (fixed, todas las páginas) ═══ */}
        <View fixed style={s.footer}>
          <View style={s.footerContact}>
            {content.agentName && <Text style={s.footerName}>{content.agentName}</Text>}
            {content.agentPhone && <Text style={s.footerPhone}>{content.agentPhone}</Text>}
          </View>
          <Text style={s.footerPage} render={({ pageNumber }) => `${pageNumber}`} />
        </View>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES — dossier móvil (298×694 pt, crema/navy/dorado)
// Patrón "Cabecera Absoluta + Espaciador"
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────
  // paddingTop: 40 → respiro superior para págs 2,3,…
  // paddingHorizontal: 34 → márgenes laterales para TODO el contenido
  // paddingBottom: 80 → protección del footer fixed
  page: {
    backgroundColor: CREAM,
    fontFamily: 'Arimo',
    fontSize: 9,
    color: SLATE,
    paddingTop: 40,
    paddingBottom: 80,
    paddingLeft: 34,
    paddingRight: 34,
  },

  // ── Hero Band — absoluta, full-bleed (ignora padding de página) ──
  // top:0, left:0, right:0 → full-bleed anclado al borde físico del papel
  // paddingTop:50 → respiro elegante desde el techo para el título
  heroBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Tinos',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  headerDivider: {
    width: 40,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 8,
    alignSelf: 'center',
  },
  headerSubtitle: {
    color: '#C5A880',
    fontSize: 12,
    fontFamily: 'Tinos',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 15,
  },
  priceBadge: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Arimo',
    fontWeight: 'bold',
  },

  // ── Hero Spacer — invisible, empuja el contenido bajo la cabecera en pág 1 ──
  // En págs 2+ la heroBand no se pinta (position:absolute en pág 1),
  // pero el spacer sigue ocupando espacio. Con paddingTop:40 en page,
  // el contenido de págs 2+ empieza a 40pt del borde.
  heroSpacer: {
    height: 185,
  },

  // ── Sections ──────────────────────────────────────────
  section: {
    marginTop: 16,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#0F2C3D',
    fontSize: 14,
    fontFamily: 'Tinos',
    textTransform: 'uppercase',
    marginTop: 15,
    marginBottom: 4,
  },
  sectionUnderline: {
    width: USABLE_WIDTH,
    height: 1,
    backgroundColor: GOLD,
    marginTop: 4,
    marginBottom: 15,
  },

  // ── Day Blocks (sin card, layout vertical) ────────────
  dayContainer: {
    flexDirection: 'column',
    marginBottom: 14,
  },
  dayLabel: {
    fontSize: 11,
    color: '#C5A880',
    fontFamily: 'Tinos',
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 13,
    color: '#0F2C3D',
    fontFamily: 'Tinos',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dayText: {
    fontSize: 11.5,
    color: '#4A5568',
    fontFamily: 'Arimo',
    lineHeight: 1.4,
    textAlign: 'left',
    marginBottom: 15,
  },

  // ── Services bullets ───────────────────────────────────
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    width: 16,
    fontSize: 15,
    color: SLATE,
    textAlign: 'center',
    marginRight: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 11.5,
    color: '#4A5568',
    fontFamily: 'Arimo',
    lineHeight: 1.4,
    textAlign: 'left',
  },

  // ── Accommodations table ───────────────────────────────
  accoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: GOLD,
    paddingBottom: 6,
    marginBottom: 6,
  },
  accoCity: {
    fontSize: 11,
    fontFamily: 'Tinos',
    fontWeight: 'bold',
    color: '#0F2C3D',
    width: 85,
  },
  accoHoteles: {
    fontSize: 10.5,
    fontFamily: 'Arimo',
    color: '#4A5568',
    lineHeight: 1.3,
    flex: 1,
  },

  // ── Comidas Plus card ──────────────────────────────────
  comidasCard: {
    backgroundColor: BEIGE,
    borderLeftWidth: 2.3,
    borderLeftColor: NAVY,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: USABLE_WIDTH,
  },
  comidasText: {
    fontSize: 11.5,
    color: '#4A5568',
    fontFamily: 'Arimo',
    lineHeight: 1.4,
    textAlign: 'justify',
  },

  // ── Footer premium (fixed, nombre agente + teléfono + página) ──
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1 solid #C5A880',
    paddingTop: 8,
  },
  footerContact: {
    flexDirection: 'column',
  },
  footerName: {
    fontFamily: 'Tinos',
    fontSize: 12,
    color: NAVY,
  },
  footerPhone: {
    fontFamily: 'Arimo',
    fontSize: 10,
    color: SLATE,
  },
  footerPage: {
    fontFamily: 'Tinos',
    fontSize: 10,
    color: MUTED,
    fontStyle: 'italic',
  },
});

export default MobileItineraryPDF;
