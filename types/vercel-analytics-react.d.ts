declare module "@vercel/analytics/react" {
  import type { JSX } from "react";

  export function Analytics(props?: Record<string, unknown>): JSX.Element | null;
}
