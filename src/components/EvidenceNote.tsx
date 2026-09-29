import { useState } from "react";
import { describeEvidence } from "../domain/evidenceLabels";
import type { DiscoveryEvidence } from "../domain/evidence";
import type { ProfileClarification } from "../types/discovery";

export function EvidenceNote({
  references,
  evidence,
  clarifications,
}: {
  references: string[];
  evidence: DiscoveryEvidence;
  clarifications: ProfileClarification[];
}) {
  const [open, setOpen] = useState(false);
  if (references.length === 0) return null;

  return (
    <div className="evidence-note">
      <button type="button" className="evidence-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide evidence" : "Evidence"}
      </button>
      <ul className={open ? "evidence-list is-open" : "evidence-list"}>
        {references.map((path) => (
          <li key={path}>{describeEvidence(path, evidence, clarifications)}</li>
        ))}
      </ul>
    </div>
  );
}
