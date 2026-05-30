import { type FC } from 'react';

interface Props {
  blob: Blob;
  fileName: string;
}

const PdfDownload: FC<Props> = ({ blob, fileName }) => {
  const url = URL.createObjectURL(blob);

  return (
    <div className="text-center space-y-3 animate-fade-in">
      <a
        href={url}
        download={`${fileName}-mobile.pdf`}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
      >
        <span>📥</span> Descargar PDF adaptado
      </a>
      <p className="text-xs text-slate-400">Formato A5 · Optimizado para lectura en móvil</p>
    </div>
  );
};

export default PdfDownload;
