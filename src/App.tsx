import { Navigate, Route, Routes } from "react-router-dom";
import { SessionInspector } from "./components/SessionInspector";
import { AudienceScreen } from "./screens/AudienceScreen";
import { BusinessScreen } from "./screens/BusinessScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { RealityScreen } from "./screens/RealityScreen";
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
import { ClientIndex, ClientProjectGate, ManagerGate } from "./screens/studio/gates";
import { AgencySetup } from "./screens/studio/AgencySetup";
import { ProjectList } from "./screens/studio/ProjectList";
import { ProjectWorkspace } from "./screens/studio/ProjectWorkspace";
import { FollowUpScreen } from "./screens/FollowUpScreen";

export function App() {
  return (
    <SessionInspector>
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/demo" element={<Navigate to="/demo/start" replace />} />
        <Route path="/demo/start" element={<WelcomeScreen />} />
        <Route path="/demo/business" element={<BusinessScreen />} />
        <Route path="/demo/audience" element={<AudienceScreen />} />
        <Route path="/demo/goals" element={<GoalsScreen />} />
        <Route path="/demo/reality" element={<RealityScreen />} />
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
        <Route path="/studio" element={<ManagerGate><ProjectList /></ManagerGate>} />
        <Route path="/studio/look" element={<ManagerGate><AgencySetup /></ManagerGate>} />
        <Route path="/studio/:projectId" element={<ManagerGate><ProjectWorkspace /></ManagerGate>} />
        <Route path="/c/:token" element={<ClientProjectGate />}>
          <Route index element={<ClientIndex />} />
          <Route path="start" element={<WelcomeScreen />} />
          <Route path="business" element={<BusinessScreen />} />
          <Route path="audience" element={<AudienceScreen />} />
          <Route path="goals" element={<GoalsScreen />} />
          <Route path="reality" element={<RealityScreen />} />
          <Route path="personality" element={<PersonalityScreen />} />
          <Route path="spectrum" element={<SpectrumScreen />} />
          <Route path="visual" element={<VisualScreen />} />
          <Route path="colour" element={<ColourScreen />} />
          <Route path="type" element={<TypeScreen />} />
          <Route path="imagery" element={<ImageryScreen />} />
          <Route path="voice" element={<VoiceScreen />} />
          <Route path="inspiration" element={<InspirationScreen />} />
          <Route path="clarify" element={<ClarifyScreen />} />
          <Route path="follow-up" element={<FollowUpScreen />} />
          <Route path="complete" element={<CompleteScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/demo/start" replace />} />
      </Routes>
    </SessionInspector>
  );
}
