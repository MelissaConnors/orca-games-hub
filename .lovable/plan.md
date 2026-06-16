## Plan

1. **Confirm the root cause**
   - Verify the orca image request succeeds and that the `<img>` elements are present in Orca Dash.
   - Based on the current preview, treat the issue as a visibility problem rather than a missing-file problem: the asset is loading, but it is too dark/small against the dark ocean board.

2. **Create a game-ready orca sprite**
   - Use the existing extracted orca image as the source.
   - Produce a transparent-background version optimized for gameplay:
     - tightly cropped to the actual orca body
     - no checkerboard/background remnants
     - slightly brightened/high-contrast so it remains visible on dark water
     - optional subtle light edge/outline baked into the transparent PNG if needed for readability

3. **Update the reusable Orca component**
   - Point it to the corrected sprite source.
   - Give it reliable default sizing behavior for both fixed-size UI icons and full-cell game pieces.
   - Preserve `size`, `flip`, `className`, and custom `style` support.

4. **Harden Orca Dash rendering**
   - Make the player orca wrapper explicitly center and size the image within its lane cell.
   - Ensure the player orca always renders above lane bands and obstacles with an appropriate `z-index`.
   - Apply the same rendering path to Call Pod strike orcas so the pod animation uses the new component visibly.
   - Keep safe-inlet orcas smaller, but still visible.

5. **Verify in the live preview**
   - Open Orca Dash help screen: confirm UI icon orcas are visible.
   - Start gameplay: confirm the player orca is visible immediately at the dock and while moving through lanes.
   - Trigger/verify Call Pod rendering path: confirm multiple orca sprites animate into obstacles and then obstacles disappear.
   - Check that the transparent background blends cleanly with the board.