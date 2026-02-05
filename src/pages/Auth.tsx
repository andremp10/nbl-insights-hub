import React from 'react';
import { SignInCard } from '@/components/ui/travel-connect-signin-1';
import DotMapCanvas from '@/components/auth/DotMapCanvas'; // Keeping this if needed, or removing if SignInCard has its own map.
// SignInCard HAS its own DotMap.
// So I don't need DotMapCanvas or background effects from Auth.tsx anymore as SignInCard wraps everything.

export default function Auth() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <SignInCard />
    </div>
  );
}