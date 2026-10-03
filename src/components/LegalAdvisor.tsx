import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Trash2, Sparkles, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { LegalDraftCard } from "./LegalDraftCard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "My landlord refuses to return my security deposit.",
  "A neighbor is dumping garbage in front of my gate.",
  "I was scammed by an online seller on WhatsApp.",
  "How do I file a complaint for online banking fraud?"
];

const CHAT_HISTORY_KEY = "nyaykhoj_chat_history";

export const LegalAdvisor = ({
  onIpcClick,
  externalMessage,
}: {
  onIpcClick?: (ipc: string) => void;
  externalMessage?: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [caseContext, setCaseContext] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }, []);

  // Save chat history when messages change
  const saveHistory = (newMessages: Message[]) => {
    setMessages(newMessages);
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newMessages));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-send when a case context is pushed in from outside
  const prevExternalRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (externalMessage && externalMessage !== prevExternalRef.current) {
      prevExternalRef.current = externalMessage;
      setCaseContext(externalMessage);
      handleSendMessage(externalMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setErrorOccurred(false);
    const userMsg: Message = { role: "user", content: textToSend };
    const updatedHistory = [...messages, userMsg];
    saveHistory(updatedHistory);
    setInput("");
    setLoading(true);

    const API_BASE = import.meta.env.DEV ? "http://localhost:5001" : "https://euriken-nyay-khoj.hf.space";
    
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, history: messages }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to get response from assistant");
      }
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      saveHistory([...updatedHistory, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      setErrorOccurred(true);
      toast.error("Advice request failed", { description: err.message || "Failed to reach the legal advisor." });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    saveHistory([]);
    setErrorOccurred(false);
    toast.success("Conversation cleared");
  };

  const handleRetry = () => {
    // Find last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      // Remove last messages after that user message
      const lastUserIndex = messages.lastIndexOf(lastUserMessage);
      const newMessages = messages.slice(0, lastUserIndex);
      setMessages(newMessages);
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Post-process response to turn section numbers into markdown links
  const processMarkdown = (content: string) => {
    // Regex for IPC sections, e.g. "IPC Section 302" or "Section 302" or "IPC 302"
    // Capture group matches section number
    let processed = content;
    // Replace "IPC Section 302" or "IPC 302"
    processed = processed.replace(/\b(?:IPC\s+Section|IPC)\s*(\d{3}[A-Za-z]?)\b/gi, "[IPC $1](ipc:$1)");
    // Replace standalone "Section 302" with IPC links (as default context is IPC in Indian Law)
    processed = processed.replace(/(?<!IPC\s+)\b(?:Section|Sec\.)\s*(\d{3}[A-Za-z]?)\b/gi, "[Section $1](ipc:$1)");
    return processed;
  };

  return (
    <div className="flex flex-col h-[650px] rounded-lg border border-border bg-card overflow-hidden">
      {/* Case Context Banner */}
      {caseContext && (
        <div className="px-4 py-2 bg-primary/8 border-b border-primary/20 flex items-center justify-between gap-2">
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider truncate">
            ⚖ Advising on: <span className="text-foreground font-normal normal-case">{caseContext.split('\n')[0].replace('I need advice about this case: ', '')}</span>
          </p>
          <button
            onClick={() => { setCaseContext(null); }}
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
          >✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-none">AI Legal Advisor</h2>
            <p className="text-[10px] text-muted-foreground mt-1">Get initial assistance & section mappings</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-background text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors"
            title="Reset Conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Message List */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-xl text-primary">
              ⚖️
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Consult Adv. Nyay</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-legal">
                Describe your grievance or legal question. I can identify relevant sections under IPC and BNS, explain legal options, and suggest drafts.
              </p>
            </div>

            <div className="w-full space-y-2">
              <p className="text-[10px] text-muted-foreground text-left font-semibold uppercase tracking-wider">Suggested Starters</p>
              <div className="grid grid-cols-1 gap-2">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-xs p-3 rounded-lg border border-border bg-background/50 hover:bg-primary/5 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground font-legal"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in-50 duration-200`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-500 flex-shrink-0 shadow-sm select-none mb-1">
                ⚖️
              </div>
            )}
            
            <div className={`relative group max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground font-medium rounded-br-none"
                : "bg-muted text-foreground rounded-bl-none border border-border"
            }`}>
              {msg.role === "assistant" ? (
                <>
                  <div className="prose prose-sm prose-invert max-w-none font-legal pr-4">
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => {
                          return <div className="not-prose my-3">{children}</div>;
                        },
                        code: ({ className, children, ...props }) => {
                          const codeContent = String(children).replace(/\n$/, "");
                          const isInline = !className;
                          
                          if (isInline) {
                            return (
                              <code className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border font-mono text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                          
                          const isLegalDraft = 
                            className?.includes("language-legal") || 
                            codeContent.toLowerCase().includes("draft") || 
                            codeContent.toLowerCase().includes("notice to") ||
                            codeContent.toLowerCase().includes("complaint under") ||
                            codeContent.toLowerCase().includes("in the court of") ||
                            codeContent.toLowerCase().includes("memorandum");
                          
                          if (isLegalDraft) {
                            return <LegalDraftCard content={codeContent} />;
                          }
                          
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        a: ({ href, children }) => {
                          if (href?.startsWith("ipc:")) {
                            const ipc = href.replace("ipc:", "");
                            return (
                              <button
                                onClick={() => {
                                  if (onIpcClick) onIpcClick(ipc);
                                }}
                                className="inline-flex items-center mx-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all transform hover:scale-105 cursor-pointer"
                                title={`Search cases referencing IPC Section ${ipc}`}
                              >
                                {children}
                              </button>
                            );
                          }
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                              {children}
                            </a>
                          );
                        }
                      }}
                    >
                      {processMarkdown(msg.content)}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Floating copy button on hover */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      toast.success("Advice copied to clipboard!");
                    }}
                    className="absolute top-2 right-2 p-1 rounded bg-background hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-border"
                    title="Copy advice text"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <p className="font-legal whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0 shadow-sm select-none mb-1">
                YOU
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-300" />
              </span>
              Analyzing your case details...
            </div>
          </div>
        )}

        {errorOccurred && (
          <div className="flex flex-col items-center p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-center space-y-2">
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4" />
              Failed to get legal advice.
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry Last Message
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-border bg-card/60 p-3 flex gap-2">
        <textarea
          className="flex-1 rounded-md border border-border bg-background text-foreground px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary font-legal"
          rows={2}
          placeholder="Describe your legal grievance (e.g. landlord tenant issue)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(input);
            }
          }}
        />
        <button
          onClick={() => handleSendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </div>
    </div>
  );
};
