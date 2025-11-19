import { useCSVReader } from "react-papaparse";
import React, { useEffect, useState, useContext } from "react";
import Toast from "../Components/Toast";
import Papa from "papaparse";
import { Gamepad2 } from "lucide-react";
import { AiOutlineCloudUpload } from "react-icons/ai";
import csvDataValidation from "../utils/csvDataValidation";
import OreGridVisualization from "../Components/OreGridVisualization";
import { GameContext } from "../Components/GameContext";

const SimulationPage = () => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [toast, setToast] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());
  const [validatedData, setValidatedData] = useState(null);
  const { gameState } = useContext(GameContext) || {};
  const playerName = (gameState && gameState.playerName) || "Player";

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

  useEffect(() => {
    const loadDefaultCsv = async () => {
      try {
        const res = await fetch("/sample-ore-large.csv");
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
  }, []);

  return (
    <div className="w-full h-screen p-6 flex flex-col fixed bg3">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="ui-font text-white text-[32px] [-webkit-text-stroke:2px_#E7B32F]">
            ROCK BLASTERZ
          </h1>
          <p className="flex gap-2 text-[#C6D662]">
            <Gamepad2 /> Welcome, {playerName}! Design your blast pattern to
            maximize ore recovery and achieve the highest score
          </p>
        </div>

        <div className="flex justify-end mb-6 gap-8 items-center">
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
                className={`relative rounded-lg p-2 text-center cursor-pointer transition-all duration-200 ease-in-out border-b-2 ${
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
                      className={`w-8 h-6 transition-colors duration-200 ${
                        acceptedFile
                          ? "text-green-500"
                          : zoneHover
                          ? "text-blue-500"
                          : "text-white"
                      }`}
                    />
                    <span>
                      <p className="text-sm font-medium text-white">
                        Import CSV
                      </p>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CSVReader>

          <div className="p-2 mx-4 bg-[#C6D662] rounded-full border border-gray-400 w-12 h-12 flex items-center justify-center text-lg font-semibold text-gray-700">
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
