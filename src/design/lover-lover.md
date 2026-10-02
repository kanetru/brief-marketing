# Lover Lover — design reference for Brief

This note is for the next person changing Brief’s look. It records what was actually available, what was inferred, and what is a temporary stand-in.

## Assets discovered

`public/Lover Lover Brand Assets/` was not in the repository at the time of this pass. `origin/prototype` and `origin/main` contain no logos, guidelines, colour libraries, or font files under that path.

What was available instead:

- The published site [loverloveragency.com](https://www.loverloveragency.com/), inspected in the browser.
- The header wordmark served from that site, saved as `public/brand/lover-lover-wordmark.png`. The black field behind the script was removed so the mark can sit on chocolate or cream. This is the live header graphic, not a file from a brand kit in the repo.
- Fonts named in the site’s page source: **Inter Tight**, **Poppins**, **Syncopate**. No commercial font files were in the repo.

Do not treat the Squarespace template name in the page HTML (“Lilac and White… Logotype”, “hexahedron-turquoise”) as the brand. The rendered site does not look like that template.

## Logo and mark

The mark is a connected script, “Lover Lover”, in ember, with a long rule that rises out of the first L and runs above the words.

Use the image. Do not redraw it in a stand-in script and call that the logo.

On chocolate, the mark is ember on the dark field. On cream, the same file works because the background is transparent.

Brief is set separately, in the grotesque, not inside the script.

## Colour

Sampled from a screenshot of the live homepage, not from a guidelines PDF.

| Role | Value | Where it showed up |
| --- | --- | --- |
| Chocolate / background on the hero | `#3e180f` | Full-bleed top of the site |
| Cream / page and type on chocolate | `#faf6f2` | Lower page and hero type |
| Ember / accent | `#c6310a` | Section headings, pill button, script |
| Ink on cream | `#3e180f` | Body on the light page |
| Muted | `#857571` | A dusty rose-brown in the photograph edges and quiet type |

Hierarchy on the site: chocolate and cream do almost all the work. Ember is for the mark, a heading, and one button. It is not a wash.

Inferred, not specified by a guideline: borders are chocolate at low opacity; focus uses ember; nothing in the site suggested a separate destructive red, so destructive stays ember.

## Typography

Intended, from the live site:

- Script wordmark. The font file is not in the repo. The image is the mark.
- A bold grotesque for headlines, set large, often in capitals, tight leading. The page source names Inter Tight. The hero “PICK UP…” reads as that family, not as Syncopate (Syncopate is much wider).
- Navigation is the same grotesque, smaller, tracked capitals.
- Poppins and Syncopate are named in the source and were not the dominant voice of the homepage.

Temporary substitutes, all free and shipped via Fontsource:

| Job | Now | Replace later |
| --- | --- | --- |
| Wordmark | `public/brand/lover-lover-wordmark.png` | Swap the file. Do not change call sites. |
| Display and body | Inter Tight (`--font-display`, `--font-body`) | Point those variables at the licensed files in `src/design/tokens.css` |
| Script, if type must be set live | Great Vibes (`--font-script`) | Replace the font-family. Great Vibes is not the Lover Lover script. |

Client type specimens inside discovery (Fraunces, Outfit, and the rest) are choices the client makes about their business. They are not the Lover Lover chrome.

## Imagery

The homepage uses one full-bleed fashion photograph, motion in the picture, cropped tight, sitting on cream beside type. No filters were obvious beyond the photograph itself.

In Brief, imagery stays inside frames with a hairline chocolate rule. Do not overlay gradients. Do not crop so aggressively that the subject disappears on a phone.

## Graphic motifs

Observed: the script’s overhead rule, hairline dividers, a pill button, a repeating marquee of words. No pattern, stamp, or scribble library was in the repo.

Use the rule and the pill. Do not invent scribbles.

## Spacing and composition

The site is either a full-bleed dark field or a cream page with a hard left edge of type and a picture. Type is large. There is a lot of empty chocolate before the headline. That emptiness is part of the pacing.

Brief uses the same idea: one column, generous space, a dark field only for the opening, the act changes, learning, and the ending. The manager workspace stays on cream and is denser.

## Motion

The live site’s motion is a marquee and the photograph. Brief’s motion is slower and rarer: an entrance, a selection, an act change, a learning pause. Tokens live in `src/design/motion.ts` and `src/design/motion.css`.

## What to avoid

- A second palette (lilac, turquoise, generic blue focus rings).
- Fraunces or another “premium serif” as the product voice.
- Glass, gradient meshes, and constant movement.
- Setting “Lover Lover” in Great Vibes and presenting it as the real mark.
- Wallpapering screens with the wordmark.
