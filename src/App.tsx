import { Navigate, Route, Routes } from "react-router-dom";
import { SessionInspector } from "./components/SessionInspector";
import { AudienceScreen } from "./screens/AudienceScreen";
import { BusinessScreen } from "./screens/BusinessScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { ClarifyScreen } from "./screens/ClarifyScreen";
import { ColourScreen } from "./screens/ColourScreen";
import { CompleteScreen } from "./screens/CompleteScreen";
import { HandoverScreen } from "./screens/HandoverScreen";
import { ImageryScreen } from "./screens/ImageryScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { InspirationScreen } from "./screens/InspirationScreen";
import { PersonalityScreen } from "./screens/PersonalityScreen";
import { SpectrumScreen } from "./screens/SpectrumScreen";
import { TerritoryGalleryScreen } from "./screens/TerritoryGalleryScreen";
import { TypeScreen } from "./screens/TypeScreen";
import { VisualScreen } from "./screens/VisualScreen";
import { VoiceScreen } from "./screens/VoiceScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";

export function App() {
  return (
    <SessionInspector>
      <Routes>
        <Route path="/" element={<Navigate to="/demo/start" replace />} />
        <Route path="/demo" element={<Navigate to="/demo/start" replace />} />
        <Route path="/demo/start" element={<WelcomeScreen />} />
        <Route path="/demo/business" element={<BusinessScreen />} />
        <Route path="/demo/audience" element={<AudienceScreen />} />
        <Route path="/demo/goals" element={<GoalsScreen />} />
        <Route path="/demo/personality" element={<PersonalityScreen />} />
        <Route path="/demo/spectrum" element={<SpectrumScreen />} />
        <Route path="/demo/visual" element={<VisualScreen />} />
        <Route path="/demo/colour" element={<ColourScreen />} />
        <Route path="/demo/type" element={<TypeScreen />} />
        <Route path="/demo/imagery" element={<ImageryScreen />} />
        <Route path="/demo/voice" element={<VoiceScreen />} />
        <Route path="/demo/inspiration" element={<InspirationScreen />} />
        <Route path="/demo/clarify" element={<ClarifyScreen />} />
        <Route path="/demo/territories" element={<TerritoryGalleryScreen />} />
        <Route path="/demo/territories/:fixtureId" element={<TerritoryGalleryScreen />} />
        <Route path="/demo/profile" element={<ProfileScreen />} />
        <Route path="/demo/handover" element={<HandoverScreen />} />
        <Route path="/demo/complete" element={<CompleteScreen />} />
        <Route path="*" element={<Navigate to="/demo/start" replace />} />
      </Routes>
    </SessionInspector>
  );
}
