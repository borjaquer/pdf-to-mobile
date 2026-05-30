import { type FC } from 'react';

interface Props {
  text: string;
}

const TextPreview: FC<Props> = ({ text }) => {
  return (
    <details className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <summary className="px-5 py-3 text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none">
        📝 Texto extraído del PDF ({text.length.toLocaleString()} caracteres)
      </summary>
      <div className="px-5 pb-5">
        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg max-h-64 overflow-y-auto">
          {text}
        </pre>
      </div>
    </details>
  );
};

export default TextPreview;
