# Glamour House: Handoff

## What this is
A website for **The Glamour House (GH), Modelling Agency**, a collective of fashion-inclined people. The site shows the shoot plan, a gallery, an idea board, a Join Us section and the GH x CUFS collaboration.

- Live page: https://claude.ai/artifact/5QFjn9wjCsyppquZktkBwG
- Format: one self-contained HTML file, published as a Claude artifact. Comments from the artifact's comment thread are handled in chat.
- Owner/requester: JohnAyo

## Brand
- Source: the logo the owner shared. A gold and brown "GH" monogram with a small diamond, on a cream background, with "THE GLAMOUR HOUSE" in gold caps and "MODELLING AGENCY" in thin, wide-spaced black caps.
- Site styling follows it: warm cream background, gold gradient, brown shadow, Cinzel for headings, Jost for body text. Dark mode uses deep brown with bright gold.
- The logo is **recreated in CSS** (gradient text, drop shadow, inline SVG diamond), not the original image file. The real logo could be embedded if wanted.

## Shoot order (from the meeting)
1. Pre-Launch: Met Gala themed college shoot, with Demilade
2. Launch: with CUFS, "go crazy"
3. Skating Community
4. Picnic, medieval: 1 male, 1 female, possibly a chef
5. Runway shoot: "next half"
6. Campaign and promotion shoots: with Toba and Feranmi, for LORE (a streetwear brand)

## Plans and working rules (from the meeting)
- Moodboards for each shoot, to speed up and guide shots, videography, BTS and editing
- Photos are taken first, then videos
- Stay active during Omega Semester/IT
- Hope to branch into fashion-based short films
- Try to bring fashion-inclined people to shoots

## What the site has now
1. **Hero**: GH monogram lockup, "The Glamour House", "Modelling Agency", short intro
2. **Shoots**: the six-shoot list above, plus a "How we work" row with the plans above
3. **Gallery**: grid of placeholder tiles. Clicking a tile opens a pop-up viewer (Close button, click outside or Esc to close). A "Preview photos" button lets a visitor show their own images on their own device only. Nothing is uploaded.
4. **Idea Board**: four equal lanes: Picture, Video, Behind-the-Scenes, Graphics. Each lane has its own add box and a shoot picker. Pinned ideas appear as sticky notes (5 pastel colors, tape strip, slight tilt, handwritten Caveat font, straighten on hover).
5. **Glamour House x CUFS**: short collaboration section, says the launch shoot is with CUFS
6. **Join Us**: three cards: Models, Crew, Others
7. **Footer**

## Technical notes
- Everything is inline in one HTML file (CSS, JS, an inline SVG). External fonts only: Cinzel, Jost, Caveat from Google Fonts.
- Colors are CSS variables at the top of the stylesheet. Light and dark values are defined, so changing the variables restyles the site.
- Idea Board data is kept in the browser with `localStorage` (key `gh-ideas`), wrapped in try/catch. Ideas are **per device, not shared**. Ideas saved before the lanes existed were moved into Picture.
- The shoot list in the Idea Board picker is the `SHOOTS` array in the script.
- To change the live page, edit the artifact with the Artifact tool's "edit" action using the page URL. Do not publish a second copy.
- Remote images and scripts from other hosts are blocked on published pages, so any photos must be embedded in the file or provided through an approved runtime capability.

## Open items
- **Join Us** has no sign-up buttons yet. The owner needs to say how people should apply (email, WhatsApp or form link). A question about this is open in its comment thread.
- **Gallery** only has placeholder tiles. Real shoot photos need to be supplied and embedded.
- **Idea Board is not shared** between visitors. A shared board needs a backend or a shared-data capability.
- **CUFS** is never expanded on the page because the owner did not say what it stands for.
- The meeting note "Picnic-mideveal" was read as "medieval". Confirm.
- "Runway shoot (Next half)" is copied as written. Confirm what "next half" means and what Omega Semester/IT refers to.
- The owner once said "instead of the generic names". The sticky note change was made, but it is unconfirmed whether other labels (lane titles or shoot labels) should change too. That comment thread is still open.
- Gallery tile labels still use the earlier shoot names (Picnic shoot, Skateboard Community, Behind the scenes, Pre-Launch, Launch). They have not been matched to the new order.
- No pages beyond the single page exist yet (for example separate pages for models, crew or campaigns).

## Owner preferences for working together
- Go straight to the point
- Explain every code block that is added
- Be friendly and human
- Log all activities at the end of every response