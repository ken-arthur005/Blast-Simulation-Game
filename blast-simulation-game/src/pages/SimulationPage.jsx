import { useNavigate } from "react-router-dom";
import { useCSVReader } from "react-papaparse";
import React, { useEffect, useState, useContext, useRef } from "react";
import Toast from "../components/Toast";
import Papa from "papaparse";
import { Gamepad2 } from "lucide-react";
import { AiOutlineCloudUpload } from "react-icons/ai";
import csvDataValidation from "../utils/csvDataValidation";
import OreGridVisualization from "../components/OreGridVisualization";
import { GameContext } from "../components/GameContext";

const SimulationPage = () => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [toast, setToast] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());
  const [validatedData, setValidatedData] = useState(null);
  const { gameState } = useContext(GameContext) || {};
  const playerName = (gameState && gameState.playerName) || "Player";
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(() => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768
    );
  });

  useEffect(() => {
    // If gameState is missing or playerName is empty string/null/undefined
    if (!gameState || !gameState.playerName || gameState.playerName.trim() === "") {
      // Redirect to Home Page
      navigate("/"); 
    }
  }, [gameState, navigate]);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 8000);
  };

  const resetFileVisuals = () => setFileKey(Date.now());

  const getInitials = (name) => {
    if (!name) return "PL";
    const names = name.split(" ").filter(Boolean);
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names.map((n) => n.charAt(0).toUpperCase()).join("");
  };

  // Load appropriate CSV based on mobile state
  useEffect(() => {
    const loadDefaultCsv = async () => {
      try {
        // Load mobile CSV for screens < 600px, desktop CSV for >= 600px (Surface Duo gets desktop)
        const csvFile =
          window.innerWidth < 600
            ? "/sample-ore-mobile.csv"
            : "/sample-ore-large.csv";
        const res = await fetch(csvFile);
        if (!res.ok) throw new Error("Failed to fetch default CSV file");
        const csvText = await res.text();
        const results = Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          transform: (v) => (typeof v === "string" ? v.trim() : v),
        });
        setValidatedData(results);
      } catch (err) {
        console.error(err);
      }
    };
    loadDefaultCsv();
  }, [isMobileView]);

  // OPTIMIZED: Debounced resize handler to prevent excessive re-renders
  const resizeTimeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Debounce resize handling (wait 150ms after last resize event)
      resizeTimeoutRef.current = setTimeout(() => {
        const newIsMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) || window.innerWidth < 768;
        if (newIsMobile !== isMobileView) {
          setIsMobileView(newIsMobile);
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isMobileView]);

  return (
    <div
      className="w-full h-screen flex flex-col fixed bg3"
      style={{
        padding:
          window.innerWidth >= 1024 && window.innerHeight <= 700
            ? "8px"
            : window.innerWidth >= 1024
            ? "1.5rem"
            : window.innerWidth >= 768
            ? "1rem"
            : window.innerWidth >= 640
            ? "0.75rem"
            : "0.5rem",
      }}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-row justify-between items-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
        <div className="flex-1">
          <h1 className="ui-font text-white text-[18px] sm:text-[22px] md:text-[28px] lg:text-[32px] [-webkit-text-stroke:1px_#E7B32F] lg:[-webkit-text-stroke:2px_#E7B32F]">
            ROCK BLASTERZ
          </h1>
          <p className="flex gap-1 md:gap-2 text-[#C6D662] text-[9px] sm:text-[10px] md:text-sm lg:text-base items-start md:items-center mr-3 sm:mr-4 lg:mr-0">
            <Gamepad2 className="w-3 h-3 md:w-6 md:h-6 flex-shrink-0" />{" "}
            Welcome, {playerName}! Design your blast pattern to maximize ore
            recovery
          </p>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 md:gap-4 lg:gap-8 items-center">
          <CSVReader
            key={fileKey}
            onUploadAccepted={(results, file) => {
              if (!file || !file.name) {
                showToast(
                  "No file provided. Please upload a CSV file.",
                  "error"
                );
                setZoneHover(false);
                resetFileVisuals();
                return;
              }

              const fileName = (file.name || "").toString().toLowerCase();
              const isCsvExt = fileName.endsWith(".csv");
              const mimeType = file.type || "";
              const isCsvMime =
                mimeType.includes("csv") || mimeType === "text/plain";

              if (!isCsvExt && !isCsvMime) {
                showToast("Please upload a valid CSV file (.csv)", "error");
                setZoneHover(false);
                resetFileVisuals();
                return;
              }

              const dataValidation = csvDataValidation(results);
              if (!dataValidation.isValid) {
                showToast(dataValidation.error, "error");
                setZoneHover(false);
                resetFileVisuals();
                return;
              }

              setValidatedData(results);
              showToast(
                `CSV file validated successfully! Found ${Math.max(
                  0,
                  (results.data || []).length - 1
                )} data rows.`,
                "success"
              );
              setZoneHover(false);
            }}
            onUploadRejected={(results, file) => {
              console.log("Upload rejected:", results, file);
              showToast("File upload was rejected. Please try again.", "error");
            }}
            config={{
              header: false,
              skipEmptyLines: true,
              transform: (v) => (typeof v === "string" ? v.trim() : v),
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setZoneHover(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setZoneHover(false);
            }}
          >
            {({ getRootProps, acceptedFile }) => (
              <div
                {...getRootProps()}
                className={`relative rounded md:rounded-lg p-1 sm:p-1.5 md:p-2 text-center cursor-pointer transition-all duration-200 ease-in-out border-b-2 ${
                  acceptedFile
                    ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-[border-pulse_3s_ease-in-out]"
                    : zoneHover
                    ? "border-blue-500 bg-blue-50 transform scale-105"
                    : "border-b-gray-300 bg-amber-600 hover:border-b-gray-400 hover:bg-amber-900"
                }`}
                style={
                  acceptedFile
                    ? {
                        animation: "border-glow 3s ease-in-out",
                        backgroundImage:
                          "linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent)",
                        backgroundSize: "200% 100%",
                        backgroundPosition: "-100% 0",
                      }
                    : {}
                }
              >
                <div>
                  <div className="flex justify-center">
                    <AiOutlineCloudUpload
                      className={`w-4 h-3 sm:w-5 sm:h-4 md:w-7 md:h-5 lg:w-8 lg:h-6 transition-colors duration-200 ${
                        acceptedFile
                          ? "text-green-500"
                          : zoneHover
                          ? "text-blue-500"
                          : "text-white"
                      }`}
                    />
                    <span>
                      <p className="text-[10px] sm:text-xs md:text-sm font-medium text-white">
                        Import CSV
                      </p>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CSVReader>

          <div className="p-1 sm:p-1.5 md:p-2 mx-1 sm:mx-2 md:mx-3 lg:mx-4 bg-[#C6D662] rounded-full border border-gray-400 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-700">
            <p className="flex flex-row items-center">
              {getInitials(playerName)}
            </p>
          </div>
        </div>
      </div>

      {validatedData && (
        <OreGridVisualization
          csvData={validatedData}
          onGridProcessed={(gridData) => {
            console.log("Grid processed in CsvParse:", gridData);
          }}
        />
      )}
    </div>
  );
};

export default SimulationPage;
