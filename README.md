# erberk — portfolio

Cinematic scrollable portfolio. Static HTML/CSS/JS + one Vercel serverless function for the contact form.

## Stack

- Static site (single `index.html` + `sw-variants.css` + `sw-variants.js`)
- 1 serverless function: `api/contact.js` → proxies to Web3Forms so the access key stays server-side
- External APIs: GitHub contributions (cached 6h in localStorage)

## Local dev

```bash
npm i -g vercel
cd project
vercel dev
```

Local `/api/contact` will only work after you create `.env.local` with `WEB3FORMS_ACCESS_KEY`.

## Deploy to Vercel

### 1. Get a Web3Forms access key
- Go to https://web3forms.com, sign up free, verify your email.
- Copy the access key it gives you. Treat it like a password.

### 2. Push the repo to GitHub
```bash
cd portfolio
git init
git add .
git commit -m "init portfolio"
git branch -M main
git remote add origin git@github.com:erberkk/portfolio.git
git push -u origin main
```

### 3. Import on Vercel
- https://vercel.com/new → Import the GitHub repo.
- **Root Directory**: set to `project` (the folder containing `index.html`).
- Framework preset: **Other** (it's plain static + serverless).
- Build command: leave empty.
- Output directory: leave empty.

### 4. Add the env var
Project → **Settings → Environment Variables**:
- Name: `WEB3FORMS_ACCESS_KEY`
- Value: the key from step 1
- Environments: Production + Preview + Development

### 5. Deploy
Click **Deploy**. Vercel will give you a `.vercel.app` URL.

### 6. (Optional) Custom domain
Project → **Settings → Domains** → add your domain and follow DNS instructions.

## Post-deploy sanity checks

- Open the site, scroll to the bottom, click **say hi**, send yourself a test message.
- Open DevTools → Application → Local Storage → check `gh-heatmap-v1` is populated (GitHub cache working).
- Chrome DevTools → Rendering → enable `prefers-reduced-motion: reduce` and reload — grain/marquee/tunnel glitch should disappear.

## Files

```
project/
├── api/contact.js       # Vercel serverless (keeps Web3Forms key server-side)
├── index.html           # the whole site
├── sw-variants.css      # vinyl styles for Selected Work
├── sw-variants.js       # vinyl player interactions + project list
├── uploads/             # CV PDF
├── vercel.json          # security headers + asset caching
├── .env.example         # env var template
└── .gitignore
```

## Updating projects

Selected Work projects live in [sw-variants.js](project/sw-variants.js) inside the `SW_PROJECTS` array.
