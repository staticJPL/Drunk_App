import { Routes, Route, Navigate } from "react-router-dom";

import StartDrinking from "../features/tavern/pages/StartDrinking.jsx";
import LiveDrinking from "../features/tavern/pages/LiveDrinking.jsx";
// import DrinkingTest from "../features/tavern/pages/DrinkingTest.jsx";
import AdminTavern from "../features/tavern/pages/AdminTavern.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StartDrinking />} />
      <Route path="/live" element={<LiveDrinking />} />
      {/* <Route path="/test" element={<DrinkingTest />} /> */}
      {<Route path="/admin" element={<AdminTavern />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}