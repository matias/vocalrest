<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VocalRest

A Next.js app that helps you speak when you can't use your voice. Type text and let AI speak for you using Gemini TTS.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory and set your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

This will build the app and run it in production mode on [http://localhost:3000](http://localhost:3000). Use this to test the production build locally before deploying.

## Features

- Text-to-speech using Gemini TTS
- Multiple voice options
- Audio caching with IndexedDB
- Recent history of spoken phrases
- Quick phrase buttons
- Dark mode UI
