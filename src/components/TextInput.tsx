import { type FC, useState, useCallback } from 'react';

interface Props {
  onConvert: (text: string) => void;
  disabled: boolean;
}

/**
 * Componente de entrada de texto alternativo para pegar itinerarios
 * en texto plano (WhatsApp, email, etc.) en lugar de subir un PDF.
 *
 * Flujo:
 *   1. Botón "📝 Pegar texto del itinerario" → muestra textarea
 *   2. Usuario pega el texto → pulsa "Convertir a diseño móvil"
 *   3. onConvert(text) envía el texto al hook para procesamiento con IA
 */
const TextInput: FC<Props> = ({ onConvert, disabled }) => {
  const [showTextarea, setShowTextarea] = useState(false);
  const [text, setText] = useState('');

  const handleConvert = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onConvert(trimmed);
  }, [text, onConvert]);

  const handleCancel = useCallback(() => {
    setShowTextarea(false);
    setText('');
  }, []);

  // ── Estado 1: Botón para abrir el textarea ──────────────
  if (!showTextarea) {
    return (
      <div className="flex justify-center animate-fade-in">
        <button
          onClick={() => setShowTextarea(true)}
          disabled={disabled}
          className={[
            'inline-flex items-center gap-2.5 bg-white hover:bg-slate-50',
            'text-slate-700 font-medium px-6 py-3 rounded-xl',
            'border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600',
            'transition-all duration-200 shadow-sm',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="text-lg">📝</span>
          Pegar texto del itinerario
        </button>
      </div>
    );
  }

  // ── Estado 2: Textarea + botón de convertir ─────────────
  const wordCount = text.trim()
    ? text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <label className="block text-sm font-medium text-slate-600">
        Texto del itinerario
      </label>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Pega aquí el texto del itinerario (WhatsApp, email, documento...)&#10;&#10;Ejemplo:&#10;Día 1 - Llegada a Madrid&#10;Llegada al aeropuerto Adolfo Suárez. Traslado al hotel.&#10;Tarde libre para explorar el centro.&#10;&#10;Día 2 - Tour por la ciudad&#10;Visita guiada al Palacio Real y Plaza Mayor.&#10;Comida en restaurante típico."
        rows={12}
        disabled={disabled}
        className={[
          'w-full px-4 py-3 rounded-xl border-2 border-slate-200',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white',
          'outline-none transition-all duration-200 resize-vertical',
          'text-slate-700 placeholder-slate-400 font-sans text-sm leading-relaxed',
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'bg-white hover:border-slate-300',
        ].join(' ')}
      />

      {/* Contador de caracteres/palabras */}
      {text.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {text.length} caracteres · {wordCount} palabras
        </p>
      )}

      {/* Botones de acción */}
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={handleConvert}
          disabled={disabled || text.trim().length === 0}
          className={[
            'inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700',
            'text-white font-semibold px-6 py-3 rounded-xl',
            'transition-all duration-200 shadow-sm active:scale-[0.97]',
            (disabled || text.trim().length === 0)
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:shadow-md',
          ].join(' ')}
        >
          🚀 Convertir a diseño móvil
        </button>

        <button
          onClick={handleCancel}
          disabled={disabled}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors px-3 py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default TextInput;
