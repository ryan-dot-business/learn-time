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

  Sunrise and sunset are estimated from the device's time zone.

All sounds are synthesized in the browser, so there are no audio files.

## Running it

It's a static site with no build step: open `index.html` in a browser, or serve the folder with any static server:

```sh
python3 -m http.server
```

## Deploying

Every push to `main` deploys the site to GitHub Pages through `.github/workflows/pages.yml`.

## Files

- `index.html`: the whole toy (markup, styles and script)
- `images/`: the time example pictures
- `og-image.png`: the 1200×630 link preview image
- `favicon.svg`, `apple-touch-icon.png`: icons. While the page is open, the browser-tab icon is redrawn to show the current hour.

Designs are in the Figma file "Learn Time".
