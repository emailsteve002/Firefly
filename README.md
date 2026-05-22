# Firefly

Automatically mark your keywords on every webpage you visit.

## Install (Developer Mode)

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin the Firefly icon in your toolbar.

## Usage

1. Click the Firefly icon.
2. Type keywords (one per line), pick a default color, click **Add Keywords**.
3. Each keyword in the list has:
   - A **color swatch** (click to edit color or disable highlight).
   - A **B** button (toggle bold).
   - A **✕** button (delete).
4. Use **On** / **Off** at the top of the list to hide all highlights without losing them.
5. **Clear all** removes every keyword.

Open `guide.html` from the popup for the full usage guide.

## Files

- `manifest.json` &mdash; Manifest V3 config
- `popup.html` / `popup.js` &mdash; Popup UI
- `src/firefly.js` &mdash; Content script (scans pages, watches for dynamic content)
- `guide.html` &mdash; Standalone usage guide
- `img/firefly_48px.png`, `img/firefly_128px.png` &mdash; Icons

## Behavior Notes

- Matching is **case-insensitive** and **whole-word** (word boundaries).
- Keywords sync across devices via Chrome sync storage.
- Skips `<script>`, `<style>`, `<noscript>`, `<textarea>`, `<input>`, `<select>` so form fields are never touched.
- A debounced MutationObserver re-scans the page when new content is added.
