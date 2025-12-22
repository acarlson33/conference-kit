"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

export * from "@webrtc-kit/react";

export const isClient = typeof window !== "undefined";

export function dynamicClient<T>(
  factory: () => Promise<{ default: T }>,
  loading?: ReactNode
) {
  return dynamic(factory as any, {
    ssr: false,
    loading: loading ? () => <>{loading}</> : undefined,
  });
}
