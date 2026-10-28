// Prototype icon set, copied from the approved prototype
// (~/workspace/ts-spaces/prompt-library-dashboard/index.html).
// One consistent set: 16px, stroke="currentColor", stroke-width 2,
// fill none, round caps/joins — exactly as drawn in the prototype.
// Other workstreams: import { ICONS } from './icons.js' and inject
// ICONS.<name> wherever JS renders an icon. Sidebar markup in
// index.html inlines the same SVGs directly.

const S = (inner) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ICONS = {
  // ---- Sidebar ----
  grid: S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  pin: S('<path d="M12 17v5"/><path d="M9 3h6l1 7 2.5 2.5a1 1 0 0 1-.7 1.5H6.2a1 1 0 0 1-.7-1.5L8 10z"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  chat: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  note: S('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  template: S('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  chart: S('<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>'),
  importExport: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>'),
  trash: S('<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),

  // ---- Generic ----
  search: S('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  copy: S('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
  dotsHorizontal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  download: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>'),
  upload: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>'),
  swap: S('<path d="M17 3v10M17 3L14 6M17 3l3 3M7 21V11M7 21l-3-3M7 21l3-3"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z"/>'),
  check: S('<path d="M20 6L9 17l-5-5"/>'),
  cloud: S('<path d="M17.5 19a4.5 4.5 0 0 0 .4-8.97 6 6 0 0 0-11.7 1.22A4 4 0 0 0 6.5 19z"/><path d="M12 21v-8M8.8 16.2L12 13l3.2 3.2"/>'),
  cloudCheck: S('<path d="M17.5 19a4.5 4.5 0 0 0 .4-8.97 6 6 0 0 0-11.7 1.22A4 4 0 0 0 6.5 19z"/><path d="M9 15l2 2 4-4"/>'),
  x: S('<path d="M18 6L6 18M6 6l12 12"/>'),
  chevronDown: S('<path d="M6 9l6 6 6-6"/>'),
  back: S('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  history: S('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
  link: S('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  image: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
  undo: S('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: S('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  star: S('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
  filter: S('<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>'),
  // The prototype's AI mark: a filled two-sparkle shape (its editor
  // version carries the blue-to-violet gradient; here currentColor so
  // it can sit in menus/buttons). Path data is the prototype's.
  sparkle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>',
};

// Friendly aliases matching the sidebar/task vocabulary.
ICONS.all = ICONS.grid;
ICONS.recent = ICONS.clock;
ICONS.aiChat = ICONS.chat;
ICONS.layout = ICONS.template;
ICONS.insights = ICONS.chart;
ICONS.account = ICONS.user;
ICONS.settings = ICONS.gear;
ICONS.share = ICONS.globe;
ICONS.close = ICONS.x;
ICONS.arrowLeft = ICONS.back;

export default ICONS;
