# Design System Specification: The Artisanal Curator

## 1. Overview & Creative North Star
**Creative North Star: "The Tactile Gallery"**

This design system rejects the sterile, "templated" nature of modern e-commerce. Instead, it positions the digital experience as a high-end physical gallery. The goal is to move beyond a standard grid of products and create a sense of *provenance* and *human touch*. 

We achieve this through **Intentional Asymmetry** and **Tonal Depth**. By avoiding rigid boxes and harsh dividers, we allow content to breathe and overlap, mimicking the way an artisan might arrange their workbench. The experience should feel like a conversation with a master craftsperson: warm, authoritative, and deeply intentional.

---

## 2. Colors & The Surface Philosophy
The palette is rooted in the earth. Terracotta (`primary`), Sage (`secondary`), and Sand (`tertiary`) provide a grounded, organic foundation.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Structure is defined through **Tonal Transitions**. Use the `surface` tokens to create distinct zones:
*   **Hero/Focus Areas:** `surface_bright` (#fdf9f3)
*   **Secondary Content Zones:** `surface_container_low` (#f7f3ed)
*   **Deep Contrast Sections:** `surface_container_high` (#ebe8e2)

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine, textured paper. To highlight a specific element (like a product card or a filter panel), use the **Nesting Principle**:
*   Place a `surface_container_lowest` (#ffffff) card atop a `surface_container` (#f1ede7) background. The subtle shift in hex code provides all the "border" the eye needs.

### Signature Textures & The Glass Rule
*   **The Artisanal Glow:** For primary Call-to-Actions (CTAs), use a subtle linear gradient transitioning from `primary` (#853724) to `primary_container` (#a44e39) at a 135-degree angle. This adds "soul" and depth.
*   **Glassmorphism:** For floating navigation bars or modal overlays, use `surface` at 85% opacity with a `24px` backdrop blur. This allows the earthy background tones to bleed through, maintaining a sense of place.

---

## 3. Typography: Editorial Authority
The type system pairs the intellectual elegance of a Serif with the functional clarity of a Sans-Serif.

*   **Headlines (Noto Serif):** Use `display-lg` through `headline-sm` for all editorial storytelling. These should often be set with slightly tighter letter-spacing (-0.02em) to feel premium and "inked."
*   **The UI Engine (Manrope):** All functional elements—labels, buttons, and body copy—use Manrope. Its clean geometry balances the decorative nature of the Serif.
*   **Visual Hierarchy:** Use `primary` (#853724) for key headings to draw the eye, but keep body text in `on_surface` (#1c1c18) for maximum readability.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "digital" for this system. We use **Ambient Softness**.

*   **The Layering Principle:** Depth is achieved by stacking `surface-container` tiers. A `surface_container_highest` element resting on a `surface` background creates a natural, soft "lift."
*   **Ambient Shadows:** If an element must float (e.g., a cart drawer), use a shadow with a blur of `40px`, an opacity of `6%`, and a tint of `on_surface_variant` (#54433c). Avoid pure black shadows at all costs.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border, use the `outline_variant` (#dac1b8) token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons & Interaction
*   **Primary Button:** Background `primary` (#853724) with `on_primary` (#ffffff) text. Use `rounded-md` (0.375rem) for a hand-clipped feel.
*   **Secondary Button:** `surface_container_high` background with `primary` text. No border.
*   **Tertiary Button:** Pure text in `secondary` (#516351) with an `outline_variant` underline that appears only on hover.

### Cards & Marketplace Items
*   **The Card Rule:** Forbid divider lines. Use `16` (5.5rem) spacing between card sections. 
*   **Image Treatment:** Use `rounded-lg` (0.5rem) for product imagery. Images should be slightly "off-grid" when paired with text to enhance the artisanal feel.

### Input Fields
*   **Style:** Minimalist. No background fill—only an `outline_variant` (#dac1b8) bottom border (2px).
*   **Active State:** The bottom border transitions to `primary` (#853724) with a `label-sm` floating label.

### Artisanal Chips
*   **Selection Chips:** Use `secondary_container` (#d4e8d1) with `on_secondary_container` (#576957). The soft sage green signals "organic" and "natural" selection.

---

## 6. Do’s and Don'ts

### Do:
*   **Embrace Whitespace:** Use the `20` (7rem) and `24` (8.5rem) spacing tokens to separate major narrative blocks.
*   **Layer Surfaces:** Use `surface_container_lowest` for cards to make them "pop" against a `surface_container` background.
*   **Use Asymmetry:** Place an image at `60%` width and text at `40%` width to break the monotonous 50/50 split.

### Don't:
*   **No 100% Opaque Borders:** Never use a solid, high-contrast line to separate content.
*   **No Pure Black:** Never use #000000 for text or shadows; it kills the "warmth" of the earthy palette.
*   **No Sharp Corners:** Avoid the `none` (0px) roundedness token. Everything in the handmade world has a softened edge.
*   **No Default Grids:** Don't force every product into a perfectly square box. Vary the aspect ratios of thumbnails to mimic a curated gallery wall.