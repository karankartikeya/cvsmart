# Deploying CV Cover

Two services: the FastAPI backend on Railway, the Next.js frontend on Vercel.
Deploy the backend first, since the frontend needs its URL.

Both read secrets from environment variables. Never commit `.env`.

## 1. Backend on Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick `cvsmart`.
3. Open the service **Settings** and set **Root Directory** to `backend`.
   Without this Railway looks at the repo root and finds no Python app.
4. Under **Variables**, add:

   | Variable | Value |
   |---|---|
   | `BRIGHTDATA_API_KEY` | your Bright Data account API token |
   | `BRIGHTDATA_JOB_COLLECTOR_ID` | `c_mt20javb24h5wka3us` |
   | `BRIGHTDATA_COMPANY_COLLECTOR_ID` | `c_mt20n98f1trb5p01jr` |
   | `OPENAI_API_KEY` | your OpenAI key |
   | `OPENAI_MODEL` | `gpt-5.6-sol` |

   Copy the real values from your local `backend/.env`.

5. Under **Settings → Networking**, click **Generate Domain**. Note the URL,
   something like `https://cvsmart-production.up.railway.app`.
6. Check it responds:

   ```bash
   curl https://YOUR-BACKEND-URL/api/ping
   # {"status":"ok"}
   ```

`railway.json` already sets the start command, and Railway injects `$PORT`
itself, so nothing else needs configuring.

## 2. Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project** → import `cvsmart`.
3. Set **Root Directory** to `frontend`. Vercel detects Next.js on its own.
4. Add an environment variable:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE` | your Railway URL from step 1, no trailing slash |

   This must be set before the first build. It is inlined at build time, not
   read at runtime, so changing it later needs a redeploy.

5. **Deploy**.

## 3. Connect them

Vercel gives you a URL like `https://cvsmart.vercel.app`. Add it to the
backend so CORS accepts it:

1. Railway → **Variables** → add `ALLOWED_ORIGINS` set to your Vercel URL.
2. Railway redeploys automatically.

Any `*.vercel.app` origin is already matched by pattern, so preview
deployments work without extra configuration. Setting `ALLOWED_ORIGINS`
matters once you attach a custom domain.

## 4. Verify

Open the Vercel URL and run one generation end to end. If it fails:

- **CORS error in the browser console** — `ALLOWED_ORIGINS` does not match the
  site's origin exactly, scheme included.
- **Network error or 404** — `NEXT_PUBLIC_API_BASE` is wrong or has a trailing
  slash. Fix it and redeploy the frontend.
- **502 with a Bright Data message** — the backend is reachable and the error
  is genuine, usually an expired job posting. Try a fresh URL.

## Notes

- The first request after a deploy is slower while the container warms up.
- Generation takes 15 to 40 seconds. Both platforms allow this; most
  serverless free tiers would time out, which is why Railway is used here
  rather than putting the API on Vercel.
- Pushing to `main` redeploys both services.
