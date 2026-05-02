# T. Kempenaar Website

Static multi-page portfolio/shop website for T. Kempenaar.

## Pages
- `index.html` (home)
- `guitars.html`
- `beeldhouwen.html`
- `poems.html`
- `drawings.html`
- `favorites.html`
- `cart.html`
- `checkout.html`
- `contact.html`
- `manage.html`

## Local preview
Open directly, or run a local server:

```bash
cd "/Users/theunvangiffen/tinek 3"
python3 -m http.server 8080
```

Then open: `http://127.0.0.1:8080/index.html`

## Optional: local SMS dev server
If you use SMS webhook testing, see:
- `README-SMS-WEBHOOK.md`
- `dev_server.py`

## GitHub setup
1. Create an empty GitHub repository.
2. Add your remote:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
```

3. Push:

```bash
git branch -M main
git push -u origin main
```

## GitHub Pages
This repo includes a workflow at `.github/workflows/pages.yml`.
After pushing to `main`:
1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**

The website will auto-deploy on each push to `main`.
