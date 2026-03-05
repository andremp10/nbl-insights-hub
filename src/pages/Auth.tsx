import React from 'react';
import { SignInCard } from '@/components/ui/travel-connect-signin-1';

export default function Auth() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 auth-grid-bg">
      <SignInCard />
    </div>
  );
}
