import type { ReactNode } from "react";

type OperatorLayoutProps = {
  children: ReactNode;
};

export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  return children;
}
