import { useEffect, useMemo, useRef, useState } from 'react'

type Theme = 'light' | 'dark'

function getInitialNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function countWords(text: string): number {
  const cleaned = text.trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).filter(Boolean).length
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export default function App() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const activeSpeechBaseOffsetRef = useRef<number>(0)
  const priorSelectionRef = useRef<{ start: number; end: number } | null>(null)

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  const [text, setText] = useState<string>('')
  const [rate, setRate] = useState<number>(() => getInitialNumber('rate', 1))
  const [pitch, setPitch] = useState<number>(() => getInitialNumber('pitch', 1))

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => localStorage.getItem('voiceId') ?? '')
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)

  const synthAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem('rate', String(rate))
  }, [rate])

  useEffect(() => {
    localStorage.setItem('pitch', String(pitch))
  }, [pitch])

  useEffect(() => {
    if (!synthAvailable) return

    const synth = window.speechSynthesis

    const loadVoices = () => {
      const next = synth.getVoices()
      setVoices(next)

      // If we don't have a saved voice yet, pick a sensible default.
      if (!selectedVoiceId && next.length > 0) {
        const english = next.find((v) => v.lang?.toLowerCase().startsWith('en'))
        const fallback = english ?? next[0]
        const id = fallback.voiceURI || fallback.name
        setSelectedVoiceId(id)
        localStorage.setItem('voiceId', id)
      }
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      synth.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synthAvailable])

  useEffect(() => {
    localStorage.setItem('voiceId', selectedVoiceId)
  }, [selectedVoiceId])

  const selectedVoice = useMemo(() => {
    if (!selectedVoiceId) return undefined
    return voices.find((v) => (v.voiceURI || v.name) === selectedVoiceId)
  }, [selectedVoiceId, voices])

  const stats = useMemo(() => {
    const words = countWords(text)
    const characters = text.length
    const minutes = words === 0 ? 0 : Math.max(0.1, words / 200)
    return { words, characters, minutes }
  }, [text])

  const getSpeechPayload = (): { payload: string; baseOffset: number } => {
    const el = textareaRef.current
    if (!el) return { payload: text, baseOffset: 0 }

    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const selectedRaw = start !== end ? el.value.slice(start, end) : ''

    if (selectedRaw.trim().length > 0) {
      return { payload: selectedRaw, baseOffset: start }
    }

    return { payload: text, baseOffset: 0 }
  }

  const getWordRangeFromIndex = (fullText: string, index: number): { start: number; end: number } | null => {
    if (!fullText) return null
    if (index < 0) return null
    if (index >= fullText.length) return null

    let start = index
    while (start < fullText.length && /\s/.test(fullText[start])) start += 1
    if (start >= fullText.length) return null

    let end = start
    while (end < fullText.length && !/\s/.test(fullText[end])) end += 1

    return { start, end }
  }

  const stop = () => {
    if (!synthAvailable) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)

    const el = textareaRef.current
    const prior = priorSelectionRef.current
    if (el && prior) {
      // Restore whatever the user had selected before playback started.
      el.setSelectionRange(prior.start, prior.end)
    }
  }

  const speak = () => {
    if (!synthAvailable) return

    if (isSpeaking) {
      stop()
      return
    }

    const { payload, baseOffset } = getSpeechPayload()
    if (!payload || payload.trim().length === 0) return

    const synth = window.speechSynthesis

    // Reset any previous playback before starting a new one.
    synth.cancel()

    activeSpeechBaseOffsetRef.current = baseOffset

    const el = textareaRef.current
    if (el) {
      priorSelectionRef.current = {
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
      }

      // Keep the textarea focused during playback so selection updates are visible
      // and the internal textarea scroll follows the moving selection.
      el.focus()
      el.setSelectionRange(baseOffset, baseOffset)
    } else {
      priorSelectionRef.current = null
    }

    const utterance = new SpeechSynthesisUtterance(payload)
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.rate = rate
    utterance.pitch = pitch

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      const input = textareaRef.current
      const prior = priorSelectionRef.current
      if (input && prior) input.setSelectionRange(prior.start, prior.end)
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      const input = textareaRef.current
      const prior = priorSelectionRef.current
      if (input && prior) input.setSelectionRange(prior.start, prior.end)
    }

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      // Many browsers emit word boundaries; fall back gracefully if they don't.
      if (typeof e.charIndex !== 'number') return

      const base = activeSpeechBaseOffsetRef.current
      const globalIndex = base + e.charIndex
      const range = getWordRangeFromIndex(text, globalIndex)
      if (!range) return

      const input = textareaRef.current
      if (!input) return

      // Selecting highlights the current word inside the textarea.
      requestAnimationFrame(() => {
        input.setSelectionRange(range.start, range.end)
      })
    }

    synth.speak(utterance)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Text to Speech</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Web Speech API + text tools</p>
          </div>

          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Text</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Select a portion to speak just that selection.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  onClick={speak}
                  disabled={!synthAvailable}
                >
                  {isSpeaking ? 'Stop' : 'Speak'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={stop}
                  disabled={!synthAvailable}
                >
                  Cancel
                </button>
              </div>
            </div>

            {!synthAvailable ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Speech synthesis isn’t available in this browser.
              </p>
            ) : null}

            <textarea
              ref={textareaRef}
              className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-700"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste text here…"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {stats.words} words · {stats.characters} chars · {stats.minutes.toFixed(1)} min read
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={() => setText((t) => t.toUpperCase())}
                >
                  UPPERCASE
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={() => setText((t) => t.toLowerCase())}
                >
                  lowercase
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={() => setText((t) => toTitleCase(t))}
                >
                  Title Case
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={() => setText((t) => normalizeSpaces(t))}
                >
                  Remove extra spaces
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={copyToClipboard}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  onClick={() => setText('')}
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-base font-semibold">Speech settings</h2>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Voice</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-700"
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  disabled={!synthAvailable}
                >
                  {voices.length === 0 ? <option value="">Loading voices…</option> : null}
                  {voices.map((v) => {
                    const id = v.voiceURI || v.name
                    const label = `${v.name} (${v.lang})`
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center justify-between text-sm font-medium">
                  <span>Rate</span>
                  <span className="text-slate-600 dark:text-slate-400">{rate.toFixed(1)}</span>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  disabled={!synthAvailable}
                />
              </label>

              <label className="grid gap-2">
                <span className="flex items-center justify-between text-sm font-medium">
                  <span>Pitch</span>
                  <span className="text-slate-600 dark:text-slate-400">{pitch.toFixed(1)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  disabled={!synthAvailable}
                />
              </label>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
