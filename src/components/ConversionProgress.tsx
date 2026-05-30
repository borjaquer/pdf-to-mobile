import { type FC } from 'react';
import type { PdfConversionState } from '../types';

interface Props {
  state: PdfConversionState;
}

interface StepDef {
  id: 'extract' | 'reformat' | 'generate';
  label: string;
  icon: string;
}

const STEPS: StepDef[] = [
  { id: 'extract', label: 'Extraer texto', icon: '📄' },
  { id: 'reformat', label: 'IA reformateando', icon: '🤖' },
  { id: 'generate', label: 'Generar PDF', icon: '📱' },
];

/** SVG inline spinner — evita dependencia de bibliotecas externas */
const Spinner: FC = () => (
  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/** SVG checkmark verde */
const Checkmark: FC = () => (
  <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

/** SVG X roja */
const Cross: FC = () => (
  <svg className="h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ConversionProgress: FC<Props> = ({ state }) => {
  // Determinar índice del paso activo y si hay error
  const hasError = state.step === 'error';
  const errorStepId = state.errorStep;
  const currentStepIdx = state.step === 'extracting' ? 0
    : state.step === 'reformatting' ? 1
    : state.step === 'generating' ? 2
    : state.step === 'done' ? 3
    : -1;

  if (state.step === 'idle') return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, i) => {
          let status: 'done' | 'loading' | 'pending' | 'error';
          if (hasError && errorStepId === step.id) {
            status = 'error';
          } else if (i < currentStepIdx) {
            status = 'done';
          } else if (i === currentStepIdx) {
            status = 'loading';
          } else {
            status = 'pending';
          }

          return (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <div className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300
                ${status === 'done' ? 'bg-green-50 text-green-700' : ''}
                ${status === 'loading' ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100' : ''}
                ${status === 'error' ? 'bg-red-50 text-red-700' : ''}
                ${status === 'pending' ? 'bg-slate-50 text-slate-400' : ''}
              `}>
                {/* Icono de estado */}
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {status === 'loading' && <Spinner />}
                  {status === 'done' && <Checkmark />}
                  {status === 'error' && <Cross />}
                  {status === 'pending' && <span className="text-sm">{step.icon}</span>}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {/* Conector entre pasos */}
              {i < STEPS.length - 1 && (
                <div className={`
                  flex-1 h-0.5 rounded transition-colors duration-500
                  ${i < currentStepIdx ? 'bg-green-300' : 'bg-slate-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {state.rateLimitWaitMs && state.rateLimitWaitMs > 0 && (
        <p className="mt-3 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="animate-pulse">⏳</span>
          Esperando {Math.ceil(state.rateLimitWaitMs / 1000)}s por límite de API gratuita (10 RPM)...
        </p>
      )}

      {state.error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
          ⚠️ {state.error}
        </p>
      )}
    </div>
  );
};

export default ConversionProgress;
