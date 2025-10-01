import React, {useState} from 'react'
import Toast from './Toast';
import {
  useCSVReader,
  formatFileSize,
} from 'react-papaparse'

import { AiOutlineCloudUpload } from "react-icons/ai";
import CsvDataValidation from './CsvDataValidation';
import CsvFileValidation from './CsvFileValidation';
import OreGridVisualization from './OreGridVisualization';

const CsvParse = () => {
    const { CSVReader } = useCSVReader();
    const [zoneHover, setZoneHover] = useState(false);
    const [removeHoverColor, setRemoveHoverColor] = useState();
    const [toast, setToast] = useState(null);
    const [validatedData, setValidatedData] = useState(null);


    const showToast = (message, type = 'error') => {
      setToast({ message, type });
      
      setTimeout(() => setToast(null), 5000);
    };

   
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
        <CSVReader 
          onUploadAccepted={(results, file) => {
            console.log('---------------------------');
            console.log('Upload accepted, validating...');
            console.log('Results:', results);
            console.log('File:', file);
            console.log('---------------------------');
            
            // First validate the file itself
            const fileValidation = CsvFileValidation(file);
            if (!fileValidation.isValid) {
              Toast(fileValidation.error, 'error');
              setZoneHover(false);
              return; // Don't proceed with data validation
            }

            // Then validate the CSV data
            const dataValidation = CsvDataValidation(results);
            if (!dataValidation.isValid) {
              showToast(dataValidation.error, 'error');
              setZoneHover(false);
              return; // Don't accept the file
            }

            // If all validations pass
            setValidatedData(dataValidation.data);
            showToast(`CSV file validated successfully! Found ${results.data.length - 1} data rows.`, 'success');
            console.log('Validated CSV data:', dataValidation.data);
            setZoneHover(false);
          }}
          onUploadRejected={(results, file) => {
            console.log('Upload rejected:', results, file);
            showToast('File upload was rejected. Please try again.', 'error');
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
            ProgressBar,
            getRemoveFileProps,
            Remove,
          }) => (
            <>
              <div 
                {...getRootProps()} 
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all duration-200 ease-in-out
                  ${zoneHover 
                    ? 'border-blue-500 bg-blue-50 transform scale-105' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }
                  ${acceptedFile ? 'border-green-500 bg-green-50' : ''}
                `}
              >
                {acceptedFile ? (
                  <>
                    {/* File accepted state */}
                    <div className="space-y-4">
                      {/* File info section */}
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{acceptedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(acceptedFile.size)}</p>
                        </div>
                      </div>
                      
                      {/* Progress bar section */}
                      <div className="w-full">
                        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                          <ProgressBar style={{backgroundColor: '#3B82F6'}} />
                        </div>
                      </div>
                      
                      {/* Remove button */}
                      <div className="flex justify-center">
                        <button
                          {...getRemoveFileProps()}
                          className={`
                            inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                            transition-colors duration-200
                            ${removeHoverColor 
                              ? 'bg-red-600 text-white' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }
                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                          `}
                          onMouseOver={(event) => {
                            event.preventDefault();
                            setRemoveHoverColor(true);
                          }}
                          onMouseOut={(event) => {
                            event.preventDefault();
                            setRemoveHoverColor(false);
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove File
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Upload prompt state */}
                    <div className="space-y-4">
                      {/* Upload icon */}
                      <div className="flex justify-center">
                        <AiOutlineCloudUpload 
                          className={`
                            w-16 h-16 transition-colors duration-200
                            ${zoneHover ? 'text-blue-500' : 'text-gray-400'}
                          `} 
                        />
                      </div>
                      
                      {/* Upload text */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Drop CSV file here
                        </h3>
                        <p className="text-sm text-gray-500">
                          or <span className="text-blue-600 font-medium">click to browse</span> your files
                        </p>
                        <p className="text-xs text-gray-400">
                          Supports CSV files up to 10MB
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </CSVReader>


        {/* Grid Visualization Section */}
        {validatedData && (
          <OreGridVisualization 
            csvData={validatedData} 
            onGridProcessed={(gridData) => {
              console.log('Grid processed in CsvParse:', gridData);
            }}
          />
        )}
      </div>
    )
}

export default CsvParse