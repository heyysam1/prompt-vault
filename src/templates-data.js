// Prompt Vault built-in templates — faithful port of the approved prototype set
// (~/workspace/ts-spaces/prompt-library-dashboard/index.html, "templates" array).
// Do not invent or rename entries here: names, group labels, group order and
// template order are exactly the prototype's. 22 templates in 6 groups:
//   Image Prompts (#2563EB) 5 · Video / Flow (#7C3AED) 3 · Coding (#EA580C) 4 ·
//   Writing (#D97706) 3 · Business & Marketing (#E11D48) 4 · Study (#0284C7) 3
// Ids are stable slugs generated from the names (the prototype used t1..t22).
// Bodies keep the prototype's styling language: .ph placeholder spans,
// .hl-line highlight lines, .code-block panels, .chk lists with ☐ glyphs.
//
// Image slots: stored as <div class="img-ph" data-image-slot data-stock="SEED"
// data-stock-src="URL"> with the prototype's inner SVG, <b> slot label and hint
// <span> kept verbatim. data-image-slot is the app's slot marker (main.js
// tplDisplayHTML / editor.js enhanceImageSlots select on it). At display time
// the slot renders its bundled stock photo (/stock/SEED.jpg, shipped with
// the app so it always loads offline) with a caption bar: the <b> label in
// bold plus "Replaced by yours when you use the template". In the editor
// the same slot is a live drop zone.

export const TEMPLATES = [
  {
    id: "hero-image-brief",
    name: "Hero Image Brief",
    group: "Image Prompts",
    html: `<h1>Hero Image Brief</h1><p>One wide hero image for the top of a website. The left third stays calm and empty, so the headline text can sit on it.</p><div class="img-ph" data-image-slot data-stock="pv-hero" data-stock-src="/stock/pv-hero.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Reference Image</b><span>Placeholder — add your reference image here</span></div><p><b>Subject:</b> <span class="ph">[who or what is in the image, e.g. a small team working in a bright bakery]</span></p><p><b>Style:</b> <span class="ph">[photorealistic / illustrated / 3D render]</span></p><p><b>Lighting:</b> <span class="ph">[warm natural window light, soft shadows]</span></p><p><b>Mood:</b> <span class="ph">[calm, trustworthy, a little premium]</span></p><hr class="tdiv"><table><tr><th>Aspect ratio</th><td><span class="ph">[16:9]</span></td><th>Quality</th><td><span class="ph">[high detail]</span></td></tr><tr><th>Negative prompt</th><td colspan="3"><span class="ph">[no text, no watermark, no distorted hands, no clutter]</span></td></tr></table>`
  },
  {
    id: "product-photo-shot",
    name: "Product Photo Shot",
    group: "Image Prompts",
    html: `<h2>Product Photo Shot</h2><div class="img-ph" data-image-slot data-stock="pv-product" data-stock-src="/stock/pv-product.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Product Reference</b><span>Placeholder — the product, as it should look</span></div><p><b>Product:</b> <span class="ph">[product name and colour]</span></p><p><b>Background:</b> <span class="ph">[plain studio grey / kitchen counter / outdoor]</span></p><p><b>Lens &amp; angle:</b> <span class="ph">[50mm, eye level, slight 45 degrees]</span></p><table><tr><th>Shot</th><th>What to capture</th></tr><tr><td>Front</td><td><span class="ph">[full product, label readable]</span></td></tr><tr><td>45 degrees</td><td><span class="ph">[depth and texture]</span></td></tr><tr><td>Detail close-up</td><td><span class="ph">[the one detail that sells it]</span></td></tr></table><h3>Before you generate</h3><ul class="chk"><li>☐ Colours true to life, no colour cast</li><li>☐ Space around the product for cropping</li><li>☐ No text baked into the image</li></ul><p class="hl-line">Soft window light from the left, gentle shadow, nothing in frame except the product.</p>`
  },
  {
    id: "social-post-visual",
    name: "Social Post Visual",
    group: "Image Prompts",
    html: `<h1>Social Post Visual</h1><div class="img-ph" data-image-slot data-stock="pv-social" data-stock-src="/stock/pv-social.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Post Visual</b><span>Placeholder — a visual in the style this post needs</span></div><blockquote>The one idea this visual must land in two seconds: <span class="ph">[your core message]</span></blockquote><p><b>Topic:</b> <span class="ph">[what the post is about]</span></p><p><b>Style:</b> <span class="ph">[bold flat shapes / photo / minimal line art]</span></p><h3>Composition rules</h3><ul><li>One clear subject, nothing competing with it</li><li>Top quarter kept empty for the headline</li><li>Colours match the page branding</li></ul><p class="hl-line">Square 1:1 format. No text baked into the image — the caption carries the words.</p>`
  },
  {
    id: "cover-art",
    name: "Cover Art",
    group: "Image Prompts",
    html: `<div class="img-ph" data-image-slot data-stock="pv-cover" data-stock-src="/stock/pv-cover.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Cover Reference</b><span>Placeholder — a cover you like, for mood and layout</span></div><h2>Cover Art</h2><p><b>Belongs to:</b> <span class="ph">[book / video / playlist title]</span></p><h3>Look &amp; feel</h3><ul><li><b>Mood:</b> <span class="ph">[dark and quiet / bright and hopeful]</span></li><li><b>Palette:</b> <span class="ph">[the two or three colours that dominate]</span></li><li><b>Composition:</b> <span class="ph">[one strong silhouette in the centre, painterly detail]</span></li></ul><table><tr><th>Orientation</th><td>Portrait</td><th>Text</th><td>None — no letters, no watermark</td></tr></table>`
  },
  {
    id: "character-design-sheet",
    name: "Character Design Sheet",
    group: "Image Prompts",
    html: `<div class="img-ph" data-image-slot data-stock="pv-character" data-stock-src="/stock/pv-character.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Character Reference</b><span>Placeholder — add a face or outfit reference here</span></div><h1>Character Design Sheet</h1><h2>Appearance</h2><ul><li><b>Age &amp; build:</b> <span class="ph">[e.g. 17, slim, tall]</span></li><li><b>Face &amp; hair:</b> <span class="ph">[the features that make them recognisable]</span></li><li><b>Signature detail:</b> <span class="ph">[the one thing viewers remember]</span></li></ul><h2>Outfit</h2><ul><li><b>Everyday:</b> <span class="ph">[usual clothes and colours]</span></li><li><b>Formal:</b> <span class="ph">[how the outfit changes]</span></li></ul><h2>Personality</h2><ul><li><span class="ph">[trait one]</span></li><li><span class="ph">[trait two]</span></li><li><span class="ph">[one flaw that drives the story]</span></li></ul><table><tr><th>Do</th><th>Do not</th></tr><tr><td><span class="ph">[keep proportions and colours consistent]</span></td><td><span class="ph">[change the hairstyle between scenes]</span></td></tr></table>`
  },
  {
    id: "cinematic-product-clip",
    name: "Cinematic Product Clip",
    group: "Video / Flow",
    html: `<h1>Cinematic Product Clip</h1><p><b>Product:</b> <span class="ph">[product name]</span> · <b>Total length:</b> <span class="ph">[8 seconds]</span></p><div class="img-ph" data-image-slot data-stock="pv-cinematic" data-stock-src="/stock/pv-cinematic.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Storyboard Frame</b><span>Placeholder — the opening frame, for mood and framing</span></div><h3>Shot list</h3><table><tr><th>Shot</th><th>Camera</th><th>Action</th><th>Duration</th></tr><tr><td>1</td><td>Slow push-in</td><td><span class="ph">[product revealed on a clean table]</span></td><td>3s</td></tr><tr><td>2</td><td>Static close-up</td><td><span class="ph">[steam, texture, the detail shot]</span></td><td>3s</td></tr><tr><td>3</td><td>Gentle pull-back</td><td><span class="ph">[full scene, space at the end for a logo]</span></td><td>2s</td></tr></table><p><b>Dialogue:</b> <span class="ph">[none / one short line]</span></p><p><b>Music:</b> <span class="ph">[soft piano, no lyrics]</span></p><p><b>Mood:</b> <span class="ph">[calm and premium]</span></p><h3>Final check</h3><ul class="chk"><li>☐ Hook lands in the first 2 seconds</li><li>☐ Call to action space at the end</li><li>☐ No people, no text overlay</li></ul>`
  },
  {
    id: "talking-head-scene",
    name: "Talking Head Scene",
    group: "Video / Flow",
    html: `<h2>Talking Head Scene</h2><div class="img-ph" data-image-slot data-stock="pv-talking" data-stock-src="/stock/pv-talking.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Scene Reference</b><span>Placeholder — the person and the room, as they should look</span></div><p><b>Person:</b> <span class="ph">[who is speaking — age, look, clothing]</span></p><p><b>Place:</b> <span class="ph">[the room, the light, what is behind them]</span></p><p><b>They say:</b> <span class="ph">[the line, or the topic in their own words]</span></p><h3>Delivery notes</h3><ul><li>Natural expressions, no acting voice</li><li>Head and shoulders, steady framing, 16:9</li><li>Soft daylight, shallow depth of field</li></ul><ul class="chk"><li>☐ Eyes looking into the lens</li><li>☐ Background calm, slight movement only</li><li>☐ No captions or text on screen</li></ul><p class="hl-line">It should feel like a real person talking, not a presenter reading.</p>`
  },
  {
    id: "b-roll-sequence",
    name: "B-Roll Sequence",
    group: "Video / Flow",
    html: `<h1>B-Roll Sequence</h1><div class="img-ph" data-image-slot data-stock="pv-broll" data-stock-src="/stock/pv-broll.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Mood Reference</b><span>Placeholder — one frame that sets the light and mood</span></div><p><b>Topic:</b> <span class="ph">[what these clips support]</span></p><h3>The three clips</h3><ol><li><b>Wide establishing shot</b> — <span class="ph">[the place, seen whole]</span></li><li><b>Hands at work</b> — <span class="ph">[close-up of the action]</span></li><li><b>Slow detail shot</b> — <span class="ph">[one texture or small moment]</span></li></ol><table><tr><th>Clip</th><th>Length</th><th>Sound</th></tr><tr><td>1</td><td>4s</td><td>Natural ambience</td></tr><tr><td>2</td><td>3s</td><td>Natural ambience</td></tr><tr><td>3</td><td>3s</td><td>Fade out</td></tr></table><ul class="chk"><li>☐ Same light and mood across all three</li><li>☐ No text anywhere</li></ul>`
  },
  {
    id: "bug-report",
    name: "Bug Report",
    group: "Coding",
    html: `<h1>Bug Report</h1><h2>Summary</h2><p><span class="ph">[One or two lines: what breaks, where, and since when.]</span></p><table><tr><th>Environment</th><td><span class="ph">[Windows / Mac, app version]</span></td></tr><tr><th>Area</th><td><span class="ph">[editor / sync / search]</span></td></tr></table><h2>Steps to reproduce</h2><ol><li><span class="ph">[first step]</span></li><li><span class="ph">[second step]</span></li><li><span class="ph">[the step where it breaks]</span></li></ol><h2>Error / code</h2><div class="code-block"><span class="ph">[paste the error message or the related code here]</span></div><table><tr><th>Expected</th><th>Actual</th></tr><tr><td><span class="ph">[what should happen]</span></td><td><span class="ph">[what happens instead]</span></td></tr></table><p class="hl-line">Find the root cause first, explain it in two lines, then give the smallest fix. Do not rewrite the whole file.</p>`
  },
  {
    id: "senior-code-review",
    name: "Senior Code Review",
    group: "Coding",
    html: `<h1>Senior Code Review</h1><p>Review the code below like a senior engineer on a PR. Only real problems — no style nitpicks.</p><div class="code-block"><span class="ph">[paste the code here]</span></div><h3>Check for</h3><ul class="chk"><li>☐ Bugs and broken edge cases</li><li>☐ Security issues</li><li>☐ Anything that fails in production</li><li>☐ Data loss or silent failures</li></ul><h3>How to answer</h3><ul><li>For each issue: the line, the risk, the fix</li><li>Ordered by severity, worst first</li><li>If the code is fine, say so plainly</li></ul>`
  },
  {
    id: "explain-this-code",
    name: "Explain This Code",
    group: "Coding",
    html: `<h2>Explain This Code</h2><div class="code-block"><span class="ph">[paste the code here]</span></div><h3>Explain it like this</h3><ol><li>What the whole thing does, in one line</li><li>Block by block: what each part does, and why it is written that way</li><li>The inputs, the outputs, and what changes in between</li></ol><p class="hl-line">End with one thing that could go wrong, and how you would notice it.</p><p><b>Audience:</b> <span class="ph">[a junior developer / me, quickly, before I ship]</span></p>`
  },
  {
    id: "write-a-function",
    name: "Write a Function",
    group: "Coding",
    html: `<h1>Write a Function</h1><table><tr><th>Language</th><td><span class="ph">[JavaScript / Python / Rust]</span></td></tr><tr><th>Task</th><td><span class="ph">[what the function must do]</span></td></tr><tr><th>Inputs</th><td><span class="ph">[names and types]</span></td></tr><tr><th>Output</th><td><span class="ph">[what it returns]</span></td></tr></table><h3>Rules</h3><ul><li>Handle empty and invalid input</li><li>Keep it short, no extra commentary</li><li>One usage example under the code</li></ul><div class="code-block"><span class="ph">[optional: a similar function, to match its style]</span></div>`
  },
  {
    id: "blog-outline-to-draft",
    name: "Blog Outline to Draft",
    group: "Writing",
    html: `<h1><span class="ph">[Working title of the post]</span></h1><blockquote>The one thought the reader should leave with: <span class="ph">[core idea, in one line]</span></blockquote><h2>Outline</h2><ol><li><b>Hook</b> — <span class="ph">[the opening that earns attention]</span></li><li><b>The problem</b> — <span class="ph">[what the reader is struggling with]</span></li><li><b>The turning point</b> — <span class="ph">[the insight or example that changes it]</span></li><li><b>What to do</b> — <span class="ph">[the practical steps]</span></li><li><b>Close</b> — <span class="ph">[one line to remember]</span></li></ol><h3>Key points to cover</h3><ul class="chk"><li>☐ One concrete example per section</li><li>☐ Short paragraphs, conversational tone</li><li>☐ Around 800 words</li></ul>`
  },
  {
    id: "rewrite-in-my-voice",
    name: "Rewrite in My Voice",
    group: "Writing",
    html: `<h2>Rewrite in My Voice</h2><h3>Original text</h3><div class="code-block"><span class="ph">[paste the text to rewrite here]</span></div><h3>My voice</h3><ul><li>Plain words, short sentences</li><li>No corporate polish, no sales tone</li><li>Sounds like a person, not a company</li></ul><p class="hl-line">Keep every fact exactly as it is. Change only the tone.</p>`
  },
  {
    id: "five-line-summary",
    name: "Five Line Summary",
    group: "Writing",
    html: `<h1>Five Line Summary</h1><h3>Give me exactly this</h3><ol><li>What the text actually says, in one line</li><li>The three points I must not miss</li><li>Anything it wants me to do</li></ol><div class="code-block"><span class="ph">[paste the long text here]</span></div><ul class="chk"><li>☐ Total under 120 words</li><li>☐ No intro, no outro</li></ul>`
  },
  {
    id: "whatsapp-outreach-opener",
    name: "WhatsApp Outreach Opener",
    group: "Business & Marketing",
    html: `<h2>WhatsApp Outreach Opener</h2><p><b>Business:</b> <span class="ph">[business name]</span> · <b>Type:</b> <span class="ph">[restaurant / shop / service]</span> · <b>Area:</b> <span class="ph">[area, city]</span></p><p><b>One thing I noticed:</b> <span class="ph">[something specific about their page or shop]</span></p><h3>The message — five short lines</h3><ol><li>Greeting</li><li>I am Sami, Fluctuate Studio — we build professional websites</li><li>Their business name, in quotes, so it never reads as bulk spam</li><li>The problem I noticed, then the benefit, in one sentence</li><li>An offer to show demo designs</li></ol><p class="hl-line">Everyday Bangladeshi Bangla, the way a real person texts. No corporate tone.</p>`
  },
  {
    id: "facebook-launch-post",
    name: "Facebook Launch Post",
    group: "Business & Marketing",
    html: `<h1>Facebook Launch Post</h1><div class="img-ph" data-image-slot data-stock="pv-launch" data-stock-src="/stock/pv-launch.jpg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg><b>Post Image</b><span>Placeholder — the image this post will carry</span></div><p><b>Page:</b> <span class="ph">[page name]</span></p><p><b>Announcing:</b> <span class="ph">[the offer or launch]</span></p><h3>Post structure</h3><ul><li>Open with the one clear benefit</li><li>One line on who it is for — small business owners in Bangladesh</li><li>Mix Bangla and English naturally, the way local pages write</li><li>End with one deadline-free call to action on WhatsApp</li></ul><ul class="chk"><li>☐ Maximum two hashtags</li><li>☐ No deadline pressure</li></ul>`
  },
  {
    id: "client-proposal",
    name: "Client Proposal",
    group: "Business & Marketing",
    html: `<h1>Client Proposal</h1><p><b>To:</b> <span class="ph">[client name]</span> · <b>Project:</b> <span class="ph">[what you will build]</span></p><h3>What I noticed</h3><p><span class="ph">[Two lines on their current setup, and what it costs them.]</span></p><h3>Packages</h3><table><tr><th>Package</th><th>Includes</th><th>Price</th></tr><tr><td>Starter</td><td><span class="ph">[pages, features]</span></td><td><span class="ph">[price]</span></td></tr><tr><td>Standard</td><td><span class="ph">[pages, features]</span></td><td><span class="ph">[price]</span></td></tr><tr><td>Premium</td><td><span class="ph">[pages, features]</span></td><td><span class="ph">[price]</span></td></tr></table><h3>Why this helps</h3><ul><li><span class="ph">[benefit one]</span></li><li><span class="ph">[benefit two]</span></li></ul><h3>Terms &amp; next steps</h3><ul class="chk"><li>☐ Timeline: <span class="ph">[how many days]</span></li><li>☐ Next step: <span class="ph">[one clear action for the client]</span></li></ul>`
  },
  {
    id: "ad-copy-three-angles",
    name: "Ad Copy, Three Angles",
    group: "Business & Marketing",
    html: `<h1>Ad Copy — Three Angles</h1><p><b>Product:</b> <span class="ph">[product]</span> · <b>Audience:</b> <span class="ph">[who it is for]</span></p><h3>1. The pain point angle</h3><p><span class="ph">[headline]</span><br><span class="ph">[body — starts from the problem]</span></p><h3>2. The benefit angle</h3><p><span class="ph">[headline]</span><br><span class="ph">[body — leads with the outcome]</span></p><h3>3. The proof angle</h3><p><span class="ph">[headline]</span><br><span class="ph">[body — uses a result or a number]</span></p><table><tr><th>Rule</th><th>Limit</th></tr><tr><td>Headline</td><td>One line</td></tr><tr><td>Body</td><td>Under 40 words</td></tr></table>`
  },
  {
    id: "explain-simply-in-bangla",
    name: "Explain Simply in Bangla",
    group: "Study",
    html: `<h1>Explain Simply in Bangla</h1><p class="hl-line">Core definition: <span class="ph">[the topic, defined in one simple line]</span></p><p><b>Topic:</b> <span class="ph">[topic]</span> · <b>Subject:</b> <span class="ph">[HSC Physics / Chemistry]</span></p><h3>Break it down</h3><ol><li>Start with a real life example</li><li>Then the concept, in simple Bangla, like a good private tutor</li><li>Then the formula, with what each symbol means</li><li>One board-style problem, solved step by step</li></ol><table><tr><th>Symbol</th><th>Means</th></tr><tr><td><span class="ph">[symbol]</span></td><td><span class="ph">[what it stands for]</span></td></tr><tr><td><span class="ph">[symbol]</span></td><td><span class="ph">[what it stands for]</span></td></tr></table><h3>Check yourself</h3><ol><li><span class="ph">[one question you should now be able to answer]</span></li><li><span class="ph">[one more]</span></li></ol>`
  },
  {
    id: "mcq-quiz-drill",
    name: "MCQ Quiz Drill",
    group: "Study",
    html: `<h1>MCQ Quiz Drill</h1><p><b>Subject:</b> <span class="ph">[subject]</span> · <b>Chapter:</b> <span class="ph">[chapter name]</span></p><h3>How it runs</h3><ul><li>Ask one MCQ at a time, and wait for my answer</li><li>Say right or wrong, with a one line explanation</li><li>Board exam difficulty, questions in Bangla</li></ul><table><tr><th>Round</th><th>Setting</th></tr><tr><td>Questions</td><td>10</td></tr><tr><td>Score</td><td>Kept out of 10</td></tr></table><ul class="chk"><li>☐ Definitions covered</li><li>☐ Formulas covered</li><li>☐ The traps examiners set, included</li></ul>`
  },
  {
    id: "make-flashcards",
    name: "Make Flashcards",
    group: "Study",
    html: `<h1>Make Flashcards</h1><h3>Source notes</h3><div class="code-block"><span class="ph">[paste your notes here]</span></div><h3>Card format</h3><table><tr><th>Front</th><th>Back</th></tr><tr><td>One question</td><td>The answer, in one short line</td></tr></table><h3>Cover all of these</h3><ul class="chk"><li>☐ Definitions</li><li>☐ Formulas</li><li>☐ The traps examiners set</li></ul><h3>Check yourself</h3><ol><li><span class="ph">[a question only these notes can answer]</span></li><li><span class="ph">[one more]</span></li></ol>`
  }
];
