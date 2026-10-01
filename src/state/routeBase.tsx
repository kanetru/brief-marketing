import { createContext, useContext, type ReactNode } from "react";
import { pathFor } from "../domain/sections";
import type { SectionId } from "../types/discovery";

const RoutePrefixContext = createContext("");

export function RoutePrefix({ prefix, children }: { prefix: string; children: ReactNode }) {
  return <RoutePrefixContext.Provider value={prefix}>{children}</RoutePrefixContext.Provider>;
}

export function useSectionPath(): (section: SectionId) => string {
  const prefix = useContext(RoutePrefixContext);
  return (section: SectionId) => {
    const path = pathFor(section);
    if (!prefix) return path;
    return path.replace(/^\/demo/, prefix);
  };
}
