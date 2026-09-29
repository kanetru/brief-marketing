import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { pathFor, sectionById } from "../domain/sections";
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
  const { session, activate } = useSession();

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
          <SessionToggle />
        </div>
        <ProgressIndicator
          current={section}
          furthest={session.progress.furthest}
          step={step}
          totalSteps={totalSteps}
          onSelect={(next) => {
            activate(next);
            navigate(pathFor(next));
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
