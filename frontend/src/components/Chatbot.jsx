import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Activity, Mic, Square, Volume2 } from "lucide-react";

// ============================================================
// MedAI Voice Chatbot — Standalone Reusable Widget
// Voice-first: STT via Web Speech API, TTS via speechSynthesis
// Hackathon-safe: isSending guard, loading bubble, localized fallbacks
// ============================================================

const LANG_CODES = {
  en: "en-US",
  hi: "hi-IN",
  mr: "mr-IN",
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I am MedAI. I can provide medical guidance in English, Hindi, or Marathi. How can I help?",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);

  // Cache voices as soon as the browser loads them (Chrome is async)
  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices(); // try immediately (Firefox has them sync)
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── TTS ──────────────────────────────────────────────────
  const speak = (text, lang = language) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bcp47 = LANG_CODES[lang] || "en-US";
    utterance.lang = bcp47;
    utterance.rate = 0.92;

    // Use cached voices (voicesRef) — avoids Chrome's async empty-list bug
    const voices = voicesRef.current;
    const match =
      voices.find((v) => v.lang === bcp47) ||
      voices.find((v) => v.lang.startsWith(bcp47.split("-")[0]));
    if (match) utterance.voice = match;

    window.speechSynthesis.speak(utterance);
  };

  // ─── STT ──────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please type your query.");
      return;
    }
    if (isSending) return; // don't interrupt an in-flight request

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = LANG_CODES[language] || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript, language); // pass current language at call time
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ─── SEND ─────────────────────────────────────────────────
  const handleSend = async (forcedInput = null, forcedLang = null) => {
    const textToSend = typeof forcedInput === "string" ? forcedInput : input;
    const currentLang = forcedLang || language; // capture language at send time
    if (!textToSend.trim() || isSending) return;

    setMessages((prev) => [...prev, { text: textToSend, sender: "user" }]);
    setInput("");
    setIsSending(true);

    // Show "thinking" bubble
    setMessages((prev) => [...prev, { text: "__loading__", sender: "bot" }]);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, language: currentLang }),
      });

      if (!response.ok) throw new Error("Backend offline");

      const data = await response.json();
      const botText = data.chat_response || "I could not process that. Please try again.";

      // Replace the loading bubble with the real response
      setMessages((prev) => [
        ...prev.filter((m) => m.text !== "__loading__"),
        { text: botText, sender: "bot" },
      ]);

      speak(botText, currentLang); // pass language explicitly — no stale closure
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.text !== "__loading__"),
        {
          text: "Connection error. Please ensure the Flask server is running on port 5000.",
          sender: "bot",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────
  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4" style={{ zIndex: 9999 }}>
      {isOpen && (
        <div className="w-[22rem] md:w-[32rem] bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg">
                <Activity size={16} />
              </div>
              <span className="text-xl tracking-tight font-semibold">MedAI Assistant</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-800 text-[10px] font-black uppercase rounded-lg px-2 py-1 outline-none border-none text-blue-400 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                {m.text === "__loading__" ? (
                  /* Typing indicator */
                  <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm flex items-end gap-2 ${
                      m.sender === "user"
                        ? "bg-blue-600 text-white shadow-blue-100"
                        : "bg-white text-slate-700 border border-slate-100"
                    }`}
                  >
                    <span>{m.text}</span>
                    {m.sender === "bot" && (
                      <button
                        onClick={() => speak(m.text)}
                        title="Replay"
                        className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <Volume2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* Input row */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
            {/* Mic button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isSending}
              title={isListening ? "Stop listening" : "Speak"}
              className={`p-2.5 rounded-xl transition-all disabled:opacity-40 ${
                isListening
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isSending}
              placeholder={isListening ? "Listening…" : "Type or speak…"}
              className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
            />

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-md disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 text-white p-5 rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-sm tracking-tight">AI Guidance</span>
          </>
        )}
      </button>
    </div>
  );
};

// ⚠️ THIS LINE IS THE MOST IMPORTANT:
export default Chatbot;