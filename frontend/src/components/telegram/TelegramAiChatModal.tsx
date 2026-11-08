import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { telegramApi, AiChatMessage } from '@/services/telegramApi';

interface TelegramAiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
}

export const TelegramAiChatModal: React.FC<TelegramAiChatModalProps> = ({
  isOpen,
  onClose,
  storeName = 'MegaCommerce Flagship',
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      sender: 'assistant',
      message: `Hello! 👋 I am your ${storeName} AI Shopping Assistant. Ask me about product availability, genuine specs, current promotions, return policies, or order status in English or ភាសាខ្មែរ!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'en' | 'km'>('en');
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    { label: '💻 MacBook Pro M3', query: 'Do you have MacBook Pro in stock?' },
    { label: '🎧 Sony XM5', query: 'Show me Sony WH-1000XM5 details' },
    { label: '📜 Return Policy', query: 'What is your return and warranty policy?' },
    { label: '📦 Track #ORD-2026-9041', query: 'Where is order ORD-2026-9041?' },
    { label: '🇰🇭 គោលការណ៍ប្តូរទំនិញ', query: 'តើមានគោលការណ៍ប្តូរទំនិញវិញទេ?' },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    const userMsg: AiChatMessage = { sender: 'user', message: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await telegramApi.sendAiMessage({
        message: text,
        session_id: sessionId,
        language: language,
      });

      if (res?.session_id) {
        setSessionId(res.session_id);
      }

      const assistantMsg: AiChatMessage = {
        sender: 'assistant',
        message: res.message,
        tool_calls: res.tool_calls,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          message: 'Sorry, I encountered an issue connecting to the store catalog. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-md mx-auto h-[88vh] rounded-t-3xl flex flex-col border-t border-border shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center space-x-1.5">
                <span>AI Shopping Assistant</span>
              </h2>
              <p className="text-[10px] text-muted-foreground">Catalog & Policy Intelligence</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all"
            >
              <Languages className="w-3.5 h-3.5 text-indigo-500" />
              <span>{language === 'en' ? 'EN' : 'ខ្មែរ'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Prompts Bar */}
        <div className="py-2 px-3 bg-muted/30 border-b border-border/60 overflow-x-auto no-scrollbar flex items-center space-x-1.5 text-xs">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q.query)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-card border border-border/80 text-foreground font-medium text-[11px] hover:border-indigo-500 transition-colors shadow-2xs"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m, index) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={index}
                className={`flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-card border border-border rounded-tl-xs shadow-2xs text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>

                  {/* Render Tool Results Cards if any */}
                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 space-y-2">
                      {m.tool_calls.map((tc, tcIdx) => (
                        <div
                          key={tcIdx}
                          className="bg-muted/50 p-2 rounded-xl border border-border/60 text-[11px] space-y-1"
                        >
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Catalog Tool: {tc.tool}</span>
                          </div>
                          {tc.result?.products && (
                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                              {tc.result.products.map((p: any) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between bg-card p-1.5 rounded-lg border border-border/60"
                                >
                                  <div>
                                    <div className="font-bold text-foreground">{p.name}</div>
                                    <div className="text-muted-foreground text-[10px]">
                                      SKU: {p.sku} • {p.in_stock ? `Stock: ${p.stock_quantity}` : 'Out of Stock'}
                                    </div>
                                  </div>
                                  <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                    ${p.price}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-muted-foreground flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-200" />
                <span>Checking store catalog...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-card border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'km' ? 'សួរអំពីផលិតផល ឬការកុម្ម៉ង់...' : 'Ask about products, stock, policies...'}
              className="flex-1 bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

