# City Run

Last-mile electric bicycle delivery for Lagos — send, receive, and track packages in real time.

## Tech stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Firebase Storage

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app lives at `/cityrun`; `/` redirects there.

## Android APK

`public/downloads/cityrun.apk` is served by the in-app install prompt. Regenerate it with:

```powershell
.\scripts\generate-android-apk.ps1
```
