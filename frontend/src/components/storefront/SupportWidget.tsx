import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Headphones,
  MessageSquare,
  PackageSearch,
  Send,
  Sparkles,
  Tag,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { authService } from '@/services/auth.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'

type ChatRole = 'assistant' | 'user'

interface ChatAction {
  label: string
  to: string
}

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  language?: 'EN' | 'KM'
  action?: ChatAction | null
}

const makeMessageId = (role: ChatRole) => `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const SILENT_AUDIO_DATA_URL = 'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

const actionForQuestion = (question: string, isAuthenticated: boolean): ChatAction | null => {
  const text = question.toLowerCase()
  if (/(track|delivery|courier|shipping|where.*order|gps|ដឹក|តាមដាន)/u.test(text)) {
    return { label: 'Track delivery', to: '/track-order' }
  }
  if (/(order|purchase|buy|checkout|cart|ទិញ|បញ្ជាទិញ|កន្ត្រក)/u.test(text)) {
    return { label: 'Open shopping cart', to: '/cart' }
  }
  if (/(seller|sell|vendor|store|merchant|អ្នកលក់|ហាង)/u.test(text)) {
    return { label: 'Seller information', to: isAuthenticated && authService.isSeller() ? '/dashboard/seller' : '/sell' }
  }
  if (/(coupon|discount|promo|code|បញ្ចុះ|កូដ)/u.test(text)) {
    return { label: 'Browse products', to: '/products' }
  }
  if (/(product|item|catalog|price|stock|find|search|ផលិតផល|តម្លៃ|ស្តុក)/u.test(text)) {
    return { label: 'Browse all products', to: '/products' }
  }
  if (/(account|profile|login|sign in|គណនី|ចូល)/u.test(text)) {
    return { label: isAuthenticated ? 'Open my profile' : 'Sign in', to: isAuthenticated ? '/profile' : '/login' }
  }
  if (/(support|contact|refund|return|help|ជំនួយ|ប្តូរ|សងប្រាក់)/u.test(text)) {
    return { label: 'Contact support', to: '/contact' }
  }
  return null
}

const welcomeMessage = (language: 'EN' | 'KM') => language === 'KM'
  ? 'សួស្តី! ខ្ញុំជា TYUSHOP AI Support។ ខ្ញុំអាចជួយអំពីផលិតផល ការបញ្ជាទិញ ការដឹកជញ្ជូន ការទូទាត់ គូប៉ុង ហាងអ្នកលក់ និងគណនី។'
  : 'Hi! I’m TYUSHOP AI Support. I can help with products, orders, delivery, payments, coupons, seller stores, and accounts.'

export function SupportWidget() {
  const { language, loyaltyPoints, t } = useShopEngagement()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [speechError, setSpeechError] = useState('')
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const speakingMessageIdRef = useRef<string | null>(null)
  const speechRequestIdRef = useRef(0)
  const autoReadMessageIdRef = useRef<string | null>(null)
  const speechAudioPrimedRef = useRef(false)
  const sendingRef = useRef(false)
  const speechAudioRef = useRef<HTMLAudioElement | null>(null)
  const speechAudioUrlRef = useRef<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
    id: 'welcome',
    role: 'assistant',
    text: welcomeMessage(language),
    language,
  }])

  const isAuthenticated = authService.isAuthenticated()
  const apiLanguage = language === 'KM' ? 'km' : 'en'
  const canReadAloud = typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window)
  const quickQuestions = useMemo(() => language === 'KM'
    ? ['តើខ្ញុំតាមដានការបញ្ជាទិញដោយរបៀបណា?', 'តើការទូទាត់ KHQR ដំណើរការដូចម្តេច?', 'តើខ្ញុំអាចលក់ទំនិញលើ TYUSHOP បានទេ?']
    : ['How do I track my order?', 'How does KHQR payment work?', 'How can I sell on TYUSHOP?'], [language])

  const clearSpeechAudio = () => {
    const audio = speechAudioRef.current
    audio?.pause()
    audio?.removeAttribute('src')
    audio?.load()
    if (audio) {
      audio.muted = false
      audio.volume = 1
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current)
      speechAudioUrlRef.current = null
    }
  }

  const primeSpeechPlayback = () => {
    if (typeof window === 'undefined' || !('Audio' in window) || speechAudioPrimedRef.current) return

    const audio = speechAudioRef.current || new Audio()
    audio.preload = 'auto'
    audio.setAttribute('playsinline', 'true')
    audio.src = SILENT_AUDIO_DATA_URL
    audio.muted = true
    audio.volume = 0
    speechAudioRef.current = audio
    speechAudioPrimedRef.current = true

    void audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.muted = false
      audio.volume = 1
    }).catch(() => {
      // Browsers that do not require an unlock will still play the real audio.
      speechAudioPrimedRef.current = false
    })
  }

  const stopReading = () => {
    speechRequestIdRef.current += 1
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    clearSpeechAudio()
    speakingMessageIdRef.current = null
    setSpeakingMessageId(null)
  }

  const loadSpeechVoices = (waitForVoices = true): Promise<SpeechSynthesisVoice[]> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve([])
    const availableVoices = window.speechSynthesis.getVoices()
    if (availableVoices.length) return Promise.resolve(availableVoices)
    if (!waitForVoices) return Promise.resolve([])

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.speechSynthesis.removeEventListener('voiceschanged', finish)
        resolve(window.speechSynthesis.getVoices())
      }
      window.speechSynthesis.addEventListener('voiceschanged', finish)
      window.setTimeout(finish, 1200)
    })
  }

  const readWithServerAudio = async (message: ChatMessage, requestId: number) => {
    const response = await api.post<any>('/support/speech', {
      text: message.text,
      language: message.language === 'KM' ? 'km' : 'en',
    }, { preferPublicApi: true, timeout: 30000 })
    if (speechRequestIdRef.current !== requestId) return
    const data = response?.data || response
    if (!data?.audioBase64) throw new Error('No speech audio was returned.')

    const binary = window.atob(data.audioBase64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const audioUrl = URL.createObjectURL(new Blob([bytes], { type: data.mimeType || 'audio/mpeg' }))
    const audio = speechAudioRef.current || new Audio()
    audio.preload = 'auto'
    audio.setAttribute('playsinline', 'true')
    audio.muted = false
    audio.volume = 1
    audio.src = audioUrl
    audio.load()
    speechAudioRef.current = audio
    speechAudioUrlRef.current = audioUrl
    speakingMessageIdRef.current = message.id
    setSpeakingMessageId(message.id)

    const finish = () => {
      if (speechAudioRef.current !== audio) return
      if (speakingMessageIdRef.current === message.id) {
        clearSpeechAudio()
        speakingMessageIdRef.current = null
        setSpeakingMessageId(null)
      }
    }
    audio.onended = finish
    audio.onerror = finish
    try {
      await audio.play()
    } catch (playError) {
      finish()
      throw playError
    }
  }

  const readMessageAloud = async (message: ChatMessage) => {
    if (!canReadAloud) return
    primeSpeechPlayback()
    if (speakingMessageIdRef.current === message.id) {
      stopReading()
      return
    }

    stopReading()
    const requestId = speechRequestIdRef.current
    setSpeechError('')
    const isKhmer = (message.language || language) === 'KM'
    // Khmer normally has no local Chrome voice, so do not wait 1.2s for the
    // voiceschanged event before starting the server TTS request.
    const voices = await loadSpeechVoices(!isKhmer)
    if (speechRequestIdRef.current !== requestId) return
    const preferredVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(isKhmer ? 'km' : 'en'))
    const canUseNativeSpeech = typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && 'SpeechSynthesisUtterance' in window

    // Chrome/Windows often has no Khmer voice. Prefer the backend TTS voice in
    // that case, and use it as a fallback whenever native speech is missing.
    if ((isKhmer && !preferredVoice) || !canUseNativeSpeech) {
      try {
        if (speechRequestIdRef.current !== requestId) return
        await readWithServerAudio(message, requestId)
        return
      } catch {
        if (speechRequestIdRef.current !== requestId) return
        // If the server voice is unavailable but the browser can speak, still
        // attempt the answer with the requested locale instead of failing
        // silently. The manual speaker button remains available for replay.
        if (!canUseNativeSpeech) {
          setSpeechError(isKhmer
            ? 'មិនអាចអានសំឡេងខ្មែរបានទេ។ សូមចុចប៊ូតុងសំឡេង ដើម្បីសាកល្បងម្តងទៀត។'
            : 'Audio playback is unavailable. Please use the speaker button to try again.')
          return
        }
      }
    }

    const utterance = new SpeechSynthesisUtterance(message.text)
    const speechLocale = isKhmer ? 'km-KH' : 'en-US'

    utterance.lang = speechLocale
    utterance.rate = speechLocale === 'km-KH' ? 0.88 : 1
    if (preferredVoice) utterance.voice = preferredVoice

    speakingMessageIdRef.current = message.id
    setSpeakingMessageId(message.id)
    utterance.onend = () => {
      if (speakingMessageIdRef.current === message.id) {
        speakingMessageIdRef.current = null
        setSpeakingMessageId(null)
      }
    }
    utterance.onerror = utterance.onend
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'assistant' || latestMessage.id === 'welcome') return
    if (autoReadMessageIdRef.current === latestMessage.id) return

    // The rendered assistant message is the one source of truth for automatic
    // playback. This prevents a response from being spoken twice when React
    // updates the chat and keeps error responses readable too.
    autoReadMessageIdRef.current = latestMessage.id
    void readMessageAloud(latestMessage)
  }, [messages])

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    clearSpeechAudio()
  }, [canReadAloud])

  const toggleWidget = () => {
    setIsOpen((open) => {
      if (open) stopReading()
      return !open
    })
  }

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim()
    if (!trimmed || sending || sendingRef.current) return

    // Unlock the shared player during the submit click. The AI response and
    // Khmer TTS arrive asynchronously, after browser autoplay activation ends.
    primeSpeechPlayback()

    const userMessage: ChatMessage = { id: makeMessageId('user'), role: 'user', text: trimmed, language }
    const action = actionForQuestion(trimmed, isAuthenticated)
    const history = messages
      .filter((message) => message.id !== 'welcome' && message.text.trim())
      .slice(-8)
      .map(({ role, text }) => ({ role, text: text.slice(0, 1000) }))

    setMessages((current) => [...current, userMessage])
    setInput('')
    setError('')
    setSending(true)
    sendingRef.current = true
    setIsOpen(true)

    try {
      const response = await api.post<any>('/support/chat', {
        message: trimmed,
        language: apiLanguage,
        history,
      }, { preferPublicApi: true, timeout: 40000 })
      const data = response?.data || response
      const answer = data?.answer || data?.reply || 'I’m sorry, I could not prepare an answer right now.'
      const assistantMessage: ChatMessage = {
        id: makeMessageId('assistant'),
        role: 'assistant',
        text: answer,
        language,
        action,
      }
      setMessages((current) => [...current, assistantMessage])
    } catch (requestError: any) {
      setError(requestError?.message || t('AI support is temporarily unavailable.', 'ជំនួយ AI មិនអាចប្រើបានជាបណ្តោះអាសន្នទេ។'))
      const errorMessage: ChatMessage = {
        id: makeMessageId('assistant'),
        role: 'assistant',
        text: language === 'KM'
          ? 'សូមសាកល្បងម្តងទៀត ឬទាក់ទងក្រុម Support តាមទំព័រ Contact & Support។'
          : 'Please try again, or contact our support team from the Contact & Support page.',
        language,
        action: { label: 'Contact support', to: '/contact' },
      }
      setMessages((current) => [...current, errorMessage])
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:px-0 md:bottom-5">
      <div className="pointer-events-auto flex w-full max-w-[28rem] flex-col items-end sm:w-[min(28rem,calc(100vw-2rem))]">
        {isOpen && (
          <section className="mb-3 flex h-[min(72dvh,44rem)] max-h-[calc(100dvh-6rem)] min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card/95 text-card-foreground shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:h-[min(70dvh,44rem)]" aria-label="TYUSHOP AI support">
            <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-700 px-4 pb-4 pt-4 text-white sm:px-5">
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/18 shadow-inner ring-1 ring-white/25 backdrop-blur-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-base font-black tracking-tight">
                      <span className="truncate">TYUSHOP AI Support</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.2)]" />
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/75">
                      {language === 'KM' ? 'ជំនួយភ្លាមៗសម្រាប់ការទិញរបស់អ្នក' : 'Helpful answers for your shopping journey'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={toggleWidget} className="shrink-0 rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="Close AI support">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-white/90 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {language === 'KM' ? 'កំពុងដំណើរការ' : 'Online now'}
                </span>
                {canReadAloud && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-white/90 backdrop-blur-sm">
                    <Volume2 className="h-3.5 w-3.5" />
                    {language === 'KM' ? 'អានស្វ័យប្រវត្តិ' : 'Auto read'}
                  </span>
                )}
                <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1.5 text-white/75">
                  {language === 'KM' ? `ពិន្ទុ ${loyaltyPoints}` : `${loyaltyPoints} reward pts`}
                </span>
              </div>
            </header>

            <div className="shrink-0 border-b border-border/70 bg-card px-3 py-3 sm:px-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                {language === 'KM' ? 'សំណួរដែលគេសួរញឹកញាប់' : 'Quick help'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void sendQuestion(quickQuestions[0])} className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-emerald-500/15 bg-emerald-500/8 px-2 py-2.5 text-center text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-300">
                  <PackageSearch className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="line-clamp-2 leading-4">{language === 'KM' ? 'តាមដានការបញ្ជាទិញ' : 'Track order'}</span>
                </button>
                <button type="button" onClick={() => void sendQuestion(quickQuestions[1])} className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-blue-500/15 bg-blue-500/8 px-2 py-2.5 text-center text-xs font-bold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-500/30 hover:bg-blue-500/15 dark:text-blue-300">
                  <Truck className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="line-clamp-2 leading-4">{language === 'KM' ? 'ការដឹកជញ្ជូន' : 'Delivery help'}</span>
                </button>
                <button type="button" onClick={() => void sendQuestion(quickQuestions[2])} className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-purple-500/15 bg-purple-500/8 px-2 py-2.5 text-center text-xs font-bold text-purple-700 transition hover:-translate-y-0.5 hover:border-purple-500/30 hover:bg-purple-500/15 dark:text-purple-300">
                  <Tag className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="line-clamp-2 leading-4">{language === 'KM' ? 'ជំនួយអ្នកលក់' : 'Seller help'}</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-muted/20 to-background p-3.5 sm:p-4">
              {messages.map((message) => {
                const isUser = message.role === 'user'
                const isSpeaking = speakingMessageId === message.id
                return (
                  <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <span className={`mb-1 px-1 text-[11px] font-bold ${isUser ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isUser ? (language === 'KM' ? 'អ្នក' : 'You') : 'TYUSHOP AI'}
                    </span>
                    <div className={`max-w-[94%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[88%] ${isUser ? 'rounded-br-md bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-primary/15' : 'rounded-bl-md border border-border/80 bg-card text-foreground'}`}>
                      {message.text}
                    </div>
                    <div className={`mt-1.5 flex flex-wrap items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && canReadAloud && (
                        <button
                          type="button"
                          onClick={() => void readMessageAloud(message)}
                          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors ${isSpeaking ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-primary'}`}
                          aria-label={isSpeaking ? (language === 'KM' ? 'បញ្ឈប់ការអាន' : 'Stop reading') : (language === 'KM' ? 'អានជាសំឡេង' : 'Read aloud')}
                          title={isSpeaking ? (language === 'KM' ? 'បញ្ឈប់ការអាន' : 'Stop reading') : (language === 'KM' ? 'អានជាសំឡេង' : 'Read aloud')}
                        >
                          {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          {isSpeaking ? (language === 'KM' ? 'បញ្ឈប់' : 'Stop') : (language === 'KM' ? 'អានសំឡេង' : 'Read aloud')}
                        </button>
                      )}
                      {message.action && message.role === 'assistant' && (
                        <Link to={message.action.to} onClick={toggleWidget} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 hover:underline">
                          {message.action.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <span className="flex gap-1" aria-hidden="true"><span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-.1s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" /></span>
                  {language === 'KM' ? 'កំពុងរៀបចំចម្លើយ…' : 'Preparing your answer…'}
                </div>
              )}
            </div>

            {(error || speechError) && (
              <div className="shrink-0 border-t border-amber-500/15 bg-amber-500/10 px-4 py-2.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
                {error || speechError}
              </div>
            )}

            <form onSubmit={(event) => { event.preventDefault(); void sendQuestion(input) }} className="shrink-0 border-t border-border/70 bg-card p-3 sm:p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-inner transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={language === 'KM' ? 'សួរ TYUSHOP AI…' : 'Ask TYUSHOP AI…'} className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" aria-label="Ask TYUSHOP AI" />
                <button type="submit" disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-sm transition hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                {language === 'KM' ? 'សួរអំពីផលិតផល ការបញ្ជាទិញ ការដឹកជញ្ជូន ឬការទូទាត់' : 'Ask about products, orders, delivery, payments, or seller help'}
              </p>
            </form>

            <div className="flex shrink-0 items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <Link to="/contact" onClick={toggleWidget} className="inline-flex min-h-7 items-center gap-1.5 font-semibold transition-colors hover:text-primary"><Headphones className="h-3.5 w-3.5" /> {language === 'KM' ? 'ទាក់ទង Support' : 'Contact support'}</Link>
              <span className="font-medium">016 555 637</span>
            </div>
          </section>
        )}

        <button type="button" onClick={toggleWidget} className="group flex h-14 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-indigo-600 px-4 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-4 focus:ring-primary/25 sm:h-12 sm:rounded-full" aria-expanded={isOpen} aria-label={isOpen ? 'Close TYUSHOP AI Support' : 'Open TYUSHOP AI Support'}>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 sm:h-7 sm:w-7 sm:rounded-full"><MessageSquare className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-indigo-600" /></span>
          <span className="text-sm font-black tracking-tight">{t('AI Support', 'ជំនួយ AI')}</span>
          {isOpen ? <ChevronDown className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" /> : <Sparkles className="h-4 w-4 text-amber-300 transition-transform group-hover:rotate-12" />}
        </button>
      </div>
    </div>
  )
}
