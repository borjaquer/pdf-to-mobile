import { type FC, useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  disabled: boolean;
}

const PdfUploader: FC<Props> = ({ onFileSelected, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') return;

    setFileName(file.name);
    setFileSize(formatSize(file.size));
    onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 animate-fade-in
        ${dragOver ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {fileName ? (
        <div className="space-y-2">
          <span className="text-4xl">📄</span>
          <p className="text-slate-700 font-medium">{fileName}</p>
          <p className="text-xs text-slate-400">{fileSize} · Click para cambiar de archivo</p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-5xl">📤</span>
          <div>
            <p className="text-slate-700 font-semibold text-lg">Arrastra tu PDF aquí</p>
            <p className="text-slate-400 text-sm mt-1">o haz click para seleccionarlo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfUploader;
