import React, { useState } from "react";
import Toast from "./Toast";
import { useCSVReader, formatFileSize } from "react-papaparse";
import { AiOutlineCloudUpload } from "react-icons/ai";
import CsvDataValidation from "./CsvDataValidation";
import CsvFileValidation from "./CsvFileValidation";
import OreGridVisualization from "./OreGridVisualization";

const CsvParse = () => {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);
  const [toast, setToast] = useState(null);
  const [validatedData, setValidatedData] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  return (
    // background
    <div className="w-full h-screen p-6 flex flex-col  fixed">
      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
     <div className="flex items-center justify-between">
       <div>
        <h1 className="bg-clip-text bg-linear-to-r from-[#4E3063] to-[#C19A88] text-stroke text-[32px]">ROCK BLASTERZ</h1>
        <p>Welcome, Suraiya! Design your blast pattern to maximize ore recovery and achieve the highest score</p>
      </div>

      {/* Import CSV button - top right */}
      <div className="flex justify-end mb-6">
        <CSVReader
          onUploadAccepted={(results, file) => {
            const fileValidation = CsvFileValidation(file);
            if (!fileValidation.isValid) {
              showToast(fileValidation.error, "error");
              setZoneHover(false);
              return;
            }
            const dataValidation = CsvDataValidation(results);
            if (!dataValidation.isValid) {
              showToast(dataValidation.error, "error");
              setZoneHover(false);
              return;
            }
            setValidatedData(dataValidation.data);
            showToast(
              `CSV file validated successfully! Found ${
                results.data.length - 1
              } data rows.`,
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
            transform: (value) => value.trim(),
          }}
        >
          {({ getRootProps, acceptedFile }) => (
            <div
              {...getRootProps()}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer
                transition-all duration-200 ease-in-out
                border ${zoneHover ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"}
                ${acceptedFile ? "border-green-500 bg-green-50" : ""}
              `}
              style={{ height: "48px", minWidth: "160px" }} // fixed height, smaller width
            >
              <AiOutlineCloudUpload className="text-xl text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Import CSV
              </span>
            </div>
          )}
        </CSVReader>
      </div>
     </div>

      {/* Grid structure - main content */}
      <div className="flex flex-1 justify-center items-center ">
        <div className="grid w-full mx-auto">
          {/* Left side - you can add other content later if needed */}
          {/* <div className="flex flex-col justify-center items-center">
            <p className="text-gray-600 text-center">
              Upload a CSV file to visualize ore distribution.
            </p>
          </div> */}

          {/* Right side - grid visualization & legend */}
          <div className="flex flex-col items-center gap-6">
            {validatedData && (
              <OreGridVisualization
                csvData={validatedData}
                onGridProcessed={(gridData) => {
                  console.log("Grid processed in CsvParse:", gridData);
                }}
              />
            )}

            {/* Text under visualization */}
            {/* <p className="text-gray-600 text-sm">2D Ore Grid Visualization</p>

            {/* Ore types legend (vertical) */}
            {/* <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-yellow-400 rounded"></span> Gold
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-500 rounded"></span> Silver
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-red-500 rounded"></span> Copper
              </span> */}
              {/* add more ore types here */}
            {/* </div>  */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvParse;
