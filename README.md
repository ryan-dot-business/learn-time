# Learn Time

A digital toy clock that helps kids learn to tell the time. It's one screen:
- a digital readout
- an analog clock face with hands you can drag
- a grid of buttons

The colours tie the two clocks together: red is always the hour and yellow is always the minute.

## What it does

- **Now:** shows the real time. Tap **Now** at any time to bring the hands back to it.
- **Play:** drag the hands by their handles or by the hands themselves.
  - The minute hand is geared to the hour hand, like a real clock, and AM/PM flips when the time passes 12.
  - The hour hand snaps to an hour.
- **Quiz (?):** shows a target time, which flips in like a split-flap board above the readout.
  - The kid sets the hands to match the target. In a quiz, the minute hand never moves the hour hand into the next hour.
  - Tapping **?** again shows ghost hands as a hint. Tapping it a third time gives a new time.
- **Time examples:** picture buttons that set the clock to a real moment in the day:

  | Example | Time |
  | --- | --- |
  | Sunrise | Local sunrise today |
  | Midday | 12:00 PM |
  | Sunset | Local sunset today |
  | Midnight | 12:00 AM |
  | Breakfast | 8:15 AM |
  | Lunch | 12:30 PM |
  | Dinner | 7:00 PM |

  Sunrise and sunset are estimated from the device's time zone unless a location is given.

All sounds are synthesized in the browser, so there are no audio files.

## Embedding

The toy is published as one web component, `<learn-time>`, from a single stable URL that always serves the latest deploy:

```
https://ryan-dot-business.github.io/learn-time/embed.js
```

```html
<script type="module" src="https://ryan-dot-business.github.io/learn-time/embed.js"></script>

<learn-time mode="face" contract="1"></learn-time>

<script>
  const clock = document.querySelector('learn-time');
  clock.routine = [{ id: 'breakfast', time: '07:30' }, { id: 'bedtime', time: '19:30' }];
  clock.events = [{ title: 'Swimming', start: '2026-10-14T16:00:00-04:00', iconUrl: 'https://…/swim.png' }];
  clock.location = { lat: 43.65, lng: -79.38 };
  clock.addEventListener('lt-open', () => { /* show full mode */ });
</script>
```

The standalone site (`index.html`) uses the same element in full mode. `demo.html` shows face mode at 200 px, theming, a refused contract, and opening and closing full mode, and it logs every event.

### Embed contract 1

| Part | Behaviour |
| --- | --- |
| `mode` attribute | `face`: the dial alone, showing the real time, sized by its container, with no controls; tapping it fires `lt-open`. `full`: the whole Learn Time toy. Missing or unknown values mean `face`. Changing the attribute switches modes in place. |
| `contract` attribute | Must be `"1"`. Anything else, including a missing attribute, renders nothing and fires `lt-error` with code `unsupported-contract`. |
| `routine` property | A list of anchors, `{id, time, label?, iconUrl?}`, that replaces the built-in defaults. `time` is `"HH:MM"` in 24-hour time. `sunrise` and `sunset` can leave `time` out to use the computed time. The built-in ids (`sunrise`, `midday`, `sunset`, `midnight`, `breakfast`, `lunch`, `dinner`) have pictures. Other ids show `label`, or the id, as text. In full mode, anchors become the picture buttons; face mode shows only the dial. |
| `events` property | Today's events, `{title, start, iconUrl}`. `start` is `"HH:MM"`, an ISO date-time or a `Date`. Events not on today's date are skipped. In full mode, each event becomes a button after the routine anchors, like breakfast and lunch: it shows the `iconUrl` picture, or the title as text, and tapping it sets the clock to that time. |
| `location` property | `{lat, lng}`, used for sunrise and sunset. Without it, they're estimated from the time zone. |
| `lt-ready` event | Fired once per element after its first render. `detail: {version, contract}`. |
| `lt-open` event | Fired when the face is tapped, or activated with Enter or Space. |
| `lt-close` event | Fired by the close button in full mode. Add the `no-close` attribute to hide the button, as the standalone site does. |
| `lt-error` event | `detail: {code, message, version}`. Codes: `unsupported-contract`, `invalid-routine`, `invalid-events`, `invalid-location`. An invalid property value is ignored and the previous value is kept. |
| Theming | Set these CSS custom properties on the element or any ancestor: `--lt-bg`, `--lt-face` (dial fill), `--lt-panel`, `--lt-cream` (text and rim), `--lt-hour`, `--lt-minute`, `--lt-dim` (inactive buttons), `--lt-ink`, `--lt-font`. Each defaults to the current palette. |
| Version | `customElements.get('learn-time').version`, or the `version` property on an element. The format is `package.json` version + commit, for example `1.0.0+e04f354`. |

All events bubble and cross the shadow boundary.

### Build and compatibility

- **Output:** `embed.js` is one ES module, bundled and minified with esbuild.
- **Targets:** it's transpiled for Chrome 64, the oldest Android WebView with ES modules and `import.meta`, and for Safari 12.
- **Styles:** all styles live inside the element's Shadow DOM. Layout is measured from the element's own box, not the viewport, and avoids `clamp()`, `min()` and flex `gap`.
- **Images:** they resolve relative to `embed.js`, so they load from GitHub Pages wherever the element is embedded.
- **Font:** the element adds the Figtree font stylesheet to the page once.
- **Dragging:** dragging the hands needs Pointer Events, which means iPadOS 13 or later and Chrome 55 or later. Face mode needs no dragging.
- **Caching:** GitHub Pages serves files with a 10-minute cache, so a host may need up to 10 minutes after a deploy before a reload picks it up.

## Running it

```sh
npm install
npm run build        # builds dist/: embed.js, index.html, demo.html, images
npm run serve        # builds, then serves dist/ at http://localhost:8080
```

## Deploying

Every push to `main` builds the site and deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.

## Files

- `src/learn-time.js`: the `<learn-time>` element (markup, styles, script)
- `build.mjs`: the build (esbuild bundle plus copying the static files to `dist/`)
- `index.html`: the standalone site, i.e. the element in full mode plus the live-hour favicon
- `demo.html`: embed demo and test page
- `images/`: the time example pictures
- `og-image.png`: the 1200×630 link preview image
- `favicon.svg`, `apple-touch-icon.png`: icons. While the page is open, the browser-tab icon is redrawn to show the current hour.

Designs are in the Figma file "Learn Time".
