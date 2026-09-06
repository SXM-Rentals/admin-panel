// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Shows the SXM Rentals logo.
//
// THE CUSTOMER WEBSITE KEEPS TWO VERSIONS OF THE ARTWORK — a black one for
// light backgrounds and a white one for dark — and swaps between them as the
// theme changes. The admin panel has no light theme, so there is nothing to
// swap: the white artwork is correct on every screen in this product, and this
// file simply shows it. Half the work the website's version does is not needed
// here, and leaving it in would only invite someone to wonder what it was for.
//
// THIS IS THE ONLY FILE IN THE PANEL THAT SHOWS THE LOGO. If the artwork ever
// changes, replace public/brand/logo-white.png and nothing else needs touching.

import React from 'react';
import Image from 'next/image';

// The supplied artwork is 1675 x 442, so it is a little under four times as
// wide as it is tall. Keeping this here means the logo can be asked for by
// height alone and never comes out stretched or squashed.
const LOGO_ASPECT = 1675 / 442;

export type LogoProps = {
  // How tall the logo should be. The width follows automatically.
  size?: number;
  className?: string;
  // Set where the logo is not the main heading, so the wording is not announced
  // twice to someone listening to the page.
  decorative?: boolean;
  priority?: boolean;
};

export function Logo({ size = 26, className, decorative = false, priority = false }: LogoProps) {
  const width = Math.round(size * LOGO_ASPECT);
  // The artwork already contains the words "SXM RENTALS", so this is what the
  // logo says, not a description of the picture.
  const alt = decorative ? '' : 'SXM Rentals';

  return (
    <Image
      src="/brand/logo-white.png"
      alt={alt}
      width={width}
      height={size}
      className={className}
      priority={priority}
    />
  );
}

export default Logo;
