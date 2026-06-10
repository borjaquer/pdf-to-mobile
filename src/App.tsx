import { useCallback, type FC } from 'react';
import LoadingOverlay from './components/LoadingOverlay';
import PdfUploader from './components/PdfUploader';
import TextInput from './components/TextInput';
import ConversionProgress from './components/ConversionProgress';
import MobilePreview from './components/MobilePreview';
import ChatPanel from './components/ChatPanel';
import PdfDownload from './components/PdfDownload';
import ErrorBoundary from './components/ErrorBoundary';
import { usePdfConversion } from './hooks/usePdfConversion';

const App: FC = () => {
  const {
    state,
    mobileContent,
    pdfStyles,
    isProcessing,
    agentDataMissing,
    startConversion,
    startTextConversion,
    applyChatChanges,
    reset,
  } = usePdfConversion();

  const isBusy = state.step === 'extracting' || state.step === 'reformatting' || state.step === 'generating';

  const handleFileSelected = useCallback((file: File) => {
    startConversion(file);
  }, [startConversion]);

  const handleTextConvert = useCallback((text: string) => {
    startTextConversion(text);
  }, [startTextConversion]);

  return (
    <ErrorBoundary>
      <LoadingOverlay />
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="w-full px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h1 className="text-xl font-bold text-slate-900">PDF-to-Mobile</h1>
                <p className="text-xs text-slate-500">Adapta PDFs a lectura móvil</p>
              </div>
            </div>
            {state.step !== 'idle' && (
              <button
                onClick={reset}
                disabled={isBusy}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                title="Volver a empezar"
              >
                🔄 Reiniciar
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Upload Area — only show when idle or after error */}
          {state.step === 'idle' || state.step === 'error' ? (
            <div className="space-y-6">
              <PdfUploader
                onFileSelected={handleFileSelected}
                disabled={isBusy}
              />

              {/* Separador visual entre PDF y texto */}
              <div className="flex items-center gap-4 select-none">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <span className="text-sm font-medium text-slate-400 tracking-widest">
                  — o —
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              </div>

              {/* Entrada alternativa: texto plano */}
              <TextInput
                onConvert={handleTextConvert}
                disabled={isBusy}
              />
            </div>
          ) : null}

          {/* Progress */}
          <ConversionProgress state={state} />

          {/* Mobile Preview — key dinámica fuerza recreación del iframe cuando cambia contenido o estilos */}
          {mobileContent && (
            <MobilePreview
              key={JSON.stringify(mobileContent) + JSON.stringify(pdfStyles)}
              content={mobileContent}
              styles={pdfStyles}
            />
          )}

          {/* Chat de diseño (siempre visible mientras haya contenido) */}
          {mobileContent && (
            <ChatPanel
              onSendInstruction={applyChatChanges}
              isProcessing={isProcessing || isBusy}
              agentDataMissing={agentDataMissing}
            />
          )}

          {/* Download — genera el blob reactivamente desde content+styles para reflejo 1:1 con preview */}
          {state.step === 'done' && mobileContent && (
            <PdfDownload
              content={mobileContent}
              styles={pdfStyles}
              fileName="documento-adaptado"
              agentDataMissing={agentDataMissing}
            />
          )}

          {/* Warning visual cuando faltan datos del agente */}
          {agentDataMissing && (
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <span>⚠️</span>
                <span>Completa los datos del agente en el chat para habilitar la descarga del PDF</span>
              </div>
            </div>
          )}

          {/* Error with retry */}
          {state.step === 'error' && (
            <div className="text-center animate-fade-in">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                🔄 Intentar de nuevo
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full px-6 py-4 border-t border-slate-200 bg-white/50">
          <div className="max-w-4xl mx-auto text-center text-xs text-slate-400">
            ⚡ 100% gratuito · Procesado en tu navegador · Gemini 2.5 Flash
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
