'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// `admin-shell` is what swaps the whole panel onto bicho's own palette
// (deep teal / lime / warm cream) — see the token block in globals.css.
// It has to sit here rather than in the layout so every admin surface
// gets it, and nowhere else in the app may carry this class.
//
// The ambient blur blobs that used to live here are gone: they were the
// last piece of the abandoned glassmorphism direction, they were painted
// with fixed indigo/violet in CSS so they can't follow this palette, and
// an operator console doesn't need atmosphere behind its data.
export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Desktop rail collapse. Lives here rather than in Sidebar because
  // TopBar owns the toggle and main has to reclaim the width.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-shell relative flex min-h-screen bg-paper">
      <Sidebar
        email={email}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collapsed={collapsed}
      />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenuClick={() => setMobileNavOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
