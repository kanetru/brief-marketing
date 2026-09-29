import { Navigate, Route, Routes } from "react-router-dom";
import { SessionInspector } from "./components/SessionInspector";
import { AudienceScreen } from "./screens/AudienceScreen";
import { BusinessScreen } from "./screens/BusinessScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { ColourScreen } from "./screens/ColourScreen";
import { ImageryScreen } from "./screens/ImageryScreen";
import { PersonalityScreen } from "./screens/PersonalityScreen";
import { SpectrumScreen } from "./screens/SpectrumScreen";
import { TypeScreen } from "./screens/TypeScreen";
import { VisualScreen } from "./screens/VisualScreen";
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
        <Route path="*" element={<Navigate to="/demo/start" replace />} />
      </Routes>
    </SessionInspector>
  );
}
