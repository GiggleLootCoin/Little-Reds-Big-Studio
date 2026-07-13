export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { messages, model, genres } = payload
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages' }) }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing GROQ_API_KEY — add it in Netlify: Site settings > Environment variables' }),
    }
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
      return { statusCode: groqRes.status, body: JSON.stringify({ error: data.error?.message || 'Groq request failed' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ lyrics: data.choices?.[0]?.message?.content || '' }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
