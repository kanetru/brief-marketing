# Lover Lover — design reference for Brief

The source of truth is `public/Lover Lover Brand Assets/`. The live website is not. An earlier pass inferred chocolate, cream, and ember from the homepage and used Inter Tight, Great Vibes, and a scraped wordmark. Those stand-ins are gone.

## Inventory

The folder is a source archive. Brief does not rename it.

### Guidelines

`LL Brand Guidelines/LOVER LOVER BRAND GUIDELINES.pdf` (22 pages). It names the logo roles, the colour scheme, and the type hierarchy. It does not specify UI components, motion, or a product named Brief.

### Logo suite

Four lockups, each in several colourways. SVG is what the interface loads. PNG and EPS are the same artwork for print.

| Lockup | What it is | Use in Brief |
| --- | --- | --- |
| Primary logo | Stacked “Lover Lover”, star in the first O | Not in the chrome. It is the full identity and would overpower Brief. |
| Secondary logo | One line, landscape | Header, opening, completion |
| Brand mark | Three stars joined by a line | Not in the chrome. Kept for a later accent. |
| Brand icon | The single star | Chapter progress, act pauses, completion |

Colourways confirmed from the SVG fills and page 15 of the guidelines:

| Name | Hex | SVG coverage |
| --- | --- | --- |
| Chocolate | `#422424` | primary, secondary, mark, icon |
| Pearl | `#EFEEEC` | primary, secondary, mark, icon |
| Vibrant orange | `#F04A24` | primary, secondary, mark, icon (a few paths also use `#EF4923`) |
| Cherry | `#74040F` | primary, secondary, mark, icon |
| Baby blue | `#C5E0FA` | primary is not in SVG (PNG and EPS exist). Secondary is named `BLUE`. Mark and icon are `BABY-BLUE`. |
| Black | `#000000` | primary, mark, icon. No black secondary SVG. |
| White | `#FFFFFF` | primary and mark. No white secondary or icon SVG. |

`src/design/brandAssets.ts` maps those gaps: a white secondary asks for pearl, a white icon asks for pearl, a black secondary asks for chocolate.

Also in the folder, and not used in the interface:

- `Logo Suite/CHROME LOVER LOVER LOGO/` — raster chrome finishes of the primary, secondary, and icon.
- `Logo Suite/SVG/Artboard 11.svg` — an unnamed baby-blue primary.
- `LOVER-PRIMARY-LOGO-BLACK_1.svg`, `LOVER-PRIMARY-LOGO-WHITE_1.svg`, `LOVER-SECONDARY-LOGO-WHITE_1.png` — duplicates.
- `TEXTURED COLOURS/` — photographic texture plates (cream, chocolate, cherry, baby blue, vibrant orange). The flat hex values are what the guidelines specify. The plates are not tiled behind the UI.
- `LOVER LOVER MOCKUPS/` — device mockups.

### Fonts

`FONTS/Satoshi_Font/`

- Family: Satoshi, designed by Deni Anggara, Indian Type Foundry, distributed on Fontshare.
- Desktop: OTF (Light through Black, roman and italic) and variable TTF. Not loaded by the app.
- Web: EOT, TTF, WOFF, WOFF2 for each static weight, plus variable roman and italic.
- Licence: `License/FFL.txt` (Fontshare free EULA, 22 March 2021).

The EULA grants use in web, mobile, digital, and apps. The kit ships `Fonts/WEB/css/satoshi.css` with instructions to self-host via `@font-face`. Clause 02 forbids redistributing the font files and older replacement techniques (sIFR, Cufon). Brief self-hosts two WOFF2 files so the product can render. It does not offer the fonts as a download.

Loaded, from `src/design/satoshi.css`:

- `Satoshi-Variable.woff2` — weight 300–900, roman
- `Satoshi-VariableItalic.woff2` — weight 300–900, italic

`font-display: swap`. Static weights, EOT, TTF, and WOFF are not requested.

Guidelines (page 18–21), with their spelling “Santoshi”:

- Headings: Satoshi Black, tracking tight (the PDF says “spacing -50”).
- Subheadings and buttons: Satoshi Bold or Medium, tracking 0. Buttons are uppercase.
- Body: **Arial MT Pro**. Those files are not in the asset folder. Brief sets body in Satoshi, with Arial as the next family in the stack. Arial MT Pro is still the specified secondary face when someone can license it.

There is no script font in the folder. The wordmark is the logo artwork. Do not set “Lover Lover” in a script face.

## Colour in the product

From the guidelines: primary Pearl, Vibrant Orange, and Chocolate. Secondary Cherry and Baby Blue. Tertiary black and white.

Applied:

| Role | Value | Why |
| --- | --- | --- |
| Background, surface | Pearl `#EFEEEC` | Primary ground |
| Text | Chocolate `#422424` | 12:1 on pearl |
| Muted | `#6B4545` | Solid mix so small labels stay above 7:1. Not a new brand colour. |
| Accent, buttons, focus | Vibrant orange `#F04A24` | Primary accent |
| Secondary accent | Cherry `#74040F` | Token only. Not a second button colour. |
| Dark field (opening, acts, learning, handoff) | Chocolate | Primary dark |
| Type on chocolate | Pearl | 12:1 |
| Kicker on a learning field | Baby blue `#C5E0FA` | 10:1 on chocolate. Orange on chocolate is 3.8:1 and fails for small type. |
| Button label | Chocolate on orange | 3.8:1. The label is Satoshi Bold at 1.2rem so it meets large-text AA. White on this orange is 3.7:1 and was not used. |
| Focus on an orange button | Chocolate outline | The orange ring would sit on the orange fill. |

Do not paint the product in every colourway. Cherry, baby blue, and the textures stay rare.

## Logo usage

- Header: secondary logo, chocolate on pearl, pearl on chocolate, plus the word Brief. Height is 1.7rem. Smaller than that, the star-in-O collapses into grey fringe on a 1× display.
- Opening: **Brief** in Satoshi Black, then “by”, then the pearl secondary logo. One lockup. The header mark stays; it does not repeat a second colourway.
- Acts and the chapter line: the orange star on pearl, the pearl star on chocolate.
- Completion: the orange star on its own line, then the pearl secondary logo. They do not sit on one baseline.
- Manager: the chocolate secondary logo once, at 1.85rem. Buttons stay chocolate and pearl, not orange, so the workspace stays quieter than discovery.
- Chapter progress on a chocolate field uses a pearl fill. A transparent fill disappeared into the background.

Clear space in the guidelines is the size of the star. The header carries one lockup, not a second mark beside it.

## Motion

Unchanged from the experience pass: one rise, one fade, reduced motion drops the travel. Tokens stay in `tokens.css` and `motion.css`.

## Still missing

- Arial MT Pro, the specified body face.
- A white or black secondary SVG, and a white icon SVG.
- A baby-blue primary SVG (PNG and EPS exist).
- Any rule for motion, spacing scales, or a product UI.
- A script font. It is not missing if the logo file is the script.
