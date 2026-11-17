# Kuro / Bloub integration

The existing BlobatarCompanion API now delegates to the Bloub vector motor. Profile IDs and `.kuro` backups are unchanged; legacy shape/expression IDs are mapped at the rendering boundary. Existing profile, home, library, navbar, comment avatar and landing placements adopt the new renderer. Tiny avatars are static; reader controls stay calm. Completion is rendered in the end-of-chapter card, outside the page artwork.

## Motion

Transitions use matched cubic easing for silhouette and eye corrections; pointer targets use time-based damping. Colors interpolate for 650 ms from the currently visible colors, including during interrupted changes. Context reactions return to idle and occasional gestures have 28–42 seconds between them. Hidden pages, offscreen instances, explicit pause and OS reduced motion suspend the loop. React effect cleanup removes the renderer and all listeners.

`/mascote` is a product preview of the actual React component and its five placement contexts. The standalone demo remains separate.

## Upstream and license

Source is based on jeremy-prt/bloub commit b4bb3c1b5f93c7b87a2e8d620f667c4093d97749, under MIT (LICENSE.bloub is preserved beside the motor). Engine easing and the renderer are Yomi adaptations. The original README states that MIT covers its code, not the x.ai design it imitates. This integration does not establish exclusive rights to that design.

## Seasonal extension, later

Use independent layers: atmosphere behind the mascot; body palette; head/hand accessories; foreground effects. Keep the inventory and calendar outside the animation motor. Equip an item only after the account owns it, and keep ownership when an event ends.

Start with aura colors, a scarf and a small floating star. A hat should attach to a stable head anchor during idle/wink; when a state turns the entire body into a comet or symbol, fade the hat out and restore it after the morph. Avoid stretching garments across those silhouettes. Calendar activation changes decoration automatically, while equipment remains the user's choice. Seasonal particles remain outside the chapter artwork.

## Validation

TypeScript and production build; existing web tests; interrupted state transition, deterministic sampling and invalid gaze tests; browser QA of contexts, palettes, reduced motion and mobile layout. Account persistence flows were preserved, not exercised against real user data. A physical low-end device benchmark remains to be done.
