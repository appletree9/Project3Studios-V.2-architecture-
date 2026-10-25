# Building shapes — Project3Studios V2.2.3

Click **Building Shapes** in the left tools panel, or choose **Building shapes** from the inspector's Find settings menu.

Choose a category and part, edit Width / Height / Depth, and click **Add building part**. Dimensions are in the existing app's scene units. Parts have a ground-level pivot, so scaling preserves their base. Placement can be beside existing objects or at the scene origin. New parts enter Move mode; use Move, Rotate, Scale, snapping, duplication, paint, or a sculpt brush to assemble your building.

Quick Add inserts stairs, a door, window, handrail, roof or wall light with its preset dimensions. The Steps / posts control changes staircase steps and rail/fence post counts. Low detail keeps meshes light; Standard and Fine provide additional vertices for sculpting.

| Category | Parts |
| --- | --- |
| Structure | Wall, wall with doorway, wall with window opening, floor/foundation slab, room shell, round column, square pillar, beam/lintel, archway |
| Doors & windows | Paneled door, door frame, window frame, divided window frame, glass pane |
| Stairs & access | Straight stairs, L-shaped stairs, spiral stairs, ramp, landing/platform |
| Rails & exterior | Balcony handrail, stair handrail, fence panel, balcony with railings |
| Roofs | Gable roof, hip roof, flat roof slab, chimney |
| Light fixtures | Wall light fixture, ceiling light fixture, street lamp/lamp post |

Frames and wall-opening parts have real openings. Adding a window or frame does not automatically cut a hole in another mesh; use the wall-with-opening part or the existing mesh tools. Glass panes are separate translucent meshes. A room shell includes a floor and a doorway, with an open top for modeling its interior.

Every mesh component is closed and indexed. Multi-part frames, railings and fixtures are assembled closed components rather than a CAD Boolean union. Use the existing voxel remesh tool when you want to fuse touching components. These are modeling assets, not construction or engineering specifications.

Light fixtures are editable model shapes. **Add scene point light** creates an actual light through the existing Lighting controls; the light and fixture can be positioned independently. Fixture meshes are included in project saves. The lighting shortcut uses the existing scene-light system and does not attach a light to a fixture.

Building parts support selection, transforms, duplication, undo, native project save/reopen, mesh exports and the worker sculpting workspace (within its vertex limit). Hard-edge shading and glass opacity are now retained by undo and native project files. OBJ material exports include opacity when material-color export is enabled.

## Validation

- `node tests/architecture.mjs`: all 30 presets at default and custom/fine settings; finite geometry/normals, closed component edges, outward winding, requested bounds, ground-level origin, invalid inputs and actual openings.
- `python tests/architecture.py`: add/undo all 30 via the real UI, categories, custom dimensions/detail/steps, invalid input, quick add, point-light shortcut, native save/reopen with glass and STL export.
- `P3_PHONE_VIEWPORT=1 python tests/architecture.py`: same flow at 390 × 844.

Browser tests use Chromium software rendering. Physical iOS/Safari and Apple Pencil are not verified. Test hooks are injected by the local test server and are absent from the app.
