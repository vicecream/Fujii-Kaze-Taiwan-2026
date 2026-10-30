# Fujii Kaze Kaohsiung fan guide design

## 1. Atmosphere and identity

A compact Traditional Chinese concert guide for Fujii Kaze's Prema World Tour in Kaohsiung on October 31, 2026. Official Kaohsiung poster photography carries the mood. The experience prioritizes finding event information and preparing with released music on a phone, including in a dark venue.

The primary home action is the 19-song preparation list. It is album material, not a prediction of the show's songs or their order. This opening-show guide has no spoiler gate, shuffled setlist, or concert-order confirmation.

## 2. Color and typography

Use dark olive and warm gold around the official poster, with cream text. Reading, playback, and pending-information pages use semantic neutral colors: `--ui-bg`, `--ui-surface`, `--ui-raised`, `--ui-text`, `--ui-muted`, and `--ui-line`. Light mode uses pale neutral surfaces; dark mode uses charcoal. Follow the device preference until the visitor chooses a theme, then remember it. The home poster stays dark in both modes.

Use the Taiwan-common system stack PingFang TC, Microsoft JhengHei, and Noto Sans CJK TC for reading and controls. A restrained serif face may express the Prema title; do not apply it to controls or dense information. Japanese lyric text uses Noto Sans JP first. English originals remain English and do not receive kana or romaji. Label the common lyric switch “原文”.

In Chinese and Japanese lyrics, keep one half-width space between CJK characters and adjacent half-width Latin letters or digits, following [盤古之白](https://www.jkg.tw/p3601/). Preserve Traditional Chinese phrases, avoid wide body-text tracking, and use monospace tabular digits for the countdown.

## 3. Layout and components

The home hero owns its centered narrow column. Guide and pending-setlist pages keep the 640px reading width. Playback retains the two-column layout above 900px. Use a 4px rhythm, 16–20px row insets, 24–32px between decisions, and 40–44px touch targets.

The control layer uses `--space-1` through `--space-4`, `--control-height`, `--touch-height`, and `--dock-height`. Reserve pill shapes for compact controls and the song dock, and restrained shadows for overlays.

- **Home:** official poster, artist and tour, one show date, entry and start times, then the preparation action and expandable facts.
- **Information cards:** shared dark surfaces and dividers. Create lazy image content only after expansion. Keep useful booking, map, and official-announcement links; retain source and verification records in documentation rather than repeating audit dates or source footnotes in the home UI.
- **Song list:** clear album grouping in default order; title first, stable track number and supporting details second. Search stays persistently labelled.
- **Pending content:** show separate original, translation, and timing status in plain language. Offer an official listening/source link. Pending content is an ordinary state, not a retry error.
- **Lyrics:** only timed lyrics participate in current-line focus, seeking, or karaoke. LRC previews allow line-level karaoke, with word-level progress gated on aligned timing. Untimed originals remain readable at full opacity. Hide kana/romaji controls for English songs; unavailable controls must not imply completed content.
- **Player controls:** a dedicated bottom utility bar and previous/current/next dock reserve space so they do not cover lyrics. Show useful loading or failure text and an external official YouTube link.
- **Pending setlist:** a direct status message and preparation link. Do not put a gate or viewing-mode choice in front of it.
- **Source identity:** retain “非官方粉絲製作” and program-source credits. Historical artist references belong to provenance or old records, not current event facts.

No audience-action colors or motion appear without a confirmed cue for the current artist and song. The old Japanese/Korean chant comparison and inherited Vaundy action footage are removed.

## 4. Motion, accessibility, and state

Use short color and opacity transitions, respect reduced-motion preferences, and avoid decorative pulsing or layout movement. Keep visible keyboard focus, readable arena contrast, meaningful icon labels, and phrase-preserving Traditional Chinese wrapping.

Collapsed information panels and inactive screens stay out of keyboard and screen-reader navigation. Song-picker and notice dialogs move focus inside on open and return it to the trigger on close. Sort controls expose pressed state. Phone search text stays at least 16px.

Count down in `Asia/Taipei` even when the device uses another timezone. After 19:00 show “已開演”; do not invent an end time. On the following local date show that the event date has passed.

Theme and lyric preferences remain available across songs. Pending or untimed data must not start synchronization, fetch misleading word timings, or trigger false “all lyrics hidden” messages. Offline notices should explain what remains available and that video playback requires a connection.
