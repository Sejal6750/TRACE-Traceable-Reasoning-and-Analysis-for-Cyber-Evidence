import 'dotenv/config'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const app = express()
const port = Number(process.env.PORT || 3000)

app.use(express.json({ limit: '1mb' }))

app.post('/api/ai', async (req, res) => {
  const { messages, context } = req.body || {}
  if (!process.env.NEBIUS_API_KEY) {
    return res.status(503).json({ mode: 'demo', message: 'NEBIUS_API_KEY is not configured. TRACE is running in transparent demonstration mode.' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ mode: 'error', message: 'At least one analysis message is required.' })
  }

  const baseUrl = process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.ai/v1'
  const model = process.env.NEBIUS_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct'
  const system = `You are TRACE, an AI assistant for a fictional digital investigation workspace. Treat all material as user-provided simulation data. Never state guilt, intent, legal conclusions, or unverified hypotheses as fact. Label observations, hypotheses, uncertainties, and next steps separately. Do not invent timestamps; if a timestamp is absent, say so. Case context: ${JSON.stringify(context || {})}`

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: system }, ...messages] }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(502).json({ mode: 'error', message: data?.error?.message || `Nebius request failed with status ${response.status}.` })
    }
    return res.json({ mode: 'live', content: data?.choices?.[0]?.message?.content || 'The model returned no analysis content.' })
  } catch (error) {
    return res.status(502).json({ mode: 'error', message: error instanceof Error ? error.message : 'Unable to reach Nebius.' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
  app.listen(port, '0.0.0.0', () => console.log(`TRACE listening on http://localhost:${port}`))
} else {
  const vite = await createViteServer({ root, server: { middlewareMode: true, host: '0.0.0.0' }, appType: 'spa' })
  app.use(vite.middlewares)
  app.listen(port, '0.0.0.0', () => console.log(`TRACE dev workspace listening on http://localhost:${port}`))
}
