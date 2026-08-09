/* Small original line-icon set (hand-drawn paths, 24x24 viewBox). */
const ICON_PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  book: '<path d="M4 5.8C4 4.8 4.8 4 5.8 4H11v16H5.8A1.8 1.8 0 0 1 4 18.2V5.8z"/><path d="M20 5.8c0-1-.8-1.8-1.8-1.8H13v16h5.2c1 0 1.8-.8 1.8-1.8V5.8z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".7" fill="currentColor"/>',
  pencil: '<path d="M4 20l.9-4.4L15.6 4.9a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1L8.4 19.1 4 20z"/><path d="M13.8 6.7l3.5 3.5"/>',
  users: '<circle cx="9" cy="8.2" r="3.1"/><path d="M3.2 20c0-3.4 2.6-6.1 5.8-6.1s5.8 2.7 5.8 6.1"/><circle cx="17.2" cy="9.3" r="2.3"/><path d="M15.8 14c2.4.5 4.1 2.7 4.1 6"/>',
  bolt: '<path d="M13 2 4.5 14h5.7l-1 8L18 10h-5.7l.7-8z"/>',
  sparkle: '<path d="M12 3l1.6 4.7L18.4 9l-4.8 1.6L12 15.4l-1.6-4.8L5.6 9l4.8-1.3L12 3z"/><path d="M19 15l.8 2.3L22 18l-2.2.7L19 21l-.8-2.3L16 18l2.2-.7L19 15z"/>',
  translate: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.4 2.5 3.7 5.7 3.7 9s-1.3 6.5-3.7 9c-2.4-2.5-3.7-5.7-3.7-9S9.6 5.5 12 3z"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  trophy: '<path d="M7 4h10v3.2a5 5 0 0 1-10 0V4z"/><path d="M7 5.2H4.3v1.6a3 3 0 0 0 3 3M17 5.2h2.7v1.6a3 3 0 0 1-3 3"/><path d="M12 12.2V15M9 20h6M9.7 17h4.6v3H9.7z"/>',
  flame: '<path d="M12 2c1.1 3-3 4.4-3 8.4a3 3 0 0 0 6 0c0-1.1-.9-2-.9-2 1.9 1.1 2.9 3.1 2.9 5.1a5 5 0 0 1-10 0c0-5.4 3.3-7.3 5-11.5z"/>',
  gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6v3M12 18.4v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.6 12h3M18.4 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
};

function icon(name, size) {
  size = size || 22;
  const path = ICON_PATHS[name] || '';
  return '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
}
