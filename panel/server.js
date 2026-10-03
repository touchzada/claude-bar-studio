// Painel da barra do Claude: servidor local, zero dependência.
// Serve o index.html e lê/grava ~/.claude/usage-band.json (o mod relê esse arquivo a cada 2s).
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')

const PORT = Number(process.env.PORT) || 4747
const CONFIG = path.join(os.homedir(), '.claude', 'usage-band.json')
const INDEX = path.join(__dirname, 'index.html')
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`])
const MAX_BODY = 64 * 1024

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const readBody = req =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('corpo grande demais'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const server = http.createServer(async (req, res) => {
  // anti DNS-rebinding: só aceita falar com a gente pelo nome/porta certos
  if (!HOSTS.has(req.headers.host || '')) return send(res, 403, { error: 'host não permitido' })

  const url = (req.url || '/').split('?')[0]

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    return send(res, 200, fs.readFileSync(INDEX, 'utf8'), 'text/html; charset=utf-8')
  }

  if (url === '/api/config' && req.method === 'GET') {
    let config = null
    try {
      config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'))
    } catch {
      // ainda não existe ou está inválido: o painel usa o padrão
    }
    return send(res, 200, { path: CONFIG, exists: config !== null, config })
  }

  if (url === '/api/config' && req.method === 'PUT') {
    // anti CSRF: só JSON (força preflight) e, se vier Origin, tem que ser a gente
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return send(res, 415, { error: 'precisa ser application/json' })
    }
    const origin = req.headers.origin
    if (origin && !HOSTS.has(origin.replace(/^https?:\/\//, ''))) return send(res, 403, { error: 'origin não permitido' })

    try {
      const data = JSON.parse(await readBody(req))
      if (!data || typeof data !== 'object' || !Array.isArray(data.widgets) || typeof data.style !== 'object') {
        return send(res, 400, { error: 'config inválida' })
      }
      fs.mkdirSync(path.dirname(CONFIG), { recursive: true })
      const tmp = CONFIG + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
      fs.renameSync(tmp, CONFIG)
      return send(res, 200, { ok: true, savedAt: Date.now() })
    } catch (err) {
      return send(res, 400, { error: String(err.message || err) })
    }
  }

  send(res, 404, { error: 'não achei' })
})

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já tá em uso. Provavelmente o painel já está aberto: http://127.0.0.1:${PORT}`)
  } else {
    console.error(err)
  }
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`
  console.log(`Painel da barra rodando em ${url}`)
  console.log(`Config: ${CONFIG}`)
  console.log('Deixa essa janela aberta enquanto estiver mexendo. Ctrl+C pra fechar.')
  if (!process.argv.includes('--no-open')) {
    const opener = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`
    exec(opener, () => {})
  }
})
