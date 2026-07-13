import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Mic2, Waves, Zap, ExternalLink, ChevronDown, Upload, Loader2, AlertCircle, Send, Sparkles, Copy, Check } from 'lucide-react'
import { supabase } from './lib/supabase'

const GROQ_MODELS = [
  { id: 'qwen/qwen3.6-27b', label: 'Qwen3.6 27B — sharpest reasoning on Groq' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B — biggest open model on Groq' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — solid all-rounder' },
]

const GENRES = ['Pop', 'Hip-Hop', 'Trap', 'Drill', 'Electronic', 'R&B', 'Rock', 'Lo-Fi']

const DEVICE_KEY = 'redemusic_device_id'
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function Panel({ title, subtitle, icon: Icon, open, onToggle, ledColor, children }) {
  return (
    <div className="relative rounded-xl border border-[#33291F] bg-[#1D1815] overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#3a2f24]" />
      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#3a2f24]" />
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${ledColor}`} />
          <Icon size={18} className="text-[#E8412C] shrink-0" />
          <div className="text-left">
            <div className="font-semibold text-[#F5F1E8] text-sm tracking-wide">{title}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#9A9089]">{subtitle}</div>
          </div>
        </div>
        <ChevronDown size={18} className={`text-[#9A9089] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState({ brain: true, vocal: false, engine: false, session: false })
  const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }))

  const [model, setModel] = useState(GROQ_MODELS[0].id)
  const [genres, setGenres] = useState([])
  const toggleGenre = (g) => setGenres((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))

  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey — I'm your AI Producer. Give me a vibe, a topic, or a few bars to build on, and I'll write real lyrics with you. Pick genre tags below if it helps steer things." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const scrollRef = useRef(null)

  const [dnaName, setDnaName] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [is432, setIs432] = useState(false)
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const deviceId = useRef(getDeviceId())

  useEffect(() => {
    (async () => {
      if (supabase) {
        const { data } = await supabase.from('sessions').select('*').eq('user_id', deviceId.current).maybeSingle()
        if (data) {
          if (data.messages?.length) setMessages(data.messages)
          setDnaName(data.dna_model_name || '')
          setModel(data.groq_model || GROQ_MODELS[0].id)
          setIs432(!!data.is_432hz)
          if (data.genres) setGenres(data.genres)
        }
      } else {
        const raw = localStorage.getItem('redemusic_session')
        if (raw) {
          const s = JSON.parse(raw)
          if (s.messages?.length) setMessages(s.messages)
          setDnaName(s.dnaName || '')
          setModel(s.model || GROQ_MODELS[0].id)
          setIs432(!!s.is432)
          if (s.genres) setGenres(s.genres)
        }
      }
    })()
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (supabase) {
        await supabase.from('sessions').upsert({
          user_id: deviceId.current,
          messages,
          dna_model_name: dnaName,
          groq_model: model,
          is_432hz: is432,
          genres,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else {
        localStorage.setItem('redemusic_session', JSON.stringify({ messages, dnaName, model, is432, genres }))
      }
    }, 600)
    return () => clearTimeout(t)
  }, [messages, dnaName, model, is432, genres])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = is432 ? 432 / 440 : 1.0
  }, [is432, audioUrl])

  async function send() {
    if (!input.trim()) return
    setError(null)
    const nextMessages = [...messages, { role: 'user', content: input }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, model, genres }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setMessages((p) => [...p, { role: 'assistant', content: data.lyrics || '(empty response)' }])
    } catch (e) {
      setError(e.message || 'Request failed — check the server logs / GROQ_API_KEY env var.')
    } finally {
      setLoading(false)
    }
  }

  async function copyMsg(text, idx) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1400)
    } catch (e) {}
  }

  function onFile(e) {
    const f = e.target.files?.[0]
    if (f) setAudioUrl(URL.createObjectURL(f))
  }

  return (
    <div className="min-h-screen w-full relative" style={{ background: '#14100F', color: '#F5F1E8', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[240px] rounded-full opacity-[0.10] blur-[90px]"
        style={{ background: 'radial-gradient(circle, #E8412C 0%, #22D3EE 55%, transparent 75%)' }} />

      <div className="relative max-w-xl mx-auto px-4 py-6 pb-16">
        <header className="flex items-center justify-between mb-5 pb-4 border-b border-[#33291F]">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-bold tracking-tight">
              Red<span className="text-[#E8412C]">E</span>Music<span className="text-[#9A9089]">.ai</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#9A9089] mt-0.5">mission control · not the model</p>
          </div>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FA97A]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8412C]" />
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {GENRES.map((g) => (
            <button key={g} onClick={() => toggleGenre(g)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full border transition-colors ${
                genres.includes(g) ? 'border-[#E8412C] text-[#E8412C] bg-[#E8412C]/10' : 'border-[#33291F] text-[#9A9089]'
              }`}>
              {g}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Panel title="AI Producer" subtitle="Chat, lyrics & logic — Groq" icon={Wand2} open={open.brain} onToggle={() => toggle('brain')} ledColor="bg-[#4FA97A]">
            <div className="space-y-3">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-[#14100F] border border-[#33291F] rounded-lg px-3 py-2 text-xs">
                {GROQ_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>

              <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[85%] rounded-lg px-3 py-2 text-[11.5px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-[#E8412C]/15 border border-[#E8412C]/40' : 'bg-[#241E1A] border-l-2 border-[#22D3EE]'
                    }`}>
                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1 text-[9px] uppercase tracking-wider text-[#22D3EE]">
                          <Sparkles size={10} /> AI Producer
                        </div>
                      )}
                      {m.content}
                      {m.role === 'assistant' && i > 0 && (
                        <button onClick={() => copyMsg(m.content, i)} className="mt-1.5 flex items-center gap-1 text-[9.5px] text-[#9A9089] hover:text-[#F2B705]">
                          {copiedIdx === i ? <><Check size={10} /> copied</> : <><Copy size={10} /> copy for HeartMuLa</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-3 py-2 bg-[#241E1A] border-l-2 border-[#22D3EE] text-[11px] text-[#9A9089] flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> writing...
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-[11px] text-[#E8412C]">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Aggressive trap hook about grinding through burnout..."
                  className="flex-1 bg-[#14100F] border border-[#33291F] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E8412C]"
                />
                <button onClick={send} disabled={loading} className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#E8412C] text-[#1a0d0a] disabled:opacity-60">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Vocal DNA" subtitle="Your own voice model — Applio / RVC" icon={Mic2} open={open.vocal} onToggle={() => toggle('vocal')} ledColor="bg-[#F2B705]">
            <div className="space-y-3">
              <p className="text-xs text-[#c9c0b4] leading-relaxed">
                Train a model of your own voice once, then reuse it to skin any generated vocal. Needs ~10–15 min of clean, dry solo vocal.
              </p>
              <input
                type="text"
                placeholder="Model name (e.g. red-v1)"
                value={dnaName}
                onChange={(e) => setDnaName(e.target.value)}
                className="w-full bg-[#14100F] border border-[#33291F] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#F2B705]"
              />
              <a href="https://colab.research.google.com/github/iahispano/applio/blob/master/assets/Applio.ipynb" target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-[#F2B705] text-[#F2B705] text-xs rounded-lg py-2.5">
                Open Applio Colab <ExternalLink size={13} />
              </a>
            </div>
          </Panel>

          <Panel title="Audio Engine" subtitle="Instrumentals & stems — HeartMuLa / MusicGen / UVR5" icon={Waves} open={open.engine} onToggle={() => toggle('engine')} ledColor="bg-[#F2B705]">
            <p className="text-xs text-[#c9c0b4] leading-relaxed">
              HeartMuLa generates full lyrics+instrumental performances on its own Colab notebook. MusicGen (Meta) is the better pick for pure instrumental grit. UVR5 splits either into clean stems before re-skinning vocals with your Vocal DNA model. No fake play button here — the track only shows up once it's actually rendered over there.
            </p>
          </Panel>

          <Panel title="432Hz + Session" subtitle="Playback tuning & autosave" icon={Zap} open={open.session} onToggle={() => toggle('session')} ledColor="bg-[#4FA97A]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">432Hz playback</div>
                  <div className="text-[10px] text-[#9A9089] max-w-[220px]">Slows/pitches down ~1.8% — the real mechanism, not a filter gimmick.</div>
                </div>
                <button onClick={() => setIs432((v) => !v)} className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${is432 ? 'bg-[#E8412C]' : 'bg-[#33291F]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#F5F1E8] transition-transform ${is432 ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={onFile} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-[#33291F] text-xs rounded-lg py-2.5">
                <Upload size={14} /> Upload a track to test
              </button>
              {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" />}
              <p className="text-[10px] text-[#9A9089]">
                {supabase ? 'Synced to Supabase.' : 'Saved to this browser only — add Supabase env vars to sync across devices.'}
              </p>
            </div>
          </Panel>
        </div>

        <footer className="mt-8 pt-4 border-t border-[#33291F] text-[10px] text-[#9A9089] leading-relaxed">
          This app is the front end — the orchestrator. Heavy generation (HeartMuLa) and voice training (Applio) run on free Colab GPUs since no free host runs them 24/7. The AI Producer chat runs instantly right here via Groq.
        </footer>
      </div>
    </div>
  )
}
