import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CsvParse from "./pages/SimulationPage.jsx";
import { GameProvider } from "./Components/GameContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/simulation",
    element: <CsvParse />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>
  </StrictMode>
);
