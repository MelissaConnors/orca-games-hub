## Plan

1. **Process the existing orca PNG** (`public/orca.png` and `src/assets/orca.png`) with a Python/Pillow script:
   - Detect the orca's silhouette by flood-filling transparency from the outer edges — anything reachable from the canvas border stays transparent (the surrounding background).
   - Any remaining transparent pixels are *inside* the orca's body; fill those.
   - For each interior-transparent pixel, decide black vs white by sampling the surrounding opaque pixels: regions adjacent to predominantly dark pixels (tail/back) become solid black, regions adjacent to predominantly light pixels (belly/eye-patch) become solid white.
   - Re-save as a transparent PNG with the orca silhouette fully opaque inside.

2. **Write the result to both locations** the app uses:
   - `public/orca.png` (served at `/orca.png`, used by `<Orca />`)
   - `src/assets/orca.png` (kept in sync as the source-of-truth copy)

3. **Verify** by inspecting the updated PNG and reloading the Orca Dash preview to confirm the player orca shows a fully filled body — black tail/back, white belly — with no see-through gaps.