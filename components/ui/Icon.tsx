// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every small picture used on the site — the tick, the
// arrow, the padlock, the shield — drawn here as code rather than loaded as
// images.
//
// WHY THEY ARE DRAWN RATHER THAN DOWNLOADED: an icon font or icon package would
// be several hundred kilobytes for the handful of shapes we actually use, and
// would have to finish downloading before the page looked finished. Drawn this
// way they appear instantly, stay perfectly sharp on any screen, and take their
// colour from whatever text they sit next to — which means they follow light and
// dark mode for free, with no extra work.
//
// The names match the ones used in the mobile app, so a screen ported from the
// phone keeps working without its icons having to be renamed.

import React from 'react';

export type IconName =
  | 'add' | 'alert-circle' | 'alert-circle-outline' | 'arrow-back' | 'arrow-down'
  | 'arrow-forward' | 'bicycle-outline' | 'boat-outline' | 'book-outline' | 'bulb-outline'
  | 'business-outline' | 'calendar-outline' | 'call-outline' | 'camera-outline'
  | 'car-outline' | 'card-outline' | 'chatbubble-outline' | 'checkmark'
  | 'checkmark-circle' | 'checkmark-circle-outline' | 'chevron-back' | 'chevron-down'
  | 'chevron-forward' | 'chevron-up' | 'close' | 'cloud-offline' | 'cloud-offline-outline'
  | 'cloud-upload-outline' | 'construct-outline' | 'create-outline' | 'document-attach-outline'
  | 'document-outline' | 'documents-outline' | 'download-outline' | 'ellipse'
  | 'ellipsis-horizontal' | 'eye-off-outline' | 'eye-outline' | 'flash-outline'
  | 'gift-outline' | 'globe-outline' | 'hammer-outline' | 'heart' | 'heart-outline'
  | 'help-circle-outline' | 'information-circle-outline' | 'key-outline'
  | 'location' | 'location-outline' | 'lock-closed-outline' | 'log-out-outline'
  | 'logo-apple' | 'logo-google' | 'mail-open-outline' | 'mail-outline' | 'map-outline'
  | 'menu' | 'moon-outline' | 'notifications-outline' | 'options-outline'
  | 'paper-plane-outline' | 'people-outline' | 'person' | 'person-outline'
  | 'pricetag-outline' | 'snow-outline' | 'water-outline'
  | 'print-outline' | 'refresh' | 'scan-outline' | 'search' | 'send' | 'settings-outline'
  | 'share-outline' | 'shield-checkmark' | 'shield-checkmark-outline' | 'shield-outline'
  | 'star' | 'star-half' | 'star-outline' | 'storefront' | 'storefront-outline'
  | 'grid-outline' | 'list-outline' | 'layers-outline' | 'bar-chart-outline'
  | 'receipt-outline' | 'wallet-outline' | 'cash-outline' | 'swap-horizontal'
  | 'ticket-outline' | 'medal-outline' | 'library-outline' | 'filter-outline'
  | 'chevron-collapse' | 'pause-outline' | 'play-outline' | 'funnel-outline'
  | 'sunny-outline' | 'time-outline' | 'trash-outline' | 'warning-outline';

// Each entry is the inside of one 24×24 drawing. "Outline" shapes are drawn as
// lines; a few solid ones (a filled star, a filled heart) are drawn as shapes.
const PATHS: Record<IconName, React.ReactNode> = {
  'add': <path d="M12 5v14M5 12h14" />,
  'alert-circle': <><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="M12 7v6" stroke="var(--card)" /><circle cx="12" cy="16.5" r="1" fill="var(--card)" stroke="none" /></>,
  'alert-circle-outline': <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" /></>,
  'arrow-back': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" />,
  'arrow-forward': <path d="M5 12h14M13 6l6 6-6 6" />,
  'bicycle-outline': <><circle cx="6" cy="16.5" r="3.5" /><circle cx="18" cy="16.5" r="3.5" /><path d="M6 16.5l4-8h4l3 8M9.5 8.5h3" /></>,
  'boat-outline': <path d="M4 17l1.5-5h13L20 17M6 12V7h5l3 5M12 5v7M3.5 19c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />,
  'book-outline': <path d="M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a2 2 0 00-2-2H5.5A1.5 1.5 0 014 15.5zM20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a2 2 0 012-2h4.5a1.5 1.5 0 001.5-1.5z" />,
  'bulb-outline': <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.4.3.5.7.5 1.1h6c0-.4.1-.8.5-1.1A6 6 0 0012 3z" />,
  'business-outline': <path d="M3 21h18M5 21V6l7-3v18M19 21V11l-7-3M8.5 9v0M8.5 12.5v0M8.5 16v0M15.5 13v0M15.5 16.5v0" />,
  'calendar-outline': <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  'call-outline': <path d="M6.5 3.5h2.2l1.6 4-2 1.4a11.5 11.5 0 006.8 6.8l1.4-2 4 1.6v2.2a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7a2 2 0 012-2.2z" />,
  'camera-outline': <><path d="M3.5 8.5a2 2 0 012-2h1.8l1.3-2h6.8l1.3 2h1.8a2 2 0 012 2v9a2 2 0 01-2 2h-13a2 2 0 01-2-2z" /><circle cx="12" cy="13" r="3.6" /></>,
  'car-outline': <><path d="M3.5 16v-3l2-5.2A2 2 0 017.4 6.5h9.2a2 2 0 011.9 1.3l2 5.2v3M3.5 13h17" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /><path d="M4.5 18.3V20h2.2M19.5 18.3V20h-2.2" /></>,
  'card-outline': <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19M6 14.8h3.5" /></>,
  'chatbubble-outline': <path d="M20 12.2c0 3.9-3.6 7-8 7a9.3 9.3 0 01-2.7-.4L4.5 20.5l1.3-3.4A6.7 6.7 0 014 12.2c0-3.9 3.6-7 8-7s8 3.1 8 7z" />,
  'checkmark': <path d="M5 12.8l4.6 4.7L19 7.8" />,
  'checkmark-circle': <><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="M8 12.4l2.7 2.7L16 9.6" stroke="var(--card)" strokeWidth="2" /></>,
  'checkmark-circle-outline': <><circle cx="12" cy="12" r="9" /><path d="M8 12.4l2.7 2.7L16 9.6" /></>,
  'chevron-back': <path d="M15 5l-7 7 7 7" />,
  'chevron-down': <path d="M5 9l7 7 7-7" />,
  'chevron-forward': <path d="M9 5l7 7-7 7" />,
  'chevron-up': <path d="M5 15l7-7 7 7" />,
  'close': <path d="M6 6l12 12M18 6L6 18" />,
  'cloud-offline': <><path d="M17 18.5H7a4 4 0 01-.6-8A6 6 0 0117.8 9a3.8 3.8 0 013 5.6" fill="currentColor" stroke="none" opacity="0.9" /><path d="M3.5 3.5l17 17" /></>,
  'cloud-offline-outline': <path d="M17 18.5H7a4 4 0 01-.6-8A6 6 0 0117.8 9a3.8 3.8 0 011.6 7.2M3.5 3.5l17 17" />,
  'cloud-upload-outline': <path d="M17 18.5a3.8 3.8 0 00.8-7.5A6 6 0 006.4 10.5a4 4 0 00.6 8M12 20V10.5M8.6 13.5L12 10l3.4 3.5" />,
  'construct-outline': <path d="M14.2 6.3a3.8 3.8 0 015 5l-2.4-.6-2-2zM13.4 9.9L4.8 18.5a2 2 0 002.8 2.8l8.6-8.6" />,
  'create-outline': <path d="M12 4.5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6M17.2 3.5l3.3 3.3L12.4 15l-3.9.6.6-3.9z" />,
  'document-attach-outline': <path d="M18 10.5V19a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2h5zM13 3v5a1.5 1.5 0 001.5 1.5H18M14.5 13.5v3.2a2.2 2.2 0 01-4.4 0V13a1.3 1.3 0 012.6 0v3.4" />,
  'document-outline': <path d="M18 10.5V19a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2h5zM13 3v5a1.5 1.5 0 001.5 1.5H18" />,
  'documents-outline': <path d="M15 7.5V17a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h4zM11 3v3.5A1.5 1.5 0 0012.5 8H15M8.5 21H16a3 3 0 003-3V9" />,
  'download-outline': <path d="M12 3.5v11M8.2 11l3.8 3.8 3.8-3.8M4.5 16v2.5a2 2 0 002 2h11a2 2 0 002-2V16" />,
  'ellipse': <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />,
  'ellipsis-horizontal': <><circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  'eye-off-outline': <path d="M4 4l16 16M9.9 5.4A9 9 0 0112 5.2c5 0 9 4.4 9 6.8 0 1-.9 2.6-2.4 4M6.4 7.9C4.2 9.4 3 11.2 3 12c0 2.4 4 6.8 9 6.8 1.4 0 2.7-.3 3.8-.9M10.3 10.4a2.4 2.4 0 003.4 3.4" />,
  'eye-outline': <><path d="M3 12c0-2.4 4-6.8 9-6.8s9 4.4 9 6.8c0 2.4-4 6.8-9 6.8S3 14.4 3 12z" /><circle cx="12" cy="12" r="2.6" /></>,
  'flash-outline': <path d="M13.5 2.5L5 13.5h6l-.5 8L19 10.5h-6z" />,
  'gift-outline': <path d="M4 11.5h16v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19.5zM3 7.5h18v4H3zM12 7.5V21M12 7.5S10.8 3 8.6 3a2.3 2.3 0 000 4.5zM12 7.5S13.2 3 15.4 3a2.3 2.3 0 010 4.5z" />,
  'globe-outline': <><circle cx="12" cy="12" r="9" /><path d="M3.2 9.8h17.6M3.2 14.2h17.6M12 3c-4 4.6-4 12.4 0 18 4-5.6 4-13.4 0-18z" /></>,
  'hammer-outline': <path d="M13.5 8.5l-9 9a2 2 0 002.8 2.8l9-9M11.5 6.5l4.2-3 5 5-3 4.2z" />,
  'heart': <path d="M12 20.3l-1.3-1.2C6.1 15 3.2 12.4 3.2 9.2A4.7 4.7 0 018 4.5c1.5 0 3 .7 4 1.9 1-1.2 2.5-1.9 4-1.9a4.7 4.7 0 014.8 4.7c0 3.2-2.9 5.8-7.5 9.9z" fill="currentColor" stroke="none" />,
  'heart-outline': <path d="M12 20.3l-1.3-1.2C6.1 15 3.2 12.4 3.2 9.2A4.7 4.7 0 018 4.5c1.5 0 3 .7 4 1.9 1-1.2 2.5-1.9 4-1.9a4.7 4.7 0 014.8 4.7c0 3.2-2.9 5.8-7.5 9.9z" />,
  'help-circle-outline': <><circle cx="12" cy="12" r="9" /><path d="M9.7 9.4a2.4 2.4 0 114.3 1.5c-.8 1-2 1.3-2 2.6" /><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" /></>,
  'information-circle-outline': <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" /></>,
  'key-outline': <><circle cx="7.5" cy="15.5" r="3.5" /><path d="M10 13L19.5 3.5M16.5 6.5l2.5 2.5M14 9l2.5 2.5" /></>,
  'location': <path d="M12 2.5c-3.9 0-7 3-7 6.8 0 5 7 12.2 7 12.2s7-7.2 7-12.2c0-3.8-3.1-6.8-7-6.8zm0 9.4a2.6 2.6 0 110-5.2 2.6 2.6 0 010 5.2z" fill="currentColor" stroke="none" />,
  'location-outline': <><path d="M12 21.5S5 14.3 5 9.3a7 7 0 1114 0c0 5-7 12.2-7 12.2z" /><circle cx="12" cy="9.3" r="2.6" /></>,
  'lock-closed-outline': <><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M8 10V7.5a4 4 0 118 0V10" /></>,
  'log-out-outline': <path d="M15 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M10 12h10M17 9l3 3-3 3" />,
  'logo-apple': <path d="M16.3 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.6-3.9zM14.1 5.6c.6-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5z" fill="currentColor" stroke="none" />,
  'logo-google': <path d="M21.4 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.3a4.5 4.5 0 01-2 3v2.5h3.2c1.9-1.7 2.9-4.3 2.9-7.4zM12 21.5c2.7 0 5-.9 6.6-2.4l-3.2-2.5a5.9 5.9 0 01-8.8-3.1H3.3v2.6A10 10 0 0012 21.5zM6.6 13.5a5.9 5.9 0 010-3.8V7.1H3.3a10 10 0 000 9zM12 6.4c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0012 2.5a10 10 0 00-8.7 4.6l3.3 2.6A5.9 5.9 0 0112 6.4z" fill="currentColor" stroke="none" />,
  'mail-open-outline': <path d="M3.5 10.5L12 4.5l8.5 6v8a2 2 0 01-2 2h-13a2 2 0 01-2-2zM3.5 10.5L12 16l8.5-5.5" />,
  'mail-outline': <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.6 7.5l8.4 5.6 8.4-5.6" /></>,
  'map-outline': <path d="M9 4.5L3.5 7v13L9 17.5m0-13v13m0-13l6 2.5m0 0v13m0-13l5.5-2.5v13L15 20.5m0 0l-6-3" />,
  'menu': <path d="M4 7h16M4 12h16M4 17h16" />,
  'moon-outline': <path d="M20 14.4A8.2 8.2 0 019.6 4 8.5 8.5 0 1020 14.4z" />,
  'notifications-outline': <path d="M10.2 20.2a2 2 0 003.6 0M18 16.5V11a6 6 0 10-12 0v5.5L4.5 18.2h15z" />,
  'options-outline': <path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9M15 5v5M9 14v5" />,
  'paper-plane-outline': <path d="M20.5 3.5L2.8 10.2l6.6 2.6M20.5 3.5l-3.2 17.2-5-6.4M20.5 3.5L9.4 12.8m0 0v5.4l3-3.7" />,
  'people-outline': <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5a6.5 6.5 0 0113 0M16 5.4a3.5 3.5 0 010 6.7M17.5 14.2a5.5 5.5 0 014 5.3" /></>,
  'person': <><circle cx="12" cy="8" r="4" fill="currentColor" stroke="none" /><path d="M4.5 20.5a7.5 7.5 0 0115 0z" fill="currentColor" stroke="none" /></>,
  'person-outline': <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0115 0" /></>,
  'pricetag-outline': <><path d="M11.4 3.5H19a1.5 1.5 0 011.5 1.5v7.6a2 2 0 01-.6 1.4l-6.4 6.4a2 2 0 01-2.8 0l-6.6-6.6a2 2 0 010-2.8L10.5 4a2 2 0 01.9-.5z" /><circle cx="16" cy="8" r="1.4" /></>,
  'snow-outline': <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6.6l-2.2-2.2M12 6.6l2.2-2.2M12 17.4l-2.2 2.2M12 17.4l2.2 2.2" />,
  'water-outline': <path d="M12 3.2s6.5 6.3 6.5 10.6a6.5 6.5 0 01-13 0C5.5 9.5 12 3.2 12 3.2z" />,
  'print-outline': <><path d="M7 9V4h10v5M7 18H5.5a2 2 0 01-2-2v-5a2 2 0 012-2h13a2 2 0 012 2v5a2 2 0 01-2 2H17" /><path d="M7 14.5h10V21H7z" /></>,
  'refresh': <path d="M20 12a8 8 0 11-2.7-6M20 4v5h-5" />,
  'scan-outline': <path d="M4 8.5V6a2 2 0 012-2h2.5M15.5 4H18a2 2 0 012 2v2.5M20 15.5V18a2 2 0 01-2 2h-2.5M8.5 20H6a2 2 0 01-2-2v-2.5" />,
  'search': <><circle cx="10.8" cy="10.8" r="6.3" /><path d="M15.5 15.5L20.5 20.5" /></>,
  'send': <path d="M20.5 3.5L2.8 10.2l6.6 2.6 2.8 5.9z" fill="currentColor" stroke="none" />,
  'settings-outline': <><circle cx="12" cy="12" r="3" /><path d="M12 2.5l1.4 2.6 2.9-.5.6 2.9 2.6 1.4-1.4 2.6 1.4 2.6-2.6 1.4-.6 2.9-2.9-.5L12 21.5l-1.4-2.6-2.9.5-.6-2.9-2.6-1.4L5.9 12 4.5 9.4l2.6-1.4.6-2.9 2.9.5z" /></>,
  'share-outline': <><circle cx="17.5" cy="5.5" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="18.5" r="2.5" /><path d="M8.7 10.8l6.6-3.9M8.7 13.2l6.6 3.9" /></>,
  'shield-checkmark': <><path d="M12 2.8l7.5 2.8v6c0 4.6-3.2 8.6-7.5 9.6-4.3-1-7.5-5-7.5-9.6v-6z" fill="currentColor" stroke="none" /><path d="M8.6 12.2l2.5 2.5 4.3-4.7" stroke="var(--card)" strokeWidth="2" /></>,
  'shield-checkmark-outline': <><path d="M12 2.8l7.5 2.8v6c0 4.6-3.2 8.6-7.5 9.6-4.3-1-7.5-5-7.5-9.6v-6z" /><path d="M8.6 12.2l2.5 2.5 4.3-4.7" /></>,
  'shield-outline': <path d="M12 2.8l7.5 2.8v6c0 4.6-3.2 8.6-7.5 9.6-4.3-1-7.5-5-7.5-9.6v-6z" />,
  'star': <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none" />,
  'star-half': <><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /><path d="M12 3v14l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none" /></>,
  'star-outline': <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  'storefront': <><path d="M3.5 9.5h17V20a1 1 0 01-1 1h-15a1 1 0 01-1-1z" fill="currentColor" stroke="none" /><path d="M3 9.5L5 4h14l2 5.5z" fill="currentColor" stroke="none" /></>,
  'storefront-outline': <path d="M4 9.8V20a1 1 0 001 1h14a1 1 0 001-1V9.8M3 9.5L5 4h14l2 5.5a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0zM9.5 21v-5.5h5V21" />,
  'sunny-outline': <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  'time-outline': <><circle cx="12" cy="12" r="9" /><path d="M12 6.8V12l3.4 2" /></>,
  'trash-outline': <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 011.3-1.3h2.4a1.3 1.3 0 011.3 1.3v1.7M6.5 6.5l.9 13a1.5 1.5 0 001.5 1.4h6.2a1.5 1.5 0 001.5-1.4l.9-13" />,
  'grid-outline': <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
  'list-outline': <path d="M9 6.5h11M9 12h11M9 17.5h11M4.2 6.5h.01M4.2 12h.01M4.2 17.5h.01" />,
  'layers-outline': <path d="M12 3.2l8.5 4.4-8.5 4.4-8.5-4.4zM3.5 12l8.5 4.4 8.5-4.4M3.5 16.4l8.5 4.4 8.5-4.4" />,
  'bar-chart-outline': <path d="M4 20.5V13M10 20.5V6M16 20.5v-5M21 20.5H3" />,
  'receipt-outline': <path d="M5.5 21V4.2a.7.7 0 011.1-.6L9 5l2.4-1.6a1 1 0 011.2 0L15 5l2.4-1.4a.7.7 0 011.1.6V21l-2.6-1.5-2.4 1.5-2.5-1.5L8.5 21 6 19.5zM9 9.5h6M9 13.5h6" />,
  'wallet-outline': <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16.5 14.5h2" /></>,
  'cash-outline': <><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 10v4M18 10v4" /></>,
  'swap-horizontal': <path d="M4 8.5h13M13.5 5l3.5 3.5-3.5 3.5M20 15.5H7M10.5 12L7 15.5l3.5 3.5" />,
  'ticket-outline': <path d="M3.5 9.2V7a1.5 1.5 0 011.5-1.5h14A1.5 1.5 0 0120.5 7v2.2a2.8 2.8 0 000 5.6V17a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 17v-2.2a2.8 2.8 0 000-5.6zM12 6.5v11" />,
  'medal-outline': <><circle cx="12" cy="14.5" r="5" /><path d="M8.5 9.8L6 3h4l2 3.6L14 3h4l-2.5 6.8M12 12.4l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" /></>,
  'library-outline': <path d="M4 20.5h16M5.5 20.5V9.5M9.5 20.5V9.5M14.5 20.5V9.5M18.5 20.5V9.5M3 9.5L12 3.5l9 6" />,
  'filter-outline': <path d="M3.5 5.5h17l-6.5 7.6v5.6l-4 2.3V13.1z" />,
  'funnel-outline': <path d="M3.5 5.5h17l-6.5 7.6v5.6l-4 2.3V13.1z" />,
  'chevron-collapse': <path d="M7 9.5l5-4.5 5 4.5M7 14.5l5 4.5 5-4.5" />,
  'pause-outline': <path d="M9 5.5v13M15 5.5v13" />,
  'play-outline': <path d="M7 4.8l12 7.2-12 7.2z" />,
  'warning-outline': <><path d="M10.3 4.2L2.7 17.4A2 2 0 004.4 20.5h15.2a2 2 0 001.7-3.1L13.7 4.2a2 2 0 00-3.4 0z" /><path d="M12 9.5v4" /><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" /></>,
};

export type IconProps = {
  name: IconName;
  // How big, in pixels. Icons are square.
  size?: number;
  // Any CSS colour. Left alone, the icon takes the colour of the text it sits
  // beside, which is almost always what you want.
  color?: string;
  className?: string;
  // Icons are decoration by default and are hidden from screen readers, because
  // the words next to them already say what they mean. Pass a label only when an
  // icon stands completely alone with no text — then it must describe the
  // ACTION ("Close this window"), not the picture ("cross").
  label?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 20,
  color,
  className,
  label,
  strokeWidth = 1.7,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      // A decorative icon is hidden from screen readers so they do not announce
      // it alongside the label that already explains it.
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
