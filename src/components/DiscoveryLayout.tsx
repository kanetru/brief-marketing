import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { actAlreadySeen, actFor, markActSeen } from "../design/acts";
import { experienceMood } from "../design/mood";
import { sectionById } from "../domain/sections";
import { useSectionPath } from "../state/routeBase";
import type { SectionId } from "../types/discovery";
import { useSession } from "../state/SessionContext";
import { ActInterstitial } from "./ActInterstitial";
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
  const act = step === 0 ? actFor(section) : null;
  const [actOpen, setActOpen] = useState(() => Boolean(act) && !actAlreadySeen(section));
  const mood = experienceMood(session.personality.attract.selected);
  const dark = section === "welcome" || section === "complete" || actOpen;

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

  useEffect(() => {
    const next = step === 0 ? actFor(section) : null;
    setActOpen(Boolean(next) && !actAlreadySeen(section));
  }, [section, step]);

  return (
    <div className={dark ? "shell is-dark" : "shell"} data-section={section} data-step={step} data-mood={mood}>
      <header className="top">
        <div className="brand">
          <AgencyMark />
          {location.pathname.startsWith("/demo") ? <Link className="session-link" to="/studio">Manager</Link> : null}
          <SessionToggle />
        </div>
        {section === "welcome" || section === "complete" ? null : (
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
        )}
      </header>
      <main className={`column is-${width}`}>
        {actOpen && act ? (
          <ActInterstitial
            act={act}
            onContinue={() => {
              markActSeen(section);
              setActOpen(false);
            }}
          />
        ) : (
          <>
            <EmergingPicture />
            {children}
          </>
        )}
      </main>
      {footer && !actOpen ? <footer className={`dock is-${width}`}>{footer}</footer> : null}
    </div>
  );
}
