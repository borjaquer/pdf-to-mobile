import { type FC } from 'react';
import { useLoading } from '../context/LoadingContext';

const LoadingOverlay: FC = () => {
  const { loading, step } = useLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-300">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-6 animate-fade-in">
        {/* Spinner animado con pulso */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping opacity-75" />
          </div>
        </div>

        {/* Texto del step actual */}
        <p className="text-lg font-semibold text-slate-800 text-center leading-relaxed animate-pulse">
          {step || 'Procesando...'}
        </p>

        {/* Barra de progreso animada */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full animate-progress"
            style={{
              animation: 'progress 2s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>

        <p className="text-xs text-slate-400 text-center">
          Esto puede tomar unos segundos
        </p>
      </div>

      {/* Estilos keyframes inline para la barra de progreso */}
      <style>{`
        @keyframes progress {
          0%   { width: 10%; }
          50%  { width: 70%; }
          100% { width: 90%; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
