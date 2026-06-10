import { type FC, useState, useCallback, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  onSendInstruction: (message: string) => Promise<string>;
  isProcessing: boolean;
  agentDataMissing?: boolean;
}

const SUGGESTIONS = [
  { emoji: '🎨', text: 'Cambiar colores' },
  { emoji: '🔤', text: 'Cambiar fuente' },
  { emoji: '📝', text: 'Editar título' },
  { emoji: '📱', text: 'Texto más grande' },
  { emoji: '🌙', text: 'Fondo oscuro' },
  { emoji: '✨', text: 'Diseño elegante' },
  { emoji: '🌊', text: 'Estilo playa y relax' },
  { emoji: '🏔️', text: 'Estilo montaña y naturaleza' },
];

let nextId = 1;
function genId(): string {
  return `msg-${Date.now()}-${nextId++}`;
}

/**
 * Panel de chat conversacional para editar el diseño del PDF.
 *
 * El usuario escribe instrucciones en lenguaje natural y el asistente
 * (vía LLM) las interpreta, aplica los cambios y regenera el PDF.
 */
const ChatPanel: FC<Props> = ({
  onSendInstruction,
  isProcessing,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const reply = await onSendInstruction(text);

    const assistantMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      text: reply,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMsg]);
  }, [input, isProcessing, onSendInstruction]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleSuggestion = useCallback((suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  }, []);

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>💬</span> Chat de diseño
          <span className="text-xs font-normal text-slate-400 ml-auto">
            Instrucciones en lenguaje natural
          </span>
        </h2>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 px-5 py-4 space-y-3 overflow-y-auto"
        style={{ minHeight: '280px', maxHeight: '400px' }}
      >
        {messages.length === 0 && !isProcessing && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 mb-4">
              Describe cómo quieres que se vea el PDF. Por ejemplo:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestion(s.text)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-colors text-slate-600"
                >
                  {s.emoji} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-700 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-700 rounded-xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder={isProcessing ? 'Aplicando cambios...' : 'Ej: pon el título en azul marino, fondo beige...'}
          className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl transition-colors shrink-0"
          title="Enviar"
        >
          {isProcessing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m-6-6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
