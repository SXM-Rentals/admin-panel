// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The settings Next.js reads when it builds and runs the
// panel. Its one real job is the rewrite below, which lets the panel talk to the
// SXM Rentals server.
//
// WHY THE REWRITE EXISTS, AND WHY IT IS NOT OPTIONAL: staff are signed in by a
// cookie the browser is not allowed to read. A browser will not send that cookie
// to a different website, and the panel and the server ARE different websites —
// the panel is at admin.sxmrentals.app, the server on onrender.com. So every
// request would arrive with nobody attached to it, and the panel would be
// permanently signed out no matter how correct the sign-in was.
//
// The rewrite removes the problem rather than working around it. The browser only
// ever talks to the panel's own address, and the panel passes the request on. As
// far as the browser is concerned there is only one website, so the cookie goes
// where it is needed.
//
// THE SERVER ADDRESS IS DELIBERATELY NOT PUBLIC. API_URL has no NEXT_PUBLIC_
// prefix, which means Next.js never sends it to the browser. The address is used
// here, on the server, when the request is passed on.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
