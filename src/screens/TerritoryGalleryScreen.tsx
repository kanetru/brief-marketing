import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { TerritoryStage } from "../components/TerritoryStage";
import { buildBrandIntelligence } from "../domain/brandIntelligence";
import { clearImageryCache } from "../services/territoryImageCache";
import { formalVoiceFixture, geometricFixture, humanVoiceFixture, organicFixture } from "../fixtures/brandFixtures";
import type { DiscoverySession } from "../types/discovery";

const FIXTURES: Array<{ id: string; name: string; load: () => DiscoverySession }> = [
  { id: "organic-raw-warm", name: "Organic / raw / warm", load: organicFixture },
  { id: "geometric-polished", name: "Geometric / polished / cool", load: geometricFixture },
  { id: "voice-human", name: "Human voice", load: humanVoiceFixture },
  { id: "voice-formal", name: "Formal voice", load: formalVoiceFixture },
];

export function TerritoryGalleryScreen() {
  const { fixtureId } = useParams();
  const fixture = FIXTURES.find((item) => item.id === fixtureId) ?? FIXTURES[0];
  const intelligence = useMemo(() => buildBrandIntelligence(fixture?.load() ?? organicFixture()), [fixture]);

  if (!fixture) return null;

  return (
    <div className="gallery-page">
      <p className="kicker">Territory fixtures</p>
      <h1 className="display">{fixture.name}</h1>
      <nav className="gallery-switch" aria-label="Fixtures">
        {FIXTURES.map((item) => (
          <Link key={item.id} to={`/demo/territories/${item.id}`} aria-current={item.id === fixture.id ? "page" : undefined}>
            {item.name}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          for (const spec of intelligence.visualSpecs) clearImageryCache(spec.versionKey);
          window.location.reload();
        }}
      >
        Regenerate imagery
      </button>
      <div className="territory-compare">
        {intelligence.visualSpecs.map((spec, index) => {
          const chapter = intelligence.reading.territories.find((item) => item.archetypeId === spec.territoryId);
          return (
            <div key={spec.territoryId}>
              <TerritoryStage spec={spec} index={index} label={chapter?.name ?? intelligence.territories[index]?.name} mode="immersive" />
              {chapter ? <p className="territory-idea">{chapter.idea}</p> : null}
              {chapter ? <p className="territory-why">{chapter.risk}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
