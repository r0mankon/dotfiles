// Plate map — copy to <project>/plates.mjs and edit. One entry per shot of
// the real app. Run: node <skill>/scripts/plate.mjs <name> --plates plates.mjs
//
// PlateSpec
//   url                 path relative to config.baseUrl ('/u/demo'), or absolute
//   seconds             how long to roll; the composition can always cut shorter
//   fps                 default 30 — match the composition's fps
//   auth                'none' | 'session' (session.json cookie set first-party)
//   viewport            { w: 390, h: 844, scale: 2 } → 780x1688 PNGs
//   settle(page)        async, runs ONCE before the clock starts; has puppeteer
//                       `page`. Anything that must be true for every frame.
//   drive               SOURCE of `async t => {}` run IN the page each frame.
//                       Pure in t: same t → same DOM. One-shot side effects must
//                       be guarded by a window flag.
//   unfreezeAt          seconds; drop the animation freeze from here on. Only
//                       when the app's own animation IS the beat.
//   hide                CSS selectors, RegExp objects or '/re/i' strings. Regex
//                       entries hide the closest block around matching text and
//                       are re-applied every frame (late-mounted chips) — they
//                       cost a DOM walk per frame, so prefer selectors.
//   forbidOnLastFrame   text (regex) or selectors that must NOT be on the final
//                       frame. plate.mjs fails the shot if they are.
//   endOnFrame          'last' (default: check the final frame, fail loudly) |
//                       'holdSafe' (the moment forbidden text appears, stop
//                       driving and repeat the last clean frame to the end).
//
// The LAST frame is what the viewer sees longest — compositions hold on it.

// React controlled inputs ignore `el.value = x`; go through the prototype
// setter and fire `input` so state updates. Kept as a string so it can be
// pasted into drive sources (drive runs in the page, not in Node).
const SET_VALUE = `
   const setValue = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
   };
`;

export default {
   // A public page: a visitor types into the main composer. Types but does NOT
   // submit — the app paints a confirmation screen within ~100ms of a send,
   // and that screen (not the typing) would become the held last frame.
   'type-a-message': {
      url: '/u/demo-handle',
      seconds: 4.5,
      auth: 'none',
      // Decorative widgets that can be caught mid-animation on frame 0, and
      // anything that identifies a real person, go before the camera rolls.
      hide: ['button[aria-label*="QR" i]', /install the app/i],
      // If this text is on the final frame the send happened — and the shot
      // is the act of typing, not the receipt.
      forbidOnLastFrame: [/^sent/im, /message sent/i],
      endOnFrame: 'last',
      drive: `async t => {
         ${SET_VALUE}
         const ta = document.querySelector('textarea');
         if (!ta) return;
         const MSG = 'saying the thing i never said out loud.';
         // Starts typing at 0.5s so frame 0 is already a focused, live field
         // (never an idle app-state frame 0) and a held beat before the
         // second clause reads as a person deciding whether to send.
         const shifted = t > 2.6 ? t - 0.45 : t;
         const n = Math.max(0, Math.min(MSG.length, Math.floor((shifted - 0.5) * 20)));
         const next = MSG.slice(0, n);
         if (ta.value !== next) setValue(ta, next);
         ta.focus();
      }`,
   },

   // A signed-in dashboard: scroll between two anchors with an ease so the
   // pan reads as a thumb, not a scrollbar drag. Holds at both ends so the
   // composition has clean in/out frames to cut on.
   'dashboard-scroll': {
      url: '/dashboard',
      seconds: 7,
      auth: 'session',
      // Dev-only chips: local traffic shows its referrer as "localhost" where a
      // real page would show a platform name. Rather than fake it, hide it.
      hide: [/^localhost$/i, /via localhost$/i, /^viewed \d+×$/i, '[data-install-banner]'],
      settle: async page => {
         // Measure the two anchors once, in the page, and park on the first.
         // Reading layout in settle (not in drive) keeps drive pure in t.
         await page.evaluate(() => {
            const topOf = sel => {
               const el = document.querySelector(sel);
               return el ? el.getBoundingClientRect().top + window.scrollY - 24 : 0;
            };
            window.__from = topOf('[data-section="overview"]');
            window.__to = topOf('[data-section="activity"]');
            window.scrollTo(0, window.__from);
         });
         await new Promise(r => setTimeout(r, 500));
      },
      drive: `async t => {
         const from = window.__from || 0;
         const to = window.__to || from + 600;
         // hold 1s → ease 4s → hold 2s. Cubic in-out: fast middle, soft ends.
         const k = Math.min(1, Math.max(0, (t - 1) / 4));
         const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
         window.scrollTo(0, from + (to - from) * eased);
      }`,
   },

   // Click one element and hold on the result. The click is a one-shot side
   // effect guarded by a window flag so re-running drive for any later t does
   // not click again. Settle scrolls the trigger into view first so frame 0 is
   // already the right part of the page.
   'drawer-open': {
      url: '/u/demo-handle',
      seconds: 5,
      auth: 'none',
      hide: ['button[aria-label*="QR" i]'],
      settle: async page => {
         await page.evaluate(() => {
            const trigger = document.querySelector('[data-drawer-trigger]');
            if (!trigger) return;
            const top = trigger.getBoundingClientRect().top + window.scrollY - 160;
            window.scrollTo(0, Math.max(0, top));
         });
         await new Promise(r => setTimeout(r, 500));
      },
      // If the drawer is one that can navigate away (a link rail, say), name
      // the screen you never want held and let holdSafe freeze before it.
      forbidOnLastFrame: [/page not found/i],
      endOnFrame: 'holdSafe',
      drive: `async t => {
         // 0.8s of the closed state first — frame 0 mid-scroll-settle, not a
         // drawer already open (the opening IS the shot).
         if (t < 0.8 || window.__opened) return;
         window.__opened = true;
         const trigger = document.querySelector('[data-drawer-trigger]');
         // .click() is cancelable so the app's own handler can preventDefault
         // and open the drawer; a hand-built MouseEvent without cancelable
         // would navigate instead.
         trigger?.click();
         // Give the app a beat to mount the drawer; with the freeze on it
         // lands in its end state by the next frame.
         await new Promise(r => setTimeout(r, 300));
         document.activeElement?.blur();
      }`,
   },
};
