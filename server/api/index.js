// The Vercel function. vercel.json sends every path here, and Express routes it
// as the local server would. The app is built once per instance and reused.
import { bootstrap } from '../dist/bootstrap.js'

let ready

export default async function handler(req, res) {
  ready ??= bootstrap().catch((error) => {
    // A failed start (a wrong DATABASE_URL, say) must not stick to the instance.
    ready = undefined
    throw error
  })
  const { app } = await ready
  return app(req, res)
}
