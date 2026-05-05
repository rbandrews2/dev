"use client";

import { useState, useEffect, useRef } from "react";
import AiAvatar from "@/components/assistant/AiAvatar";

type AssistantPanelProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function AssistantPanel({ open = false, onClose }: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(Boolean(open));
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Work Zone AI. Ask me about safety protocols, DVIR procedures, or incident reporting." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep internal state in sync with parent trigger
  useEffect(() => {
    setIsOpen(Boolean(open));
  }, [open]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = {
        "safety": "Safety is our top priority. All crew members must wear PPE including hard hats, high-visibility vests, and steel-toe boots at all times on site.",
        "dvir": "Daily Vehicle Inspection Reports (DVIR) must be completed before and after each shift. Check brakes, lights, tires, and fluid levels.",
        "incident": "To report an incident: 1) Ensure immediate safety, 2) Notify your supervisor, 3) Document with photos, 4) Fill out incident report form within 24 hours.",
      };

      const lowerQuery = userMessage.toLowerCase();
      let response = "I can help with safety protocols, DVIR procedures, and incident reporting. What would you like to know?";

      for (const [key, value] of Object.entries(responses)) {
        if (lowerQuery.includes(key)) {
          response = value;
          break;
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSubmit = () => {
    if (!isLoading && input.trim().length > 0) {
      sendMessage();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-50 flex justify-center items-end
        bg-black/40 backdrop-blur-sm
        md:items-center
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="
          w-full md:w-[420px] lg:w-[480px]
          h-[85vh] md:h-[600px]
          bg-[rgba(20,20,20,0.65)] 
          backdrop-blur-xl
          border border-yellow-600/40
          rounded-t-2xl md:rounded-2xl
          shadow-[0_0_25px_rgba(255,200,50,0.35)]
          flex flex-col overflow-hidden
        "
      >
        {/* HEADER */}
        <div className="
          flex items-center justify-between
          px-4 py-3
          border-b border-yellow-700/30
          bg-black/40 backdrop-blur-md
        ">
          <div className="flex items-center gap-3">
            <AiAvatar size={40} />
            <div className="flex flex-col">
              <span className="font-semibold text-yellow-400 text-sm">
                Work Zone AI
              </span>
              <span className="text-gray-400 text-xs -mt-0.5">
                Context-aware assistant for your crew
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="
              px-3 py-1.5 text-xs font-medium
              bg-yellow-500 hover:bg-yellow-600
              text-black rounded-md transition-colors
            "
          >
            Close
          </button>
        </div>

        {/* MESSAGE WINDOW */}
        <div
          ref={scrollRef}
          className="
            flex-1 overflow-y-auto
            px-4 py-3 space-y-4
            text-gray-200
          "
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`
                max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed
                ${m.role === "user"
                  ? "ml-auto bg-yellow-500 text-black"
                  : "mr-auto bg-black/40 border border-yellow-700/30 backdrop-blur-md"
                }
              `}
            >
              {m.content}
            </div>
          ))}

          {isLoading && (
            <div
              className="
                w-fit bg-black/40 border border-yellow-700/30
                px-3 py-2 rounded-lg text-sm text-gray-300
                animate-pulse
              "
            >
              Thinking...
            </div>
          )}
        </div>

        {/* INPUT BAR */}
        <div
          className="
            w-full p-3 flex items-center gap-2
            bg-black/50 backdrop-blur-md
            border-t border-yellow-700/30
          "
        >
          <input
            type="text"
            placeholder="Ask about safety, DVIR, incidents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="
              flex-1 px-3 py-2 text-sm rounded-md bg-black/70 
              border border-yellow-700/40 text-gray-100
              focus:outline-none focus:ring-1
              focus:ring-yellow-500 placeholder-gray-500
            "
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || input.trim().length === 0}
            className="
              px-4 py-2 text-sm font-medium rounded-md
              bg-yellow-500 hover:bg-yellow-600
              text-black transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
