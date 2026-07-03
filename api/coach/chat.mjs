// Vercel serverless function: POST /api/coach/chat (streams NDJSON)
// Same handler the local Express server uses (server/index.mjs). Vercel's
// Node runtime parses the JSON body into req.body and supports res.write
// streaming, so the handler is shared verbatim.
export { chatHandler as default } from '../../server/coach.mjs'
