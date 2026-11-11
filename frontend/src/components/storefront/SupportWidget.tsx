import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Headphones,
  X,
  Send,
  Gift,
  Truck,
  Tag,
  MessageSquare,
  Sparkles,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useShopEngagement } from '@/context/ShopEngagementContext'

interface ChatMsg {
  sender: 'bot' | 'user'
  text: string
  time: string
}

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const { loyaltyPoints, recentOrders, t } = useShopEngagement()

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'bot',
      text: '👋 សួស្តី! Welcome to TYUSHOP 24/7 Supporter! Ask me about Loyalty Points (+5 pts/buy, 100 pts = FREE item under $20–$30), Discount Coupons, or Real-Time GPS Delivery Tracking!',
      time: 'Just now',
    },
  ])

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim()
    if (!trimmed) return

    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setInput('')
    setSending(true)

    try {
      const res = await api.post<any>('/support/chat', { message: trimmed })
      const reply =
        res?.data?.reply ||
        'Every order earns +5 Loyalty Points! At 100 Points, exchange for any product under $20–$30 FREE. Use coupon WELCOME10 or MEGA20 at checkout!'
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '🎁 Earn +5 Points per order! Collect 100 Points to redeem any item under $20–$30 FREE in the Cart. Use promo code WELCOME10 (10% OFF) or KHQR5 ($5 OFF)!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-1.5rem)] max-w-96 rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  24/7 Live Supporter
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-white/80">
                  Your Balance: <strong>{loyaltyPoints} pts</strong> (100 pts = Free Item ≤ $30)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Close Supporter Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Pills */}
          <div className="px-3 py-2 bg-muted/50 border-b flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => sendQuestion('How do 100 Loyalty Points work for a free item?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 flex items-center gap-1 transition-colors"
            >
              <Gift className="w-3 h-3" /> 100 Pts = Free Item
            </button>
            <button
              type="button"
              onClick={() => sendQuestion('What discount coupon codes are available?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 flex items-center gap-1 transition-colors"
            >
              <Tag className="w-3 h-3" /> Discount Codes
            </button>
            <Link
              to={recentOrders[0] ? `/track-order/${recentOrders[0]}` : '/track-order'}
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1 transition-colors"
            >
              <Truck className="w-3 h-3" /> Live GPS Track
            </Link>
          </div>

          {/* Messages */}
          <div className="p-3 h-64 overflow-y-auto space-y-3 text-xs bg-background/60">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-muted text-foreground border rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {sending && (
              <div className="text-[11px] text-muted-foreground italic px-2">
                Supporter is typing...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendQuestion(input)
            }}
            className="p-2.5 border-t bg-card flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about points, discounts, delivery..."
              className="flex-1 text-xs px-3 py-2 rounded-full border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button type="submit" size="icon" className="h-8 w-8 rounded-full shrink-0" disabled={sending}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>

          {/* Footer Links */}
          <div className="px-3 py-1.5 bg-muted/40 border-t flex items-center justify-between text-[10px] text-muted-foreground">
            <Link to="/contact" onClick={() => setIsOpen(false)} className="hover:text-primary font-medium flex items-center gap-1">
              <PhoneCall className="w-3 h-3" /> Open Support Ticket
            </Link>
            <span>Hotline: 016 555 637</span>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white p-2.5 sm:px-4 sm:py-3 shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        aria-label="24/7 Live Supporter"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-600" />
        </div>
        <span className="text-xs font-bold tracking-wide hidden sm:inline">{t('24/7 Supporter', 'ជំនួយ 24/7')}</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
      </button>
    </div>
  )
}

