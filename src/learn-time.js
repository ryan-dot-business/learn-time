// <learn-time> — the Learn Time toy clock as an embeddable custom element.
// Embed spec v1: see README.md, "Embedding".

/* global __LT_VERSION__ */
const VERSION = typeof __LT_VERSION__ !== 'undefined' ? __LT_VERSION__ : 'dev';
const CONTRACTS = ['1'];

// Images resolve relative to this script, wherever it is loaded from.
const asset = path => new URL(path, import.meta.url).href;

const BUILT_IN = {
  sunrise: { label: 'Sunrise', icon: 'images/sunrise.png' },
  midday: { label: 'Midday', icon: 'images/midday.png' },
  sunset: { label: 'Sunset', icon: 'images/sunset.png' },
  midnight: { label: 'Midnight', icon: 'images/midnight.png' },
  breakfast: { label: 'Breakfast', icon: 'images/breakfast.png' },
  lunch: { label: 'Lunch', icon: 'images/lunch.png' },
  dinner: { label: 'Dinner', icon: 'images/dinner.png' },
};
const DEFAULT_ROUTINE = [
  { id: 'sunrise' },
  { id: 'midday', time: '12:00' },
  { id: 'sunset' },
  { id: 'midnight', time: '00:00' },
  { id: 'breakfast', time: '08:15' },
  { id: 'lunch', time: '12:30' },
  { id: 'dinner', time: '19:00' },
];

const mod = (n, m) => ((n % m) + m) % m;
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hourIdx = t => Math.floor(mod(t, 720) / 60);
const hourLabel = t => hourIdx(t) || 12;
const ampm = t => (mod(t, 1440) < 720 ? 'AM' : 'PM');
const realNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const dayKey = () => new Date().toDateString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------------------------------------------------------------------------
// Times
// "HH:MM" (24 h) → minutes since midnight. A Date or an ISO date-time string
// → its local time, only when it falls today. Anything else → null.
function parseTime(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (m) {
      const h = Number(m[1]), mi = Number(m[2]);
      return h < 24 && mi < 60 ? h * 60 + mi : null;
    }
  }
  const d = v instanceof Date ? v : (typeof v === 'string' || typeof v === 'number') ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return null;
  if (d.toDateString() !== dayKey()) return null;
  return d.getHours() * 60 + d.getMinutes();
}

// Sunrise and sunset: from the `location` property when given, otherwise
// estimated from the device's time zone (its main city).
const ZONES = {
  'America/Toronto': [43.65, -79.38], 'America/New_York': [40.71, -74.01], 'America/Chicago': [41.88, -87.63],
  'America/Denver': [39.74, -104.99], 'America/Los_Angeles': [34.05, -118.24], 'America/Vancouver': [49.28, -123.12],
  'America/Edmonton': [53.55, -113.49], 'America/Winnipeg': [49.9, -97.14], 'America/Regina': [50.45, -104.61],
  'America/Halifax': [44.65, -63.57], 'America/St_Johns': [47.56, -52.71], 'America/Montreal': [45.5, -73.57],
  'America/Phoenix': [33.45, -112.07], 'America/Anchorage': [61.22, -149.9], 'America/Detroit': [42.33, -83.05],
  'America/Mexico_City': [19.43, -99.13], 'America/Bogota': [4.71, -74.07], 'America/Lima': [-12.05, -77.04],
  'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38], 'America/Santiago': [-33.45, -70.67],
  'Pacific/Honolulu': [21.31, -157.86], 'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26],
  'Europe/Lisbon': [38.72, -9.14], 'Europe/Paris': [48.86, 2.35], 'Europe/Madrid': [40.42, -3.7],
  'Europe/Berlin': [52.52, 13.4], 'Europe/Amsterdam': [52.37, 4.9], 'Europe/Brussels': [50.85, 4.35],
  'Europe/Zurich': [47.38, 8.54], 'Europe/Rome': [41.9, 12.5], 'Europe/Vienna': [48.21, 16.37],
  'Europe/Stockholm': [59.33, 18.07], 'Europe/Oslo': [59.91, 10.75], 'Europe/Copenhagen': [55.68, 12.57],
  'Europe/Helsinki': [60.17, 24.94], 'Europe/Warsaw': [52.23, 21.01], 'Europe/Athens': [37.98, 23.73],
  'Europe/Istanbul': [41.01, 28.98], 'Europe/Kiev': [50.45, 30.52], 'Europe/Kyiv': [50.45, 30.52], 'Europe/Moscow': [55.76, 37.62],
  'Africa/Cairo': [30.04, 31.24], 'Africa/Lagos': [6.52, 3.38], 'Africa/Nairobi': [-1.29, 36.82],
  'Africa/Johannesburg': [-26.2, 28.05], 'Asia/Dubai': [25.2, 55.27], 'Asia/Karachi': [24.86, 67.0],
  'Asia/Kolkata': [19.08, 72.88], 'Asia/Calcutta': [19.08, 72.88], 'Asia/Dhaka': [23.81, 90.41], 'Asia/Bangkok': [13.76, 100.5],
  'Asia/Jakarta': [-6.21, 106.85], 'Asia/Singapore': [1.35, 103.82], 'Asia/Kuala_Lumpur': [3.14, 101.69],
  'Asia/Manila': [14.6, 120.98], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Taipei': [25.03, 121.57], 'Asia/Seoul': [37.57, 126.98], 'Asia/Tokyo': [35.68, 139.69],
  'Australia/Perth': [-31.95, 115.86], 'Australia/Adelaide': [-34.93, 138.6], 'Australia/Brisbane': [-27.47, 153.03],
  'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96], 'Pacific/Auckland': [-36.85, 174.76],
};
function zonePlace() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old engines */ }
  if (ZONES[tz]) return [ZONES[tz][0], ZONES[tz][1]];
  return [40, -new Date().getTimezoneOffset() / 4];
}
// NOAA solar position approximation; local minutes since midnight.
function sunTimes(location) {
  const ok = location && isFinite(location.lat) && isFinite(location.lng);
  const lat = ok ? Number(location.lat) : zonePlace()[0];
  const lon = ok ? Number(location.lng) : zonePlace()[1];
  const date = new Date();
  const rad = Math.PI / 180;
  const n = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const c = clamp(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl), -1, 1);
  const ha = Math.acos(c) / rad;
  const off = -date.getTimezoneOffset();
  return {
    rise: mod(Math.round(720 - 4 * (lon + ha) - eq + off), 1440),
    set: mod(Math.round(720 - 4 * (lon - ha) - eq + off), 1440),
  };
}

// Routine anchors + today's events → one list of things with a time.
function resolveAnchors(routine, events, location) {
  const out = [];
  let sun = null;
  (Array.isArray(routine) ? routine : DEFAULT_ROUTINE).forEach((a, i) => {
    if (!a || typeof a !== 'object') return;
    const id = String(a.id || 'anchor-' + i);
    const known = BUILT_IN[id];
    let time = parseTime(a.time);
    if (time == null && (id === 'sunrise' || id === 'sunset')) {
      sun = sun || sunTimes(location);
      time = id === 'sunrise' ? sun.rise : sun.set;
    }
    if (time == null) return;
    const label = a.label || (known ? known.label : id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' '));
    const icon = a.iconUrl || (known ? asset(known.icon) : null);
    out.push({ key: 'r:' + id, id, label, icon, time, kind: 'routine' });
  });
  (Array.isArray(events) ? events : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return;
    const time = parseTime(e.start);
    if (time == null) return;
    out.push({ key: 'e:' + i, id: 'event-' + i, label: String(e.title || 'Event'), icon: e.iconUrl || null, time, kind: 'event' });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Sound: synthesized with Web Audio, shared by every clock on the page.
const sfx = (() => {
  let ctx = null, master = null, noise = null, lastTick = 0;
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp);
      comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
  }
  const ready = () => ctx && ctx.state === 'running';
  function env(gain, at, peak, dur) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  }
  function click(freq, peak, dur, at) {
    at = at == null ? ctx.currentTime : at;
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 6;
    env(g, at, peak, dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(at); src.stop(at + dur + 0.02);
  }
  function bar(freq, peak, dur, at) {
    at = at == null ? ctx.currentTime : at;
    [[1, peak, dur], [3.98, peak * 0.25, dur * 0.3]].forEach(part => {
      const mult = part[0], p = part[1], d = part[2];
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq * mult;
      env(g, at, p, d);
      o.connect(g); g.connect(master);
      o.start(at); o.stop(at + d + 0.02);
    });
  }
  return {
    unlock,
    tick(onNumeral) {
      if (!ready()) return;
      const now = ctx.currentTime;
      if (now - lastTick < 0.03) return;
      lastTick = now;
      click(onNumeral ? 3400 : 2600, onNumeral ? 0.55 : 0.3, 0.035);
    },
    flap() { if (ready()) click(1500 + Math.random() * 300, 0.22, 0.025); },
    tock() { if (ready()) { bar(392, 0.4, 0.22); click(1100, 0.25, 0.04); } },
    flip(toPM) {
      if (!ready()) return;
      const t = ctx.currentTime, ab = toPM ? [784, 523.25] : [523.25, 784];
      bar(ab[0], 0.28, 0.5, t); bar(ab[1], 0.28, 0.7, t + 0.12);
    },
    align(high) { if (ready()) bar(high ? 1568 : 1175, 0.12, 0.35); },
    win() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 784, 1046.5].forEach((f, i) => bar(f, 0.32, i === 3 ? 0.9 : 0.4, t + i * 0.085));
    },
    pop(up) {
      if (!ready()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(up ? 520 : 820, t);
      o.frequency.exponentialRampToValueAtTime(up ? 880 : 480, t + 0.09);
      env(g, t, 0.25, 0.12);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.15);
    },
  };
})();

// Figtree is loaded once into the document; Shadow DOM text uses document fonts.
function ensureFont() {
  if (document.querySelector('link[data-learn-time-font]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@700;800&display=swap';
  l.setAttribute('data-learn-time-font', '');
  (document.head || document.documentElement).appendChild(l);
}

// ---------------------------------------------------------------------------
// Styles. Theming: set --lt-* custom properties on the element or any ancestor.
// Sizes come from the element's own box (measured in script), never the viewport,
// and avoid newer CSS (clamp(), min(), flex gap) for old WebViews.
const STYLE = `
:host {
  --bg: var(--lt-bg, #29362a);
  --panel: var(--lt-panel, #1b231d);
  --cream: var(--lt-cream, #fcf0c6);
  --hour: var(--lt-hour, #f47c78);
  --minute: var(--lt-minute, #fff56c);
  --dim: var(--lt-dim, #5e6957);
  --ink: var(--lt-ink, #161b17);
  --face: var(--lt-face, var(--bg));
  --font: var(--lt-font, "Figtree", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif);
  display: block;
  position: relative;
  box-sizing: border-box;
  font-family: var(--font);
  color: var(--cream);
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
:host([mode="full"]) { background: var(--bg); overflow: hidden; }
:host([hidden]) { display: none; }
[hidden] { display: none !important; }
*, *::before, *::after { box-sizing: border-box; }

/* Face mode: the dial alone, filling its container */
.face { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; outline: none; }
.face:focus-visible svg { outline: 3px solid var(--minute); outline-offset: 4px; border-radius: 50%; }

/* Full mode */
.app {
  width: 100%;
  height: 100%;
  display: grid;
  align-content: center;
  justify-content: center;
  justify-items: center;
  align-items: center;
  padding: 12px 16px;
  grid-row-gap: var(--row-gap, 14px);
  grid-column-gap: var(--col-gap, 48px);
}
.app.landscape {
  grid-template-columns: auto auto;
  grid-template-areas: "title clock" "readout clock" "grid clock";
}
.app.portrait {
  grid-template-columns: auto;
  grid-template-areas: "title" "readout" "clock" "grid";
}
.title { grid-area: title; }
.readout { grid-area: readout; }
.grid { grid-area: grid; }
.clock-wrap { grid-area: clock; width: var(--clock, 300px); }

.title {
  margin: 0;
  font-size: calc(var(--unit) * 0.82);
  font-weight: 800;
  line-height: 1.1;
  min-height: 1.1em;
  letter-spacing: -0.01em;
  text-align: center;
  white-space: nowrap;
  transition: color .25s ease;
}
.title .sm { font-size: .5em; margin-left: .15em; }
.title .gap { display: inline-block; width: .18em; }
.title.win { color: var(--minute); }
.ch { display: inline-block; }

.readout {
  display: flex;
  align-items: flex-end;
  background: var(--panel);
  border-radius: calc(var(--unit) * 0.22);
  padding: calc(var(--unit) * 0.16);
  font-size: calc(var(--unit) * 0.82);
  font-weight: 800;
  line-height: 1;
  transition: box-shadow .25s ease;
}
.readout > * + * { margin-left: calc(var(--unit) * 0.1); }
.tile { color: var(--ink); border-radius: calc(var(--unit) * 0.12); padding: calc(var(--unit) * 0.08) calc(var(--unit) * 0.12); letter-spacing: -0.02em; }
.tile.hour { background: var(--hour); }
.tile.min { background: var(--minute); }
.colon { color: var(--cream); padding-bottom: calc(var(--unit) * 0.1); }
.ampm { font-size: .5em; color: var(--cream); padding-bottom: calc(var(--unit) * 0.1); }
.readout.win { box-shadow: 0 0 0 calc(var(--unit) * 0.07) var(--minute); }

.grid {
  display: grid;
  grid-template-columns: repeat(3, calc(var(--unit) * 2.15));
  grid-auto-rows: calc(var(--unit) * 1.3);
  grid-gap: calc(var(--unit) * 0.16);
  margin-top: calc(var(--unit) * 0.2);
}
.btn {
  font: 800 calc(var(--unit) * 0.5) / 1 var(--font);
  border: 0;
  border-radius: calc(var(--unit) * 0.1);
  background: var(--dim);
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  overflow: hidden;
  transition: background .2s ease;
}
.btn > * { opacity: .5; transition: opacity .2s ease; }
.btn img { height: 74%; width: auto; max-width: 80%; pointer-events: none; -webkit-user-drag: none; }
.btn .lbl { font-size: .62em; line-height: 1.05; text-align: center; }
.btn[aria-pressed="true"] { background: var(--cream); }
.btn[aria-pressed="true"] > * { opacity: 1; }
.btn:active { transform: scale(.95); }
.btn:focus-visible, .close:focus-visible { outline: 3px solid var(--minute); outline-offset: 2px; }

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--panel);
  color: var(--cream);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 2;
}
.close svg { width: 18px; height: 18px; }

/* Clock */
svg.clock { display: block; width: 100%; height: auto; touch-action: none; overflow: visible; font-family: var(--font); }
.rim { fill: var(--face); stroke: var(--cream); transition: stroke .25s ease; }
.rim.win { stroke: var(--minute); }
.num { fill: var(--cream); font-weight: 800; text-anchor: middle; dominant-baseline: central; }
.num.hl { fill: var(--hour); }
.minlabel { fill: var(--minute); font-weight: 800; text-anchor: middle; dominant-baseline: central; }
.hand { stroke-linecap: round; }
.hand.hour { stroke: var(--hour); }
.hand.min { stroke: var(--minute); }
.pin { fill: var(--ink); }
.ghost { opacity: 0; transition: opacity .4s ease; pointer-events: none; }
.ghost.show { opacity: .32; }
.hit { stroke: transparent; stroke-width: 26; stroke-linecap: round; cursor: grab; }
.handle { cursor: grab; outline: none; }
.handle .knob.hour { fill: var(--hour); }
.handle .knob.min { fill: var(--minute); }
.handle .grip { stroke: var(--ink); stroke-width: 1.2; stroke-linecap: round; opacity: .55; fill: none; }
.handle .ring { fill: none; stroke: var(--cream); stroke-width: 2; opacity: 0; }
.handle:focus-visible .ring { opacity: 1; }
.handle .pad { fill: transparent; }
.dragging, .dragging * { cursor: grabbing !important; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// Geometry per mode. Face mode drops the drag handles, so it can use a
// tighter frame and larger type: it has to read clearly at 200 px wide.
const GEOM = {
  full: { viewBox: '-24 -24 269 269', num: 15, hl: 25, label: 17, rim: 10, hourW: 10, minW: 6.5, pin: 3.4 },
  face: { viewBox: '-9 -9 239 239', num: 20, hl: 30, label: 21, rim: 9, hourW: 12, minW: 7.5, pin: 4 },
};
const C = 110.5, R_RIM = 105.5, R_HANDLE = 125, L_HOUR = 46, L_MIN = 72;
const NS = 'http://www.w3.org/2000/svg';

function clockSVG(mode) {
  const g = GEOM[mode];
  const full = mode === 'full';
  const handle = (id, hand, cls, label, max) => `
      <g class="handle" id="${id}" data-hand="${hand}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${max === 12 ? 1 : 0}" aria-valuemax="${max === 12 ? 12 : 59}">
        <circle class="pad" r="24"/><circle class="ring" r="13"/><circle class="knob ${cls}" r="9"/>
        <path class="grip" d="M-3.6 -2.4H3.6M-3.6 0H3.6M-3.6 2.4H3.6"/>
      </g>`;
  return `
    <svg class="clock" id="clock" viewBox="${g.viewBox}" role="img" aria-label="Clock">
      <circle class="rim" id="rim" cx="${C}" cy="${C}" r="${R_RIM}" stroke-width="${g.rim}"/>
      <g id="nums"></g>
      <text class="minlabel" id="minLabel" font-size="${g.label}"></text>
      ${full ? `<g id="ghosts" class="ghost">
        <line class="hand hour" id="gHour" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_HOUR}" stroke-width="${g.hourW}"/>
        <line class="hand min" id="gMin" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_MIN}" stroke-width="${g.minW}"/>
      </g>` : ''}
      <line class="hand hour" id="hHour" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_HOUR}" stroke-width="${g.hourW}"/>
      <line class="hand min" id="hMin" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_MIN}" stroke-width="${g.minW}"/>
      <circle class="pin" cx="${C}" cy="${C}" r="${g.pin}"/>
      <g id="burst"></g>
      ${full ? `
      <line class="hit" id="hitHour" data-hand="hour" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_HOUR}"/>
      <line class="hit" id="hitMin" data-hand="minute" x1="${C}" y1="${C}" x2="${C}" y2="${C - L_MIN}"/>
      ${handle('handleHour', 'hour', 'hour', 'Hour hand', 12)}
      ${handle('handleMin', 'minute', 'min', 'Minute hand', 59)}` : ''}
    </svg>`;
}

function fullMarkup(anchors, closable) {
  const buttons = anchors.map(a =>
    `<button class="btn ex" type="button" data-key="${esc(a.key)}" aria-pressed="false" aria-label="${esc(a.label)}">${
      a.icon ? `<img alt="" src="${esc(a.icon)}">` : `<span class="lbl">${esc(a.label)}</span>`}</button>`).join('');
  return `
    <div class="app full" id="app">
      ${closable ? `<button class="close" id="btnClose" type="button" aria-label="Close">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3L15 15M15 3L3 15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg></button>` : ''}
      <h1 class="title" id="title" aria-live="polite">Now</h1>
      <div class="readout" id="readout" role="img" aria-label="">
        <span class="tile hour" id="rHour">12</span><span class="colon">:</span><span class="tile min" id="rMin">00</span><span class="ampm" id="rAmPm">AM</span>
      </div>
      <div class="clock-wrap">${clockSVG('full')}</div>
      <div class="grid" id="grid">
        <button class="btn" id="btnNow" type="button" aria-pressed="true"><span>Now</span></button>
        <button class="btn" id="btnQuiz" type="button" aria-pressed="false" aria-label="Quiz me"><span>?</span></button>
        ${buttons}
      </div>
      <p class="sr-only" id="live" aria-live="polite"></p>
    </div>`;
}

function faceMarkup() {
  return `<div class="face" id="face" role="button" tabindex="0" aria-label="Open Learn Time">${clockSVG('face')}</div>`;
}

// ---------------------------------------------------------------------------
// One running clock inside a shadow root.
function createClock(host, root, cfg) {
  const mode = cfg.mode;
  const full = mode === 'full';
  const G = GEOM[mode];
  const $ = id => root.querySelector('#' + id);
  const svg = $('clock');
  const timers = [];
  const listen = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); timers.push(() => el.removeEventListener(ev, fn, opt)); };
  let anchors = cfg.anchors();
  let dateSeen = dayKey();

  const state = { t: realNow(), mode: 'now', target: null, example: null, hint: false,
    drags: {}, dragCount: 0, anim: null, celebrating: false, flipping: false };

  const polar = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };
  function labelSlot(t) {
    const m = mod(t, 60), h = hourIdx(t);
    let s = Math.round(m / 5) % 12;
    if (s === h) {
      let diff = m - 5 * h;
      if (diff > 30) diff -= 60;
      if (diff < -30) diff += 60;
      s = diff >= 0 ? (h + 1) % 12 : (h + 11) % 12;
    }
    return s;
  }

  // Numerals
  const nums = [];
  for (let i = 0; i < 12; i++) {
    const el = document.createElementNS(NS, 'text');
    const p = polar(i * 30, 84);
    el.setAttribute('x', p[0].toFixed(2));
    el.setAttribute('y', p[1].toFixed(2));
    el.setAttribute('class', 'num');
    el.setAttribute('font-size', G.num);
    el.textContent = i === 0 ? '12' : String(i);
    $('nums').appendChild(el);
    nums.push(el);
  }

  // Title (full mode): Now / quiz target (split-flap) / anchor label / blank in Play
  const titleEl = $('title');
  let titleKey = '';
  function buildTargetTitle() {
    titleEl.innerHTML = '<span class="ch" id="tH"></span><span class="gap"></span>:<span class="gap"></span>'
      + '<span class="ch" id="tM1"></span><span class="ch" id="tM2"></span><span class="sm"><span class="ch" id="tAP"></span></span>';
  }
  function setTargetChars(t) {
    const mm = pad2(mod(t, 60));
    $('tH').textContent = hourLabel(t);
    $('tM1').textContent = mm[0];
    $('tM2').textContent = mm[1];
    $('tAP').textContent = ampm(t);
  }
  const anchorByKey = k => anchors.filter(a => a.key === k)[0];
  function renderTitle() {
    if (!titleEl) return;
    let key;
    if (state.mode === 'quiz' && state.target != null) key = 'quiz';
    else if (state.mode === 'example') key = 'ex:' + state.example;
    else if (state.mode === 'now') key = 'now';
    else key = 'play';
    if (key === 'quiz') {
      if (titleKey !== 'quiz') buildTargetTitle();
      if (!state.flipping) setTargetChars(state.target);
      titleEl.setAttribute('aria-label', `Set the clock to ${hourLabel(state.target)}:${pad2(mod(state.target, 60))} ${ampm(state.target)}`);
    } else if (key !== titleKey) {
      titleEl.removeAttribute('aria-label');
      const a = state.mode === 'example' ? anchorByKey(state.example) : null;
      titleEl.textContent = key === 'now' ? 'Now' : key === 'play' ? '' : (a ? a.label : '');
    }
    titleKey = key;
  }

  function setHand(line, deg, len) {
    if (!line) return;
    const p = polar(deg, len);
    line.setAttribute('x2', p[0].toFixed(2));
    line.setAttribute('y2', p[1].toFixed(2));
  }
  function setHandle(g, deg) {
    if (!g) return;
    const p = polar(deg, R_HANDLE);
    g.setAttribute('transform', `translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`);
  }

  function render(tDisp, ang) {
    if (tDisp == null) tDisp = state.t;
    const ti = mod(Math.round(tDisp), 1440);
    const minDeg = ang ? ang.m : mod(tDisp, 60) * 6;
    const hourDeg = ang ? ang.h : mod(tDisp, 720) * 0.5;

    setHand($('hHour'), hourDeg, L_HOUR); setHand($('hitHour'), hourDeg, L_HOUR);
    setHand($('hMin'), minDeg, L_MIN); setHand($('hitMin'), minDeg, L_MIN);
    setHandle($('handleHour'), hourDeg);
    setHandle($('handleMin'), minDeg);

    const hi = hourIdx(ti), slot = labelSlot(ti);
    nums.forEach((el, i) => {
      el.setAttribute('class', i === hi ? 'num hl' : 'num');
      el.setAttribute('font-size', i === hi ? G.hl : G.num);
      el.style.visibility = i === slot ? 'hidden' : 'visible';
    });
    const lp = polar(slot * 30, 84);
    const ml = $('minLabel');
    ml.setAttribute('x', lp[0].toFixed(2));
    ml.setAttribute('y', lp[1].toFixed(2));
    ml.textContent = pad2(mod(ti, 60));
    svg.setAttribute('aria-label', `Clock showing ${hourLabel(ti)}:${pad2(mod(ti, 60))} ${ampm(ti)}`);

    if (!full) return;
    const quiz = state.mode === 'quiz' && state.target != null;
    $('ghosts').setAttribute('class', 'ghost' + (quiz && state.hint && !state.flipping ? ' show' : ''));
    if (quiz) {
      setHand($('gHour'), mod(state.target, 720) * 0.5, L_HOUR);
      setHand($('gMin'), mod(state.target, 60) * 6, L_MIN);
    }
    $('rHour').textContent = hourLabel(ti);
    $('rMin').textContent = pad2(mod(ti, 60));
    $('rAmPm').textContent = ampm(ti);
    $('readout').setAttribute('aria-label', `The clock says ${hourLabel(ti)}:${pad2(mod(ti, 60))} ${ampm(ti)}`);
    $('handleHour').setAttribute('aria-valuenow', hourLabel(ti));
    $('handleMin').setAttribute('aria-valuenow', mod(ti, 60));
    renderTitle();
    $('btnNow').setAttribute('aria-pressed', String(state.mode === 'now'));
    $('btnQuiz').setAttribute('aria-pressed', String(state.mode === 'quiz'));
    const exs = root.querySelectorAll('.btn.ex');
    for (let i = 0; i < exs.length; i++) {
      exs[i].setAttribute('aria-pressed', String(state.mode === 'example' && state.example === exs[i].getAttribute('data-key')));
    }
  }

  // ---- Layout: measured from the element's own box ----
  function layout() {
    const w = host.clientWidth, hRaw = host.clientHeight;
    if (!full) {
      const side = Math.max(40, hRaw > 0 ? Math.min(w, hRaw) : w);
      svg.style.width = side + 'px';
      svg.style.height = side + 'px';
      if (hRaw === 0) $('face').style.height = side + 'px';
      return;
    }
    const h = hRaw || window.innerHeight;
    const app = $('app');
    const rows = Math.ceil((2 + root.querySelectorAll('.btn.ex').length) / 3);
    const portrait = h >= w;
    let unit, clockW, rowGap, colGap = 0;
    if (portrait) {
      unit = clamp(Math.min(w * 0.095, h * 0.046 * 4 / Math.max(4, rows + 1)), 18, 52);
      rowGap = clamp(h * 0.03, 8, 30);
      const fixed = unit * (0.95 + 1.35 + 0.2 + rows * 1.46) + rowGap * 3 + 40;
      clockW = clamp(Math.min(w * 0.82, h - fixed), 120, 2000);
    } else {
      unit = clamp(Math.min(w * 0.052, h * 0.074 * 3 / Math.max(3, rows)), 18, 56);
      rowGap = clamp(h * 0.02, 6, 18);
      colGap = clamp(w * 0.05, 20, 72);
      clockW = Math.min(w * 0.46, h * 0.86);
      const left = unit * 6.8;
      if (left + colGap + clockW > w - 40) clockW = Math.max(120, w - 40 - colGap - left);
    }
    app.className = 'app full ' + (portrait ? 'portrait' : 'landscape');
    app.style.setProperty('--unit', unit.toFixed(1) + 'px');
    app.style.setProperty('--clock', Math.floor(clockW) + 'px');
    app.style.setProperty('--row-gap', rowGap.toFixed(1) + 'px');
    app.style.setProperty('--col-gap', colGap.toFixed(1) + 'px');
  }
  let ro = null;
  if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(host); }
  else listen(window, 'resize', layout);
  layout();

  // ---- Time changes ----
  function stopAnim() { if (state.anim) { cancelAnimationFrame(state.anim.raf); state.anim = null; } }
  function onKidMove() {
    if (state.mode === 'now' || state.mode === 'example') { state.mode = 'play'; state.example = null; }
  }
  // Minute hand: fully geared outside the quiz; inside the quiz it only moves
  // the hour hand within the hour the kid set.
  function setMinute(m, delta) {
    if (state.mode === 'quiz') state.t = Math.floor(state.t / 60) * 60 + mod(m, 60);
    else state.t = mod(state.t + delta, 1440);
  }
  function setHour(h) {
    const half = state.t >= 720 ? 720 : 0;
    state.t = half + mod(h, 12) * 60 + mod(state.t, 60);
  }
  function playChange(prev, next) {
    if (prev === next) return;
    if (ampm(prev) !== ampm(next)) sfx.flip(ampm(next) === 'PM');
    else if (hourIdx(prev) !== hourIdx(next)) sfx.tock();
    else sfx.tick(mod(next, 60) % 5 === 0);
    if (state.mode === 'quiz' && state.target != null && state.hint) {
      const tm = mod(state.target, 60), th = hourIdx(state.target);
      if (mod(next, 60) === tm && mod(prev, 60) !== tm) sfx.align(true);
      else if (hourIdx(next) === th && hourIdx(prev) !== th) sfx.align(false);
    }
  }
  // Jumps (Now, anchors): each hand turns clockwise on its own to its new position.
  function animateTo(to) {
    stopAnim();
    const h0 = mod(state.t, 720) * 0.5, m0 = mod(state.t, 60) * 6;
    const h1 = mod(to, 720) * 0.5, m1 = mod(to, 60) * 6;
    const dh = mod(h1 - h0, 360), dm = mod(m1 - m0, 360);
    if ((dh === 0 && dm === 0) || reduceMotion()) { state.t = to; render(); sfx.tock(); return; }
    const dur = Math.min(1000, 420 + Math.max(dh, dm) * 1.6);
    const start = performance.now();
    const ease = x => 1 - Math.pow(1 - x, 3);
    const half = to >= 720 ? 720 : 0;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur), e = ease(p);
      const ang = { h: mod(h0 + dh * e, 360), m: mod(m0 + dm * e, 360) };
      render(half + (Math.floor(ang.h / 30) % 12) * 60 + Math.round(ang.m / 6) % 60, ang);
      if (p < 1) state.anim.raf = requestAnimationFrame(tick);
      else { state.anim = null; state.t = to; render(); sfx.tock(); }
    };
    state.anim = { raf: requestAnimationFrame(tick) };
  }

  // ---- Quiz ----
  function newTarget() {
    let tg;
    do { tg = Math.floor(Math.random() * 1440); } while (mod(tg, 720) === mod(state.t, 720));
    state.target = tg;
    state.hint = false;
  }
  const isMatch = () => state.mode === 'quiz' && state.target != null && !state.flipping
    && mod(state.t, 720) === mod(state.target, 720);
  function checkMatch() {
    if (!isMatch() || state.celebrating) return;
    state.celebrating = true;
    $('live').textContent = 'You got it!';
    $('rim').setAttribute('class', 'rim win');
    $('readout').classList.add('win');
    titleEl.classList.add('win');
    sfx.win();
    if (!reduceMotion()) burst();
    const id = setTimeout(() => {
      $('rim').setAttribute('class', 'rim');
      $('readout').classList.remove('win');
      titleEl.classList.remove('win');
      state.celebrating = false;
      if (state.mode === 'quiz') { newTarget(); flipTo(state.target); }
    }, 1500);
    timers.push(() => clearTimeout(id));
  }
  let flipTimers = [];
  function cancelFlip() { flipTimers.forEach(clearTimeout); flipTimers = []; state.flipping = false; }
  timers.push(cancelFlip);
  function flipTo(target) {
    cancelFlip();
    if (titleKey !== 'quiz') { buildTargetTitle(); titleKey = 'quiz'; setTargetChars(state.t); }
    if (reduceMotion()) { render(); return; }
    const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    const DIGITS = '0123456789'.split('');
    const mm = pad2(mod(target, 60));
    const chars = [
      { el: $('tH'), seq: HOURS, to: HOURS.indexOf(String(hourLabel(target))), delay: 0 },
      { el: $('tM1'), seq: DIGITS.slice(0, 6), to: Number(mm[0]), delay: 90 },
      { el: $('tM2'), seq: DIGITS, to: Number(mm[1]), delay: 180 },
      { el: $('tAP'), seq: ['AM', 'PM'], to: ampm(target) === 'AM' ? 0 : 1, delay: 260 },
    ];
    const STEP = 62;
    state.flipping = true;
    let pending = chars.length;
    chars.forEach(c => {
      const len = c.seq.length;
      let from = c.seq.indexOf(c.el.textContent);
      if (from < 0) from = 0;
      let steps = mod(c.to - from, len);
      const minSteps = len === 2 ? 2 : 4;
      while (steps < minSteps) steps += len;
      for (let s = 1; s <= steps; s++) {
        flipTimers.push(setTimeout(() => {
          c.el.textContent = c.seq[mod(from + s, len)];
          if (c.el.animate) {
            c.el.animate([{ transform: 'rotateX(-80deg)', opacity: 0.5 }, { transform: 'rotateX(0deg)', opacity: 1 }],
              { duration: STEP - 6, easing: 'cubic-bezier(.3,.7,.4,1)' });
          }
          sfx.flap();
          if (s === steps && --pending === 0) {
            flipTimers.push(setTimeout(() => {
              flipTimers = [];
              state.flipping = false;
              sfx.tock();
              render();
              checkMatch();
            }, 120));
          }
        }, c.delay + s * STEP));
      }
    });
    render();
  }
  function burst() {
    const g = $('burst');
    const parts = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', i % 2 ? 4 : 3);
      c.setAttribute('style', `fill: var(${i % 2 ? '--hour' : '--minute'})`);
      g.appendChild(c);
      parts.push({ c, a: (i / 16) * 360 + Math.random() * 12, d: 70 + Math.random() * 40 });
    }
    const start = performance.now(), dur = 800;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      parts.forEach(o => {
        const q = polar(o.a, 12 + o.d * e);
        o.c.setAttribute('cx', q[0]); o.c.setAttribute('cy', q[1]);
        o.c.setAttribute('opacity', String(1 - p));
      });
      if (p < 1) requestAnimationFrame(tick); else while (g.firstChild) g.removeChild(g.firstChild);
    };
    requestAnimationFrame(tick);
  }

  function selectAnchor(key) {
    const a = anchorByKey(key);
    if (!a) return;
    sfx.unlock(); sfx.pop(true);
    cancelFlip();
    state.mode = 'example';
    state.example = key;
    state.target = null;
    render();
    animateTo(a.time);
  }

  // ---- Input ----
  if (full) {
    const pointerDeg = e => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return mod(Math.atan2(p.x - C, -(p.y - C)) * 180 / Math.PI, 360);
    };
    const angDist = (a, b) => { const d = mod(a - b, 360); return Math.min(d, 360 - d); };

    listen(svg, 'pointerdown', e => {
      if (e.button > 0) return;
      const handEl = e.target.closest && e.target.closest('[data-hand]');
      let hand = handEl ? handEl.getAttribute('data-hand') : null;
      if (!hand) {
        const deg = pointerDeg(e);
        const dm = angDist(deg, mod(state.t, 60) * 6), dh = angDist(deg, mod(state.t, 720) * 0.5);
        const best = dm <= dh ? ['minute', dm] : ['hour', dh];
        if (best[1] > 22) return;
        hand = best[0];
      }
      e.preventDefault();
      sfx.unlock();
      stopAnim();
      if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
      if (!state.drags[e.pointerId]) state.dragCount++;
      state.drags[e.pointerId] = { hand, lastMinute: mod(state.t, 60) };
    });
    listen(svg, 'pointermove', e => {
      const d = state.drags[e.pointerId];
      if (!d) return;
      const deg = pointerDeg(e);
      const before = state.t;
      if (d.hand === 'minute') {
        const m = Math.round(deg / 6) % 60;
        let delta = m - d.lastMinute;
        if (delta > 30) delta -= 60;
        if (delta < -30) delta += 60;
        if (delta === 0) return;
        setMinute(m, delta);
        d.lastMinute = m;
      } else {
        setHour(Math.round(deg / 30));
      }
      if (state.t !== before) { onKidMove(); render(); playChange(before, state.t); }
    });
    const endDrag = e => {
      if (!state.drags[e.pointerId]) return;
      delete state.drags[e.pointerId];
      state.dragCount--;
      if (state.dragCount <= 0) { state.dragCount = 0; svg.classList.remove('dragging'); }
      checkMatch();
    };
    listen(svg, 'pointerup', endDrag);
    listen(svg, 'pointercancel', endDrag);

    const onKey = (e, hand) => {
      const keys = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      sfx.unlock();
      stopAnim();
      const before = state.t;
      if (hand === 'minute') setMinute(mod(state.t, 60) + keys[e.key], keys[e.key]);
      else setHour(hourIdx(state.t) + (keys[e.key] > 0 ? 1 : -1));
      onKidMove();
      render();
      playChange(before, state.t);
      checkMatch();
    };
    listen($('handleMin'), 'keydown', e => onKey(e, 'minute'));
    listen($('handleHour'), 'keydown', e => onKey(e, 'hour'));

    listen($('btnNow'), 'click', () => {
      sfx.unlock(); sfx.pop(false);
      cancelFlip();
      state.mode = 'now';
      state.target = null; state.example = null;
      render();
      animateTo(realNow());
    });
    listen($('btnQuiz'), 'click', () => {
      sfx.unlock();
      stopAnim();
      // First tap: a new time flips in. Second tap: ghost hands as a hint. Third: a new time.
      if (state.mode === 'quiz' && !state.hint && !state.flipping) {
        state.hint = true;
        sfx.align(true);
        render();
        return;
      }
      sfx.pop(true);
      state.mode = 'quiz'; state.example = null;
      newTarget();
      flipTo(state.target);
    });
    listen($('grid'), 'click', e => {
      const b = e.target.closest && e.target.closest('.btn.ex');
      if (b) selectAnchor(b.getAttribute('data-key'));
    });
    if (cfg.closable) listen($('btnClose'), 'click', () => cfg.emit('lt-close', {}));
  } else {
    // Face mode: the whole dial is one control that asks the host to open full mode.
    const face = $('face');
    listen(face, 'click', () => cfg.emit('lt-open', {}));
    listen(face, 'keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cfg.emit('lt-open', {}); }
    });
  }

  // ---- Real time ----
  function syncNow() {
    if (dayKey() !== dateSeen) { dateSeen = dayKey(); anchors = cfg.anchors(); render(); }
    if (state.mode !== 'now' || state.anim || state.dragCount) return;
    const rt = realNow();
    if (rt !== state.t) { state.t = rt; render(); }
  }
  const iv = setInterval(syncNow, 1000);
  timers.push(() => clearInterval(iv));
  listen(document, 'visibilitychange', () => { if (!document.hidden) syncNow(); });

  render();

  return {
    // Location changed, or the day rolled over: anchor times may have moved.
    refresh() {
      anchors = cfg.anchors();
      if (state.mode === 'example' && !anchorByKey(state.example)) { state.mode = 'play'; state.example = null; }
      render();
    },
    destroy() {
      stopAnim();
      if (ro) ro.disconnect();
      timers.forEach(fn => fn());
    },
  };
}

// ---------------------------------------------------------------------------
class LearnTimeElement extends HTMLElement {
  static get observedAttributes() { return ['mode', 'contract', 'no-close']; }
  static get version() { return VERSION; }

  constructor() {
    super();
    this._routine = null;
    this._events = [];
    this._location = null;
    this._clock = null;
    this._ready = false;
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  get routine() { return this._routine; }
  set routine(v) {
    if (v != null && !Array.isArray(v)) { this._error('invalid-routine', 'routine must be an array of {id, time}'); return; }
    this._update(() => { this._routine = v || null; });
  }
  get events() { return this._events; }
  set events(v) {
    if (v != null && !Array.isArray(v)) { this._error('invalid-events', 'events must be an array of {title, start, iconUrl}'); return; }
    this._update(() => { this._events = v || []; });
  }
  get location() { return this._location; }
  set location(v) {
    if (v != null && !(typeof v === 'object' && isFinite(v.lat) && isFinite(v.lng))) {
      this._error('invalid-location', 'location must be {lat, lng}');
      return;
    }
    this._update(() => { this._location = v || null; });
  }
  get mode() { return this.getAttribute('mode') === 'full' ? 'full' : 'face'; }
  set mode(v) { this.setAttribute('mode', v); }
  get version() { return VERSION; }

  connectedCallback() {
    // Properties set before this element was upgraded shadow the accessors; replay them.
    ['routine', 'events', 'location'].forEach(p => {
      if (Object.prototype.hasOwnProperty.call(this, p)) {
        const v = this[p];
        delete this[p];
        this[p] = v;
      }
    });
    ensureFont();
    this._connected = true;
    this._mount();
  }
  disconnectedCallback() { this._connected = false; this._unmount(); }
  attributeChangedCallback(name, oldV, newV) {
    // Initial attributes arrive before connectedCallback; only later changes remount.
    if (oldV !== newV && this._connected) this._mount();
  }

  // Routine anchors and events are the picture buttons in full mode, so a change to
  // which buttons exist rebuilds it; anything else (like new times) just re-renders.
  _buttonIds() {
    return this._anchors().map(a => a.key + '|' + a.label + '|' + a.icon).join(',');
  }
  _update(change) {
    const before = this._buttonIds();
    change();
    if (!this._clock) return;
    if (this.mode === 'full' && this._buttonIds() !== before) this._mount();
    else this._clock.refresh();
  }
  _anchors() { return resolveAnchors(this._routine, this._events, this._location); }
  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  _error(code, message) { this._emit('lt-error', { code, message, version: VERSION }); }
  _unmount() {
    if (this._clock) { this._clock.destroy(); this._clock = null; }
  }
  _mount() {
    this._unmount();
    const root = this._shadow;
    const contract = this.getAttribute('contract');
    if (CONTRACTS.indexOf(contract) < 0) {
      root.innerHTML = `<style>:host{display:block}</style>`;
      this._error('unsupported-contract',
        `contract "${contract == null ? '' : contract}" is not supported; this build supports ${CONTRACTS.join(', ')}`);
      return;
    }
    const mode = this.mode;
    const closable = mode === 'full' && !this.hasAttribute('no-close');
    const anchors = this._anchors();
    root.innerHTML = `<style>${STYLE}</style>` + (mode === 'full' ? fullMarkup(anchors, closable) : faceMarkup());
    this._clock = createClock(this, root, {
      mode,
      closable,
      anchors: () => this._anchors(),
      emit: (t, d) => this._emit(t, d),
    });
    if (!this._ready) {
      this._ready = true;
      // A tick later, so a listener added right after appending still hears it.
      setTimeout(() => this._emit('lt-ready', { version: VERSION, contract }), 0);
    }
  }
}

if (window.customElements && !window.customElements.get('learn-time')) {
  window.customElements.define('learn-time', LearnTimeElement);
}

export { LearnTimeElement, VERSION };
