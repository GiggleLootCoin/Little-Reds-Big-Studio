export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, model, genres } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY — add it in your secrets/env settings' })
  }

  const genreNote = Array.isArray(genres) && genres.length ? ` Style focus right now: ${genres.join(', ')}.` : ''

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'qwen/qwen3.6-27b',
        messages: [
          {
            role: 'system',
            content:
              'You are a ghostwriter and production partner for an independent artist. Write original lyrics with [Verse]/[Chorus]/[Bridge] tags when asked for bars, or give direct production advice otherwise. No filler, no disclaimers.' +
              genreNote,
          },
          ...messages,
        ],
        temperature: 0.9,
      }),
    })

    const data = await groqRes.json()
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: data.error?.message || 'Groq request failed' })
    }

    return res.status(200).json({ lyrics: data.choices?.[0]?.message?.content || '' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
