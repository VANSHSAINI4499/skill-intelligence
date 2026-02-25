import React from "react";
import ShaderBackground from "@/components/ui/shader-background";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * AuthLayout — full-screen wrapper used by all auth pages (login, register, admin register).
 *
 * Layer order (bottom → top):
 *   -z-10  ShaderBackground canvas  (WebGL, fixed, pointer-events-none)
 *    z-0   black base layer          (fills any gap between shader frames)
 *    z-10  content slot              (centered, responsive, scrollable)
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-x-hidden px-4 py-12">
      {/* Animated WebGL background — fixed behind everything */}
      <ShaderBackground />

      {/* Semi-transparent overlay to tone down the shader for readability */}
      <div
        className="fixed inset-0 z-0 bg-black/40 pointer-events-none"
        aria-hidden="true"
      />

      {/* Content — sits above canvas & overlay */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
