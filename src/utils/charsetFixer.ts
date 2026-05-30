/**
 * Detecta y corrige encoding corrupto en texto extraído de PDFs.
 * Maneja: tildes, eñes, diéresis, caracteres especiales latinos mal codificados.
 *
 * Los PDFs a menudo almacenan texto en encoding no-UTF-8 (ej: WinAnsiEncoding),
 * lo que produce caracteres corruptos al extraer con pdf.js.
 */
export function fixCharset(text: string): string {
  // Mapa exhaustivo de caracteres corruptos (UTF-8 mal interpretado) → correctos
  // Cubre: español, alemán, francés, italiano, portugués
  const charMap: Array<[string, string]> = [
    // Minúsculas con tilde
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
    // Mayúsculas con tilde
    ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'],
    // Eñes
    ['Ã±', 'ñ'], ['Ã‘', 'Ñ'],
    // Diéresis
    ['Ã¼', 'ü'], ['Ãœ', 'Ü'],
    // Circunflejos (francés, portugués)
    ['Ã¢', 'â'], ['Ãª', 'ê'], ['Ã®', 'î'], ['Ã´', 'ô'], ['Ã»', 'û'],
    ['Ã‚', 'Â'], ['ÃŠ', 'Ê'], ['ÃŽ', 'Î'], ['Ã”', 'Ô'], ['Ã›', 'Û'],
    // Graves
    ['Ã ', 'à'], ['Ã¨', 'è'], ['Ã¬', 'ì'], ['Ã²', 'ò'], ['Ã¹', 'ù'],
    ['Ã€', 'À'], ['Ãˆ', 'È'], ['ÃŒ', 'Ì'], ['Ã’', 'Ò'], ['Ã™', 'Ù'],
    // Cedilla (francés, portugués)
    ['Ã§', 'ç'], ['Ã‡', 'Ç'],
    // Signos de puntuación españoles
    ['Â¡', '¡'], ['Â¿', '¿'],
    // Em-dash / En-dash
    ['â€”', '—'], ['â€"', '–'],
    // Comillas
    ['â€œ', '«'], ['â€', '»'], ['â€˜', "'"], ['â€™', "'"],
    // Caracteres de moneda
    ['â€š', '€'],
    // Casos específicos de ciudades conocidas
    ['ZÃ¼rich', 'Zúrich'],
    ['ZÃƒÂ¼rich', 'Zúrich'],
    ['MÃ¼nchen', 'Múnich'],
    ['KÃ¶ln', 'Colonia'],
    // Símbolos misc
    ['Â®', '®'], ['Â©', '©'], ['â„¢', '™'],
    ['Â°', '°'], ['Âº', 'º'], ['Âª', 'ª'],
    // Espacio no rompible
    ['Â ', ' '],
  ];

  let fixed = text;
  for (const [bad, good] of charMap) {
    // Usar split/join en lugar de replaceAll para compatibilidad más amplia
    while (fixed.includes(bad)) {
      fixed = fixed.split(bad).join(good);
    }
  }

  return fixed;
}

export default fixCharset;
