import React from 'react'

const CsvFileValidation = (file) => {
      // Check file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return { isValid: false, error: 'Please upload a CSV file only.' };
      }

      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return { isValid: false, error: `File size (${formatFileSize(file.size)}) exceeds the 10MB limit.` };
      }

      // Check if file is empty
      if (file.size === 0) {
        return { isValid: false, error: 'The uploaded file is empty.' };
      }

      return { isValid: true };
    };
export default CsvFileValidation