# Story 3.15d — device sweep: the speech lines, per capture (AC 5, AC 7)

Committed at code review (2026-11-25) because AC 7 asks for each site's outcome "recorded with its log lines (timestamps, trailing
U+00A0 count)" and AC 5 for Y2's "with the log lines", while the dev records kept the raw captures in a session scratchpad only.

- **Source:** the dev session's raw `adb logcat -v time` captures (`cap-<site>-<pin|new>[-x].txt`, 27 files, 4504 lines, taken
  2026-11-25 16:01–16:44 emulator time on `Pixel_9`), read by the SAME extractor the dev used (`cap.sh speech`, run unchanged with
  `python3 -I`): a `MARK` line is a tap marker written with `adb shell log -t MARK` just before the tap; a speech line is TalkBack's
  "TTS is not ready … {text:…}" (TTS was off for the capture, so TalkBack logs what it WOULD say). The text is shown with its
  trailing U+00A0s stripped and their COUNT in the middle column (`lib/announce.ts` appends n of them to the n-th identical send on
  Android). `pin` = the pristine worktree at `9df1818e`; `new` = this branch at `21fec993`. Lines below are copied byte-for-byte from
  the extractor's output; nothing is added or removed. Emulator clock: a few seconds behind the Mac's (read ORDER, ⛔ wall time).
- **How to read an outcome:** a site is FIXED when the pin shows a repeat with NO speech line after its marker and the branch shows one
  line per marker with 0 / 1 / 2 trailing U+00A0. ". Alert" on a pin line is the live-region / alert-role re-read of the old
  `AnnouncedText`; the branch's lines carry no suffix (a direct `announce()`).
- **Capture by capture, where a line is not a plain outcome** (the marker times are in the table at the end):
  - `s1-pin` — the first empty Submit on the pin, taken before markers were used: spoken once ("… Alert").
  - `s1-pin-b` — tap 1's speech is "keyboard hidden" (Gboard took the tap — the Debug Log's trap); tap 2 is the first Submit that
    reached the screen, spoken once. `s1-pin-c` — the two identical re-sets that follow: no speech line after either marker (the pin
    defect).
  - `s2-pin-a`, `s8-pin-a` — no speech line after the Show-more marker; redone as `s2-pin-b` / `s8-pin-a2`, which speak. That the first
    tap was swallowed (the dev-warnings toast — the Debug Log's trap) is a reading; the Debug Log does not name these captures.
  - `s2-pin-c` — Retry 1 has a speech line 0.96 s after its marker (". Alert"): the Debug Log reads it as the live region's
    press-time re-read, not the Retry's failure. Retry 2 (`s2-pin-c`) and Retries 3–5 (`s2-pin-d`) are silent.
  - `s8-pin-b` — Retry 1 has a speech line 82 ms after its MARKER (". Alert") — by its timing too soon to be the Retry's failure (a reading: the marker is written just BEFORE the tap). The
    Debug Log calls an early S8 speech a UI-dump artifact and says it was redone; this is that capture by its timing, and its redo is
    `s8-pin-c` (Retries 3–4, silent). Retry 2 (`s8-pin-b`) is silent.
  - `y2a-pin` — "TalkBack on" and the app-title / Navigate-up lines are the capture starting with TalkBack being switched on.
- **⛔ in this file:** the speech-ON listen (AC 8) — no text capture was taken for it; its record is BigDev's words alone.
- **After these captures** the code review changed S7's effect: a picker that remounts over a cached districts failure (its mount
  refetch running) speaks the line at the mount and ⛔ again when that refetch fails. The S7 lines below are from `21fec993`, BEFORE that
  change; see `deferred-work.md` (S7) for why the paths they show (a stale cache failing, then Retry ×2) are unchanged.

```text
### s1-new
  ── ( 9424): S1-new-tap1
  16:23:07.035 | trailing-U+00A0=0 | जब आप तैयार हों, कृपया अपना पता दर्ज करें।
  ── ( 9433): S1-new-tap2
  16:23:13.057 | trailing-U+00A0=1 | जब आप तैयार हों, कृपया अपना पता दर्ज करें।
  ── ( 9440): S1-new-tap3
  16:23:19.678 | trailing-U+00A0=2 | जब आप तैयार हों, कृपया अपना पता दर्ज करें।
  ── ( 9447): S1-new-end
### s1-pin-b
  16:02:16.639 | trailing-U+00A0=0 | Check out useful Gboard tools in the menu
  ── ( 7739): S1-pin-tap1-empty-submit
  16:02:18.602 | trailing-U+00A0=0 | keyboard hidden
  ── ( 7748): S1-pin-tap2-empty-submit-again
  16:02:22.884 | trailing-U+00A0=0 | जब आप तैयार हों, कृपया अपना पता दर्ज करें।. Alert
  ── ( 7757): S1-pin-end
### s1-pin-c
  ── ( 7784): S1-pin-setagain-1
  ── ( 7791): S1-pin-setagain-2
  ── ( 7800): S1-pin-end
### s1-pin
  16:01:46.731 | trailing-U+00A0=0 | जब आप तैयार हों, कृपया अपना पता दर्ज करें।. Alert
### s2-new-a
  ── (10728): S2-new-show-more-net-off
  16:33:56.332 | trailing-U+00A0=0 | आपका इतिहास नहीं खुल सका। कृपया दोबारा कोशिश करें।
  ── (10736): S2-new-end-a
### s2-new-b
  ── (10778): S2-new-retry-1
  16:34:35.193 | trailing-U+00A0=1 | आपका इतिहास नहीं खुल सका। कृपया दोबारा कोशिश करें।
  ── (10793): S2-new-retry-2
  16:34:44.599 | trailing-U+00A0=2 | आपका इतिहास नहीं खुल सका। कृपया दोबारा कोशिश करें।
  ── (10806): S2-new-end-b
### s2-pin-a
  ── (11138): S2-pin-show-more-net-off
  ── (11145): S2-pin-end-a
### s2-pin-b
  ── (11274): S2-pin-show-more-net-off
  16:38:49.992 | trailing-U+00A0=0 | आपका इतिहास नहीं खुल सका। कृपया दोबारा कोशिश करें।. Alert
  ── (11284): S2-pin-end-b
### s2-pin-c
  ── (11327): S2-pin-retry-1
  16:39:31.578 | trailing-U+00A0=0 | आपका इतिहास नहीं खुल सका। कृपया दोबारा कोशिश करें।. Alert
  ── (11342): S2-pin-retry-2
  ── (11355): S2-pin-end-c
### s2-pin-d
  ── (11363): S2-pin-retry-3
  ── (11377): S2-pin-retry-4
  ── (11390): S2-pin-retry-5
  ── (11403): S2-pin-end-d
### s7-new-a
  ── (10082): S7-new-open-picker-stale-cache-net-off
  16:28:40.107 | trailing-U+00A0=0 | ज़िले नहीं खुल सके। कृपया दोबारा कोशिश करें।
  ── (10089): S7-new-end-a
### s7-new-b
  ── (10132): S7-new-retry-1
  16:29:21.306 | trailing-U+00A0=1 | ज़िले नहीं खुल सके। कृपया दोबारा कोशिश करें।
  ── (10140): S7-new-retry-2
  16:29:30.474 | trailing-U+00A0=2 | ज़िले नहीं खुल सके। कृपया दोबारा कोशिश करें।
  ── (10147): S7-new-end-b
### s7-pin-a
  ── ( 8649): S7-pin-open-picker-stale-cache-net-off
  16:16:00.680 | trailing-U+00A0=0 | ज़िले नहीं खुल सके। कृपया दोबारा कोशिश करें।. Alert
  ── ( 8657): S7-pin-end-a
### s7-pin-b
  ── ( 8703): S7-pin-retry-1
  ── ( 8711): S7-pin-retry-2
  ── ( 8718): S7-pin-end-b
### s8-new-a
  ── (10330): S8-new-show-more-net-off
  16:30:56.281 | trailing-U+00A0=0 | सूची नहीं खुल सकी। कृपया दोबारा कोशिश करें।
  ── (10338): S8-new-end-a
### s8-new-b
  ── (10346): S8-new-retry-1
  16:31:27.555 | trailing-U+00A0=1 | सूची नहीं खुल सकी। कृपया दोबारा कोशिश करें।
  ── (10354): S8-new-retry-2
  16:31:37.076 | trailing-U+00A0=2 | सूची नहीं खुल सकी। कृपया दोबारा कोशिश करें।
  ── (10365): S8-new-end-b
### s8-pin-a
  ── ( 8973): S8-pin-show-more-net-off
  ── ( 8981): S8-pin-end-a
### s8-pin-a2
  ── ( 9032): S8-pin-show-more-net-off-2
  16:18:27.851 | trailing-U+00A0=0 | सूची नहीं खुल सकी। कृपया दोबारा कोशिश करें।. Alert
  ── ( 9040): S8-pin-end-a2
### s8-pin-b
  ── ( 9082): S8-pin-retry-1
  16:18:55.285 | trailing-U+00A0=0 | सूची नहीं खुल सकी। कृपया दोबारा कोशिश करें।. Alert
  ── ( 9090): S8-pin-retry-2
  ── ( 9097): S8-pin-end-b
### s8-pin-c
  ── ( 9139): S8-pin-retry-3
  ── ( 9148): S8-pin-retry-4
  ── ( 9155): S8-pin-end-c
### w1-new
  ── ( 9498): W1-new-tap-English
  16:24:05.027 | trailing-U+00A0=0 | Language
  ── ( 9509): W1-new-tap-Hindi
  16:24:10.839 | trailing-U+00A0=0 | भाषा
  16:24:24.148 | trailing-U+00A0=0 | आपकी पसंद इस फ़ोन पर सहेज ली गई है, पर अभी आपके खाते में दर्ज नहीं हो सकी। हम फिर कोशिश करेंगे।
  ── ( 9517): W1-new-end
### w1-pin
  ── ( 7905): W1-pin-tap-English
  16:03:43.331 | trailing-U+00A0=0 | Language
  ── ( 7917): W1-pin-tap-Hindi
  16:03:48.342 | trailing-U+00A0=0 | भाषा
  16:03:58.208 | trailing-U+00A0=0 | Your choice is saved on this phone, but we could not record it on your account yet. We will try again.
  16:04:03.250 | trailing-U+00A0=0 | आपकी पसंद इस फ़ोन पर सहेज ली गई है, पर अभी आपके खाते में दर्ज नहीं हो सकी। हम फिर कोशिश करेंगे।
  ── ( 7927): W1-pin-end
### y2-new-b
  ── ( 9812): Y2-new-b-switch-to-English
  16:27:05.710 | trailing-U+00A0=0 | Did someone help you register?
  16:27:06.156 | trailing-U+00A0=0 | Language
  ── ( 9825): Y2-new-b-switch-to-Hindi
  16:27:13.554 | trailing-U+00A0=2 | क्या किसी ने पंजीकरण में आपकी मदद की?
  16:27:13.985 | trailing-U+00A0=0 | भाषा
  ── ( 9835): Y2-new-b-end
### y2-new
  ── ( 9613): Y2-new-switch-to-English
  16:25:26.870 | trailing-U+00A0=0 | Language
  ── ( 9623): Y2-new-switch-to-Hindi
  16:25:34.314 | trailing-U+00A0=0 | भाषा
  ── ( 9632): Y2-new-end
### y2-pin
  ── ( 8023): Y2-pin-switch-to-English
  16:04:53.037 | trailing-U+00A0=0 | Did someone help you register?
  16:04:53.131 | trailing-U+00A0=0 | Language
  ── ( 8033): Y2-pin-switch-to-Hindi
  16:04:59.190 | trailing-U+00A0=1 | क्या किसी ने पंजीकरण में आपकी मदद की?
  16:04:59.230 | trailing-U+00A0=0 | भाषा
  ── ( 8042): Y2-pin-end
### y2a-pin
  16:08:45.717 | trailing-U+00A0=0 | TalkBack on
  ── ( 8390): Y2a-pin-home-switch-to-English
  16:08:48.332 | trailing-U+00A0=0 | TWT P0-5 Prototype
  16:08:49.265 | trailing-U+00A0=0 | Navigate up. Button
  16:08:51.929 | trailing-U+00A0=0 | Language
  ── ( 8407): Y2a-pin-home-switch-to-Hindi
  16:08:57.210 | trailing-U+00A0=0 | भाषा
  ── ( 8415): Y2a-pin-end
### z1-new
  ── (11674): Z1-new-tap-English
  16:43:48.281 | trailing-U+00A0=0 | Language
  16:44:02.084 | trailing-U+00A0=0 | Your choice is saved on this phone, but we could not record it on your account yet. We will try again.
  ── (11686): Z1-new-before-CONT
  ── (11688): Z1-new-end
```

## Marker times

Each tap marker's own logcat timestamp (`grep ' I/MARK'` over the same raw captures; the block above prints markers without a time). Capture | time | marker.

```text
s1-new | 16:23:06.328 | S1-new-tap1
s1-new | 16:23:12.783 | S1-new-tap2
s1-new | 16:23:19.267 | S1-new-tap3
s1-new | 16:23:25.648 | S1-new-end
s1-pin-b | 16:02:17.636 | S1-pin-tap1-empty-submit
s1-pin-b | 16:02:22.777 | S1-pin-tap2-empty-submit-again
s1-pin-b | 16:02:28.872 | S1-pin-end
s1-pin-c | 16:02:39.598 | S1-pin-setagain-1
s1-pin-c | 16:02:45.704 | S1-pin-setagain-2
s1-pin-c | 16:02:51.811 | S1-pin-end
s2-new-a | 16:33:53.266 | S2-new-show-more-net-off
s2-new-a | 16:34:07.564 | S2-new-end-a
s2-new-b | 16:34:31.001 | S2-new-retry-1
s2-new-b | 16:34:40.336 | S2-new-retry-2
s2-new-b | 16:34:49.719 | S2-new-end-b
s2-pin-a | 16:37:36.771 | S2-pin-show-more-net-off
s2-pin-a | 16:37:51.127 | S2-pin-end-a
s2-pin-b | 16:38:46.993 | S2-pin-show-more-net-off
s2-pin-b | 16:39:01.385 | S2-pin-end-b
s2-pin-c | 16:39:30.619 | S2-pin-retry-1
s2-pin-c | 16:39:40.029 | S2-pin-retry-2
s2-pin-c | 16:39:49.394 | S2-pin-end-c
s2-pin-d | 16:40:33.537 | S2-pin-retry-3
s2-pin-d | 16:40:42.974 | S2-pin-retry-4
s2-pin-d | 16:40:52.369 | S2-pin-retry-5
s2-pin-d | 16:41:01.705 | S2-pin-end-d
s7-new-a | 16:28:37.948 | S7-new-open-picker-stale-cache-net-off
s7-new-a | 16:28:50.226 | S7-new-end-a
s7-new-b | 16:29:19.677 | S7-new-retry-1
s7-new-b | 16:29:28.902 | S7-new-retry-2
s7-new-b | 16:29:38.159 | S7-new-end-b
s7-pin-a | 16:15:59.248 | S7-pin-open-picker-stale-cache-net-off
s7-pin-a | 16:16:11.357 | S7-pin-end-a
s7-pin-b | 16:16:25.952 | S7-pin-retry-1
s7-pin-b | 16:16:34.060 | S7-pin-retry-2
s7-pin-b | 16:16:42.161 | S7-pin-end-b
s8-new-a | 16:30:53.266 | S8-new-show-more-net-off
s8-new-a | 16:31:07.553 | S8-new-end-a
s8-new-b | 16:31:24.617 | S8-new-retry-1
s8-new-b | 16:31:34.015 | S8-new-retry-2
s8-new-b | 16:31:43.423 | S8-new-end-b
s8-pin-a | 16:17:52.515 | S8-pin-show-more-net-off
s8-pin-a | 16:18:04.606 | S8-pin-end-a
s8-pin-a2 | 16:18:26.467 | S8-pin-show-more-net-off-2
s8-pin-a2 | 16:18:40.578 | S8-pin-end-a2
s8-pin-b | 16:18:55.203 | S8-pin-retry-1
s8-pin-b | 16:19:04.292 | S8-pin-retry-2
s8-pin-b | 16:19:13.398 | S8-pin-end-b
s8-pin-c | 16:19:55.040 | S8-pin-retry-3
s8-pin-c | 16:20:04.159 | S8-pin-retry-4
s8-pin-c | 16:20:13.265 | S8-pin-end-c
w1-new | 16:24:03.534 | W1-new-tap-English
w1-new | 16:24:08.834 | W1-new-tap-Hindi
w1-new | 16:24:34.121 | W1-new-end
w1-pin | 16:03:43.051 | W1-pin-tap-English
w1-pin | 16:03:48.170 | W1-pin-tap-Hindi
w1-pin | 16:04:13.297 | W1-pin-end
y2-new-b | 16:27:04.631 | Y2-new-b-switch-to-English
y2-new-b | 16:27:12.070 | Y2-new-b-switch-to-Hindi
y2-new-b | 16:27:19.478 | Y2-new-b-end
y2-new | 16:25:25.852 | Y2-new-switch-to-English
y2-new | 16:25:33.110 | Y2-new-switch-to-Hindi
y2-new | 16:25:40.459 | Y2-new-end
y2-pin | 16:04:52.752 | Y2-pin-switch-to-English
y2-pin | 16:04:58.950 | Y2-pin-switch-to-Hindi
y2-pin | 16:05:05.156 | Y2-pin-end
y2a-pin | 16:08:48.279 | Y2a-pin-home-switch-to-English
y2a-pin | 16:08:54.940 | Y2a-pin-home-switch-to-Hindi
y2a-pin | 16:09:01.347 | Y2a-pin-end
z1-new | 16:43:46.604 | Z1-new-tap-English
z1-new | 16:44:05.995 | Z1-new-before-CONT
z1-new | 16:44:16.172 | Z1-new-end
```
