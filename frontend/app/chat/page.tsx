'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { energyApi } from '@/services/api';
import { ChatMessage } from '@/types';
import ReactMarkdown from 'react-markdown';


export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Hello! I am EnergyBoss. I can help you understand your household energy usage. Ask me anything!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => Math.random().toString(36).substring(7));
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await energyApi.queryChat(input, sessionId);
            const botMessage: ChatMessage = { role: 'assistant', content: response.answer };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'I encountered an error while processing your request. Please make sure the backend is running!'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: 'Hello! I am EnergyBoss. I can help you understand your household energy usage. Ask me anything!' }]);
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)] flex flex-col bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            {/* Chat Header */}
            <header className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-blue-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl text-white">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Energy Assistant</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Online & Ready</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Clear Conversation"
                >
                    <Trash2 size={20} />
                </button>
            </header>

            {/* Messages Window */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`p-2 rounded-xl flex-shrink-0 h-fit ${msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                                </div>
                                <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-sm prose-sm max-w-none ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200 prose-invert'
                                    : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                                    }`}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-[1.5rem] rounded-tl-none shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <footer className="p-4 md:p-6 bg-slate-50/50 border-t border-slate-50">
                <div className="relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        className="w-full pl-4 md:pl-6 pr-12 md:pr-14 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-slate-800 shadow-inner text-sm md:text-base"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-1.5 md:right-2 top-1.5 md:top-2 p-2 md:p-2.5 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 group-focus-within:scale-105 active:scale-95"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="mt-2 md:mt-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    EnergyBoss uses Large Language Models to interpret sensor data
                </p>
            </footer>
        </div>
    );
}
