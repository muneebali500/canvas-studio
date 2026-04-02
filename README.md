# Canvas Studio

Canvas Studio is a responsive browser-based drawing app with a clean workspace,
mobile Canvas/Layers tabs, and a layered editor experience planned across the
build.

## Day 1 Progress

- Created the base project structure with separate HTML, CSS, and JavaScript files.
- Built the responsive app shell with toolbar, sidebar, canvas area, and status bar.
- Added mobile tabs for switching between the drawing canvas and layers panel.
- Implemented basic brush, pencil, eraser, color, size, and clear-canvas behavior.

## Day 2 Progress

- Added a real layer stack with separate canvases for each layer.
- Added layer creation, selection, deletion, visibility toggles, and opacity control.
- Added live layer thumbnails and layer count updates in the status bar.
- Updated drawing actions so brush, pencil, eraser, and clear apply to the active layer.

## Day 3 Progress

- Added line, rectangle, circle, and triangle tools to the toolbar.
- Added live shape previews on the interactive canvas while dragging.
- Added filled and outlined shape rendering through the Fill toggle.
- Connected shape commits to the active layer so layer controls continue to work.

## Day 4 Progress

- Added undo and redo controls to the toolbar.
- Added per-layer snapshot history for drawing, shapes, and clear actions.
- Added keyboard shortcuts for Ctrl+Z and Ctrl+Y.
- Improved drawing state cleanup so previews and active-layer history stay consistent.

## Planned Next Steps

- Fill tool, save/load, PNG export, and final README screenshots.
