# AMMARRE

Brand site for AMMARRE — double-wrapped bracelets in 5 mm braided yacht line,
closed with a brushed steel shackle. Drop 01, The Mooring Series.

## Run

Static files, no build step:

    python3 -m http.server 8000

Then open http://localhost:8000

## Pages

- `index.html` — wordmark, straight into the product catalog (`#drop`), a small FAQ accordion (`#faq`: the name, fit & sizing, material, shipping & care), then the footer (with the signup form)
- `product.html` — product detail; `?piece=silver-current|deep-water|after-tide|low-water|windward|night-watch`. No ref number, no on-page size picker — size is chosen per item in the bag drawer once a piece is added.

## Product photography

Drop 01 runs six pieces (see `PIECES` in `assets/site.js`). There is no real
photography yet, so all six use `assets/placeholder-bracelet.jpg` — one
placeholder shot standing in everywhere a product image appears (hero, the
catalog grid on `index.html`, and the PDP stage on `product.html`). Replace
that single file per piece once real photography exists; nothing else depends
on it.

The `anatomy.svg` / `clasp.svg` construction diagrams and the original
per-piece SVGs (`silver-current.svg` etc.) are no longer referenced anywhere
— the construction section was folded into the FAQ's short "Material &
construction" copy. `tools/generate-svg.js` still generates them if needed
again.

## Not wired up

- Checkout: the bag is client-side only, no payment provider.
- Signup: the form validates and confirms, but posts nowhere.
