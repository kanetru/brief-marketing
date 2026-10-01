import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sectionById } from "../domain/sections";
import { useSectionPath } from "../state/routeBase";
import type { SectionId } from "../types/discovery";
import { useSession } from "../state/SessionContext";
import { AgencyMark } from "./AgencyMark";
import { EmergingPicture } from "./EmergingPicture";
import { ProgressIndicator } from "./ProgressIndicator";
import { SessionToggle } from "./SessionInspector";

interface DiscoveryLayoutProps {
  section: SectionId;
  step: number;
  width?: "hero" | "narrow" | "wide" | "stage";
  totalSteps?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export function DiscoveryLayout({
  section,
  step,
  width = "narrow",
  totalSteps,
  children,
  footer,
}: DiscoveryLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, activate } = useSession();
  const sectionPath = useSectionPath();

  useEffect(() => {
    if (session.progress.section !== section) {
      activate(section);
    }
  }, [activate, section, session.progress.section]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [section, step]);

  useEffect(() => {
    document.title = `${sectionById(section).label} — Lover Lover`;
  }, [section]);

  return (
    <div className="shell" data-section={section} data-step={step}>
      <header className="top">
        <div className="brand">
          <AgencyMark />
          {location.pathname.startsWith("/demo") ? <Link className="session-link" to="/studio">Manager</Link> : null}
          <SessionToggle />
        </div>
        <ProgressIndicator
          current={section}
          furthest={session.progress.furthest}
          step={step}
          totalSteps={totalSteps}
          hideSections={location.pathname.startsWith("/c/") ? ["profile"] : []}
          onSelect={(next) => {
            activate(next);
            navigate(sectionPath(next));
          }}
        />
      </header>
      <main className={`column is-${width}`}>
        <EmergingPicture />
        {children}
      </main>
      {footer ? <footer className={`dock is-${width}`}>{footer}</footer> : null}
    </div>
  );
}
