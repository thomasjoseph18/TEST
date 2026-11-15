Sandbox-only visual test helpers (esbuild bundle + Playwright/Chromium with software WebGL).
They were used because `vite build` could not run in the authoring sandbox. You do NOT need these locally: use `npm run dev`.
Open the app with `#debug` at the end of the URL to expose `window.__bsGame`, `window.__bsPlayer`, `window.__bsThree` for tests.
Note: with software GL a surface frame takes ~6 s, so frames are stepped manually (`t.advance`) and read back with readPixels.
