import { Navigate, Route, Routes } from "react-router-dom";
import { SessionInspector } from "./components/SessionInspector";
import { AudienceScreen } from "./screens/AudienceScreen";
import { BusinessScreen } from "./screens/BusinessScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { PersonalityScreen } from "./screens/PersonalityScreen";
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
        <Route path="*" element={<Navigate to="/demo/start" replace />} />
      </Routes>
    </SessionInspector>
  );
}
