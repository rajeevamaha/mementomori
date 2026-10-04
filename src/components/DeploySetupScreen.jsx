import { motion } from 'framer-motion'
import Reaper from './Reaper.jsx'

// Shown on a Vercel deployment before MONGODB_URI or POSTGRES_URL + AUTH_SECRET are set.
// One project, no separate backend — just env vars + Storage in the Vercel dashboard.
export default function DeploySetupScreen({ setup }) {
  const needsDb = setup?.needsDatabase ?? setup?.needsPostgres
  const needsSecret = setup?.needsAuthSecret

  return (
    <div className="onboard">
      <motion.div
        className="onboard-card deploy-setup"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <Reaper size={108} />
        </div>
        <div className="eyebrow">Vercel deployment</div>
        <h2 className="onboard-title">Death is not ready yet.</h2>
        <p className="onboard-sub">
          This app runs entirely on <strong>one Vercel project</strong> — React in the browser, login and
          data in <code className="inline-code">api/</code> serverless functions. Finish setup in the Vercel
          dashboard (no separate backend server).
        </p>

        <ol className="deploy-setup-steps">
          {needsDb && (
            <li>
              <strong>Database (required).</strong> Use one of:
              <ul style={{ marginTop: 8, paddingLeft: '1.1rem' }}>
                <li>
                  <strong>MongoDB Atlas</strong> — create a free cluster, <strong>Connect → Drivers</strong>,
                  copy the URI, set <code className="inline-code">MONGODB_URI</code> on Vercel (optional{' '}
                  <code className="inline-code">MONGODB_DB=mementomori</code>).
                </li>
                <li>
                  <strong>Postgres</strong> — Vercel <strong>Storage → Postgres</strong> or Supabase: set{' '}
                  <code className="inline-code">POSTGRES_URL</code>.
                </li>
              </ul>
              Collections/tables are created on first use.
            </li>
          )}
          {needsSecret && (
            <li>
              <strong>Session secret (required).</strong> Settings → Environment Variables → add{' '}
              <code className="inline-code">AUTH_SECRET</code> (32+ random bytes). Generate locally:{' '}
              <code className="inline-code">node -e &quot;console.log(require('crypto').randomBytes(32).toString('hex'))&quot;</code>
            </li>
          )}
          <li>
            <strong>Redeploy.</strong> Env vars apply only to new deployments. Use <strong>Deployments →
            Redeploy</strong> after saving.
          </li>
          <li>
            <strong>Optional:</strong> <code className="inline-code">GOOGLE_CLIENT_ID</code> +{' '}
            <code className="inline-code">GOOGLE_CLIENT_SECRET</code> for Google sign-in (redirect URI:{' '}
            <code className="inline-code">https://YOUR-DOMAIN/api/auth/google/callback</code>). Coach keys:{' '}
            <code className="inline-code">ANTHROPIC_API_KEY</code> / <code className="inline-code">GROQ_API_KEY</code>.
          </li>
        </ol>

        <p className="muted small">
          When <code className="inline-code">/api/auth/me</code> reports accounts ready, this screen disappears and
          visitors see sign-in. Your plan syncs via <code className="inline-code">/api/state</code>.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Check again
        </button>
      </motion.div>
    </div>
  )
}
