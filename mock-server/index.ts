import { WebSocketServer, WebSocket } from 'ws'

const PORT = 3333
const wss = new WebSocketServer({ port: PORT })
console.log(`[mock] listening on ws://localhost:${PORT}`)

wss.on('connection', (ws: WebSocket) => {
  console.log('[mock] client connected')
  let sessionReady = false

  ws.on('message', async (raw: Buffer) => {
    const msg = JSON.parse(raw.toString())
    console.log('[mock] ←', JSON.stringify(msg))

    if (msg.type === 'start_session') {
      sessionReady = true
      console.log('[mock] session started, tools:', msg.tools)
      return
    }

    if (msg.type === 'message' && sessionReady) {
      const callId = `call_${Date.now()}`

      // Send a tool_call for read_file to test permission flow
      ws.send(JSON.stringify({
        type: 'tool_call',
        id: callId,
        name: 'read_file',
        params: { path: 'src/extension.ts' },
      }))

      // Wait for tool_result
      let result: any
      try {
        result = await waitForResult(ws, callId)
        console.log('[mock] tool result received:', result)
      } catch (err: any) {
        console.warn('[mock] tool_result timeout:', err.message)
        result = 'timeout'
      }

      // Stream a reply
      const reply = `I read the file. Here is my response to: "${msg.content}"`
      for (const chunk of chunkString(reply, 10)) {
        ws.send(JSON.stringify({ type: 'stream_chunk', delta: chunk }))
        await sleep(50)
      }
      ws.send(JSON.stringify({ type: 'stream_done' }))
      return
    }

    if (msg.type === 'message' && !sessionReady) {
      // No session yet — stream a simple reply without tool call
      const reply = `[mock] No session started. Send start_session first.`
      ws.send(JSON.stringify({ type: 'stream_chunk', delta: reply }))
      ws.send(JSON.stringify({ type: 'stream_done' }))
      return
    }

    if (msg.type === 'update_permission_mode') {
      ws.send(JSON.stringify({ type: 'permission_mode_ack', mode: msg.mode }))
      return
    }
  })

  ws.on('close', () => console.log('[mock] client disconnected'))
  ws.on('error', (err) => console.error('[mock] error:', err.message))
})

function waitForResult(ws: WebSocket, callId: string, timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler)
      reject(new Error(`tool_result timeout for ${callId}`))
    }, timeout)

    const handler = (raw: Buffer) => {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'tool_result' && msg.id === callId) {
        clearTimeout(timer)
        ws.off('message', handler)
        resolve(msg.result ?? msg.error)
      }
    }
    ws.on('message', handler)
  })
}

function chunkString(s: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < s.length; i += size) chunks.push(s.slice(i, i + size))
  return chunks
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
