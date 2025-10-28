import { useCSVReader } from "react-papaparse";
import React, { useEffect, useState, useContext } from "react";
import Toast from "../Components/Toast";
// import { useCSVReader, formatFileSize } from "react-papaparse";
import Papa from "papaparse";
import { Gamepad2 } from "lucide-react";
import { AiOutlineCloudUpload } from "react-icons/ai";
import csvDataValidation from "../utils/csvDataValidation";
import CsvFileValidation from "./CsvFileValidation";
import OreGridVisualization from "./OreGridVisualization";
import { GameContext } from "./GameContext";

const CsvParse = () => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  // const [removeHoverColor, setRemoveHoverColor] = useState();
  const [toast, setToast] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());
  const [validatedData, setValidatedData] = useState(null);
  const { gameState } = useContext(GameContext);
  const { playerName } = gameState;

  const showToast = (message, type = "error") => {
    setToast({ message, type });

    setTimeout(() => setToast(null), 10000);
  };

  //automatically load default CSV file

  const resetFileVisuals = () => {
    setFileKey(Date.now());
  };

  const getInitials = (playerName) => {
    if (!playerName) return "PL";
    const names = playerName.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    const initials = names.map((name) => name.charAt(0).toUpperCase());
    return initials.join("");
  };

  useEffect(() => {
    const loadDefaultCsv = async () => {
      try {
        const response = await fetch("/sample-ore-large.csv");
        if (!response.ok) {
          throw new Error("Failed to fetch default CSV file");
        }
        const csvText = await response.text();
        // Parse the CSV text
        const results = Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          transform: (value) => value.trim(),
        });
        setValidatedData(results);
        console.log("Default CSV file loaded:", results);
      } catch (error) {
        console.error(error);
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
          <h1 className="ui-font text-white text-[32px] [-webkit-text-stroke:2px_#E7B32F]">ROCK BLASTERZ</h1>

          <p className="flex gap-2 text-[#C6D662]">
            <Gamepad2 />
            Welcome, {playerName}! Design your blast pattern to maximize ore
            recovery and achieve the highest score
          </p>
        </div>
        <div className="flex justify-end mb-6 gap-8 items-center">
          <CSVReader
            key={fileKey}
            onUploadAccepted={(results, file) => {
              console.log("---------------------------");
              console.log("Upload accepted, validating...");
              console.log("Results:", results);
              console.log("File:", file);
              console.log("---------------------------");

              // First validate the file itself
              const fileValidation = CsvFileValidation(file);
              if (!fileValidation.isValid) {
                showToast(fileValidation.error, "error");
                setZoneHover(false);
                resetFileVisuals();
                return; // Don't proceed with data validation
              }

              // Then validate the CSV data
              const dataValidation = csvDataValidation(results);
              if (!dataValidation.isValid) {
                showToast(dataValidation.error, "error");
                setZoneHover(false);
                resetFileVisuals();
                return; // Don't accept the file
              }

              // If all validations pass
              setValidatedData(results); // <-- pass the whole results object
              showToast(
                `CSV file validated successfully! Found ${
                  results.data.length - 1
                } data rows.`,
                "success"
              );
              console.log("Validated CSV data:", dataValidation.data);
              setZoneHover(false);
            }}
            onUploadRejected={(results, file) => {
              console.log("Upload rejected:", results, file);
              showToast("File upload was rejected. Please try again.", "error");
            }}
            config={{
              header: false, // We'll handle headers manually for better validation
              skipEmptyLines: true,
              transform: (value) => value.trim(), // Trim whitespace from all values
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
            {({
              getRootProps,
              acceptedFile,
              // ProgressBar,
              // getRemoveFileProps,
              // Remove,
            }) => (
              <>
                <div
                  {...getRootProps()}
                  className={`
                  relative border-2 border-dashed rounded-lg p-2 text-center cursor-pointer
                  transition-all duration-200 ease-in-out
                  ${
                    zoneHover
                      ? "border-blue-500 bg-blue-50 transform scale-105"
                      : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                  }
                  ${acceptedFile ? "border-green-500 bg-green-50" : ""}
                `}
                >
                  {acceptedFile ? (
                    <>
                      {/* File accepted state */}
                      <div className="space-y-4">
                        {/* File info section */}
                        <div className="flex items-center justify-center space-x-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>

                          <p className="text-sm font-medium text-gray-900">
                            {acceptedFile.name}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Upload prompt state */}
                      <div>
                        {/* Upload icon */}
                        <div className="flex justify-center">
                          <AiOutlineCloudUpload
                            className={`
                            w-8 h-6 transition-colors duration-200
                            ${zoneHover ? "text-blue-500" : "text-gray-400"}
                          `}
                          />
                          <span>
                            <p className="text-sm font-medium text-gray-700">
                              Import CSV
                            </p>
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CSVReader>
          <div className="p-2 mx-4 bg-gray-200 rounded-full border border-gray-400 w-12 h-12 flex items-center justify-center text-lg font-semibold text-gray-700">
            <p className="flex flex-row items-center">
              {getInitials(playerName)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Visualization Section */}
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

export default CsvParse;
