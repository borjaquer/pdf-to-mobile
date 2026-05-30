import { type FC, useMemo } from 'react';
import type { MobileContent, PdfStyles } from '../types';
import { renderMobileTemplate } from '../templates/mobilePdfTemplate';

interface Props {
  content: MobileContent;
  /** Estilos visuales aplicados dinámicamente a la preview (desde el chat) */
  styles?: PdfStyles;
}

/**
 * Vista previa del documento en un mockup de teléfono.
 *
 * A diferencia de la versión anterior que duplicaba la lógica de renderizado
 * con React + inline styles, ahora usa `renderMobileTemplate()` dentro de un
 * iframe con `srcdoc`. Esto garantiza que la preview sea **pixel-idéntica**
 * al PDF generado por `pdfGenerator.ts`, ya que ambos comparten exactamente
 * el mismo HTML/CSS.
 *
 * El iframe se renderiza en modo sandbox para aislamiento total del DOM
 * principal (sin scripts, sin navegación, sin popups).
 */
const MobilePreview: FC<Props> = ({ content, styles }) => {
  /** HTML idéntico al que se pasa a html2pdf.js en pdfGenerator.ts */
  const htmlString = useMemo(
    () => renderMobileTemplate(content, styles),
    [content, styles],
  );

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

        {/* Screen — iframe renders the exact same HTML as the PDF */}
        <div className="rounded-[1.75rem] overflow-hidden bg-white">
          <iframe
            srcDoc={htmlString}
            title="Vista previa del documento móvil"
            sandbox="allow-same-origin"
            className="w-full border-0 block"
            style={{ height: '500px' }}
            scrolling="auto"
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
