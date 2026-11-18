# ULTRON.JAILBREAK V5

A red-neon Android AI chat frontend with a separate Node.js API. GitHub Actions can build a debug APK automatically.

## Important architecture notes

- The Android APK contains the frontend only. The API in `server/` must be deployed separately to an HTTPS host.
- AI provider keys and the JWT secret belong only in the backend environment variables. Never place them in the frontend, commit them, or share them in chat.
- The app defaults to `http://localhost:8787` for local development. For a real phone, set `VITE_API_URL` to your deployed HTTPS API URL before building.
- This is a starter project, not a published or prebuilt APK. The first successful Actions run creates the APK artifact.

## Build APK with GitHub Actions

1. Upload the entire project, including `.github/workflows/android-apk.yml`, `src/`, and `server/`, to the repository's `main` branch.
2. Open the repository's **Actions** tab.
3. Select **Build Android APK** and press **Run workflow** (or push to main to trigger it).
4. Wait for the workflow to finish successfully.
5. Open the completed run and download the `ultron-jailbreak-v5-debug-apk` artifact.
6. Extract the downloaded artifact ZIP to get `app-debug.apk`.

## Backend setup

1. In `server/`, install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set a long random `JWT_SECRET`, a unique `OWNER_USERNAME` and `OWNER_PASSWORD`, and the selected provider key.
4. Set `AI_PROVIDER` to `openai`, `anthropic`, or `gemini`.
5. Deploy the `server/` directory to a Node.js host with persistent storage for SQLite.
6. Configure the frontend build variable `VITE_API_URL` to the backend's HTTPS URL.

Do not reuse a password that has been shared in a chat. Do not commit `.env` files.
