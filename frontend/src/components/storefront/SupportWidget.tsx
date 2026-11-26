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
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-40 flex w-[calc(100vw-1.5rem)] flex-col items-end sm:right-5 md:bottom-5 md:w-auto">
      {isOpen && (
        <section className="mb-3 flex max-h-[calc(100dvh-5.5rem)] min-h-0 w-full max-w-[25rem] flex-col overflow-hidden rounded-3xl border border-primary/15 bg-card text-card-foreground shadow-2xl shadow-primary/10 animate-in fade-in slide-in-from-bottom-4" aria-label="TYUSHOP AI support">
          <header className="shrink-0 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 px-4 py-3.5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    <span className="truncate">TYUSHOP AI Support</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,.2)]" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-white/85">
                    <span>{language === 'KM' ? `ពិន្ទុរង្វាន់៖ ${loyaltyPoints}` : `Rewards: ${loyaltyPoints} pts`}</span>
                    {canReadAloud && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-white/90">
                        <Volume2 className="h-3 w-3" />
                        {language === 'KM' ? 'អានស្វ័យប្រវត្តិ' : 'Auto read'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/15" aria-label="Close AI support">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b bg-muted/50 px-3 py-2">
            <button type="button" onClick={() => void sendQuestion(quickQuestions[0])} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-300">
              <PackageSearch className="h-3 w-3" /> {language === 'KM' ? 'តាមដានការបញ្ជាទិញ' : 'Track order'}
            </button>
            <button type="button" onClick={() => void sendQuestion(quickQuestions[1])} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-500/25 dark:text-blue-300">
              <Truck className="h-3 w-3" /> {language === 'KM' ? 'ការដឹកជញ្ជូន' : 'Delivery help'}
            </button>
            <button type="button" onClick={() => void sendQuestion(quickQuestions[2])} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-1 text-[10px] font-bold text-purple-700 transition-colors hover:bg-purple-500/25 dark:text-purple-300">
              <Tag className="h-3 w-3" /> {language === 'KM' ? 'អ្នកលក់' : 'Seller help'}
            </button>
          </div>

          <div className="min-h-[10.5rem] max-h-[min(22rem,calc(100dvh-18rem))] flex-1 space-y-3 overflow-y-auto bg-background/70 p-3 text-[0.78rem]">
            {messages.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${message.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-muted/80 text-foreground'}`}>
                  {message.text}
                </div>
                {message.role === 'assistant' && canReadAloud && (
                  <button
                    type="button"
                    onClick={() => void readMessageAloud(message)}
                    className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${speakingMessageId === message.id ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-primary'}`}
                    aria-label={speakingMessageId === message.id ? (language === 'KM' ? 'បញ្ឈប់ការអាន' : 'Stop reading') : (language === 'KM' ? 'អានជាសំឡេង' : 'Read aloud')}
                    title={speakingMessageId === message.id ? (language === 'KM' ? 'បញ្ឈប់ការអាន' : 'Stop reading') : (language === 'KM' ? 'អានជាសំឡេង' : 'Read aloud')}
                  >
                    {speakingMessageId === message.id ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    {speakingMessageId === message.id ? (language === 'KM' ? 'បញ្ឈប់' : 'Stop') : (language === 'KM' ? 'អានជាសំឡេង' : 'Read aloud')}
                  </button>
                )}
                {message.action && message.role === 'assistant' && (
                  <Link to={message.action.to} onClick={() => setIsOpen(false)} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/15 hover:underline">
                    {message.action.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 px-2 text-[11px] italic text-muted-foreground"><Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> {language === 'KM' ? 'កំពុងគិត…' : 'Thinking…'}</div>}
          </div>

          {error && <p className="border-t bg-amber-500/10 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-300">{error}</p>}
          {speechError && <p className="border-t bg-amber-500/10 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-300">{speechError}</p>}

          <form onSubmit={(event) => { event.preventDefault(); void sendQuestion(input) }} className="flex shrink-0 items-center gap-2 border-t bg-card p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={language === 'KM' ? 'សួរ TYUSHOP AI…' : 'Ask TYUSHOP anything…'} className="h-10 min-w-0 flex-1 rounded-full border bg-background px-3 text-xs text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Ask TYUSHOP AI" />
            <button type="submit" disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send question">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="flex shrink-0 items-center justify-between border-t bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
            <Link to="/contact" onClick={() => setIsOpen(false)} className="inline-flex items-center gap-1 font-semibold hover:text-primary"><Headphones className="h-3 w-3" /> {language === 'KM' ? 'ទាក់ទង Support' : 'Contact support'}</Link>
            <span>016 555 637</span>
          </div>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-blue-600 to-indigo-600 p-2.5 text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl sm:px-4 sm:py-3" aria-expanded={isOpen} aria-label={isOpen ? 'Close TYUSHOP AI Support' : 'Open TYUSHOP AI Support'}>
        <span className="relative"><MessageSquare className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-600" /></span>
        <span className="hidden text-xs font-black tracking-wide sm:inline">{t('AI Support', 'ជំនួយ AI')}</span>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-amber-300" />}
      </button>
    </div>
  )
}
