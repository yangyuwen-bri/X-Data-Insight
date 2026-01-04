"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, MessageSquare, Loader2, User, Trash2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { analyzeData } from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDatasetStore } from '@/app/store/useDatasetStore'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    isError?: boolean
}

export function FloatingDataCopilot() {
    const [isOpen, setIsOpen] = useState(false)
    const [sessionId, setSessionId] = useState(Date.now().toString())
    const { datasetId } = useDatasetStore()
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'assistant', content: 'Hi! I\'m your Data AI Copilot. Ask me anything about your dataset! 🤖' }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const res = await analyzeData(userMsg.content, sessionId, datasetId || undefined)
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.answer
            }
            setMessages(prev => [...prev, botMsg])
        } catch (error) {
            console.error(error)
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error analyzing the data. Please try again.'
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    const handleClearSession = () => {
        setMessages([{ id: 'welcome', role: 'assistant', content: 'Session cleared. Starting a fresh conversation! 🤖' }])
        setSessionId(Date.now().toString())
    }

    return (
        <div className="relative z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute top-16 right-0 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-zinc-200 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-violet-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg overflow-hidden h-9 w-9">
                                <img src="/sheep_agent.png" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Data Analyst AI</h3>
                                <p className="text-xs text-violet-200">Powered by PandasAI</p>
                            </div>
                        </div>
                        <button onClick={handleClearSession} className="hover:bg-white/20 p-1 rounded transition-colors mr-1" title="Clear Chat">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    msg.role === 'user' ? "bg-zinc-200" : "bg-violet-100 text-violet-600"
                                )}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user' ? "bg-violet-600 text-white rounded-tr-none" : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none",
                                    msg.isError && "bg-red-50 text-red-600 border-red-100"
                                )}>
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 break-words">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                img: ({ node, ...props }) => (
                                                    <img {...props} className="rounded-lg shadow-md max-w-full h-auto border border-zinc-200 my-2" />
                                                ),
                                                table: ({ node, ...props }) => (
                                                    <div className="overflow-x-auto my-2 rounded-lg border border-zinc-200">
                                                        <table {...props} className="w-full text-left text-sm" />
                                                    </div>
                                                ),
                                                thead: ({ node, ...props }) => <thead {...props} className="bg-zinc-50 text-zinc-600 font-medium" />,
                                                th: ({ node, ...props }) => <th {...props} className="px-3 py-2 border-b border-zinc-200" />,
                                                td: ({ node, ...props }) => <td {...props} className="px-3 py-2 border-b border-zinc-100" />,
                                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline" />,
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 mr-auto">
                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-white border border-zinc-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                    <span className="text-xs text-zinc-400">Analyzing dataset...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-zinc-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex items-center gap-2 relative"
                        >
                            <input
                                className="flex-1 bg-zinc-100 hover:bg-zinc-50 focus:bg-white border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none transition-all placeholder:text-zinc-400"
                                placeholder="e.g. key insights, top users..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                <Send size={16} />
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "pointer-events-auto h-12 w-12 rounded-full bg-white hover:bg-zinc-50 border-2 border-violet-100 text-violet-600 shadow-xl shadow-violet-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group overflow-hidden",
                    isOpen && "rotate-90 ring-4 ring-violet-50"
                )}
            >
                {isOpen ? <X size={20} /> : (
                    <img src="/sheep_agent.png" alt="AI Agent" className="w-full h-full object-cover" />
                )}
            </button>
        </div>
    )
}
