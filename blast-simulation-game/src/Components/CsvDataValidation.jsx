const CsvDataValidation = (results) => {
      console.log('Starting CSV validation...');
      const { data, errors } = results;

      // Check for parsing errors
      if (errors && errors.length > 0) {
        console.log('Parsing errors found:', errors);
        const errorMsg = errors[0].message || 'Invalid CSV format detected.';
        return { isValid: false, error: `CSV parsing error: ${errorMsg}` };
      }

      // Check if data exists and has content
      if (!data || data.length === 0) {
        console.log('No data found');
        return { isValid: false, error: 'The CSV file appears to be empty or invalid.' };
      }

      console.log('Raw CSV data:', data);

      // Get headers (assuming first row contains headers)
      const headers = data[0];
      if (!headers || headers.length === 0) {
        console.log('No headers found');
        return { isValid: false, error: 'No headers found in the CSV file.' };
      }

      console.log('Original headers:', headers);

      // Normalize headers (trim whitespace and convert to lowercase for comparison)
      const normalizedHeaders = headers.map(h => {
        const normalized = h?.toString().trim().toLowerCase();
        console.log(`Header "${h}" normalized to "${normalized}"`);
        return normalized;
      });

      console.log('Normalized headers:', normalizedHeaders);
      
      // Check for required columns
      const requiredColumns = ['x', 'y', 'ore_type', 'density', 'hardness', 'fragmentation_index'];
      const missingColumns = requiredColumns.filter(col => {
        const isPresent = normalizedHeaders.includes(col.toLowerCase());
        console.log(`Checking for column "${col}": ${isPresent ? 'FOUND' : 'MISSING'}`);
        return !isPresent;
      });

      if (missingColumns.length > 0) {
        console.log('Missing columns detected:', missingColumns);
        return { 
          isValid: false, 
          error: `Missing required columns: ${missingColumns.join(', ')}.` 
        };
      }

      // Get column indices
      const xIndex = normalizedHeaders.indexOf('x');
      const yIndex = normalizedHeaders.indexOf('y');
      const oreTypeIndex = normalizedHeaders.indexOf('ore_type');
      const densityIndex = normalizedHeaders.indexOf('density');
      const hardnessIndex = normalizedHeaders.indexOf('hardness');
      const fragmentationIndex = normalizedHeaders.indexOf('fragmentation_index');

      console.log(
        `Column indices - X: ${xIndex}, Y: ${yIndex}, ore_type: ${oreTypeIndex}, density: ${densityIndex}, \
        hardness: ${hardnessIndex}, fragmentation_index: ${fragmentationIndex}`
      );

      // Validate data rows (skip header row)
      const dataRows = data.slice(1);
      if (dataRows.length === 0) {
        console.log('No data rows found');
        return { isValid: false, error: 'No data rows found in the CSV file.' };
      }

      console.log(`Validating ${dataRows.length} data rows...`);

      // Check x and y columns for numeric values
      const invalidRows = [];
      dataRows.forEach((row, index) => {
        console.log(`Validating row ${index + 2}:`, row);
        
        if (!row || row.length === 0) {
          invalidRows.push(`Row ${index + 2}: Empty row detected`);
          return;
        }
        
        // Check if row has enough columns
        if (row.length <= Math.max(xIndex, yIndex, oreTypeIndex, densityIndex, hardnessIndex, fragmentationIndex)) {
          invalidRows.push(
            `Row ${index + 2}: Insufficient columns (expected at least \
            ${Math.max(xIndex, yIndex, oreTypeIndex, densityIndex, hardnessIndex, fragmentationIndex) + 1}, got ${row.length})`
          );
          return;
        }
        
        const xValue = row[xIndex];
        const yValue = row[yIndex];
        const oreTypeValue = row[oreTypeIndex];
        const densityValue = row[densityIndex];
        const hardnessValue = row[hardnessIndex];
        const fragmentationValue = row[fragmentationIndex];
        
        console.log(
          `Row ${index + 2} values - X: "${xValue}", Y: "${yValue}", ore_type: "${oreTypeValue}", Density: "${densityValue}", \
          Hardness: "${hardnessValue}", Fragmentation Index: "${fragmentationValue}"`
        );
        
        // Check if x value is a valid number
        if (xValue === undefined || xValue === null || xValue === '' || xValue.toString().trim() === '') {
          invalidRows.push(`Row ${index + 2}: X value is empty`);
        } else {
          const xNum = Number(xValue.toString().trim());
          if (isNaN(xNum)) {
            invalidRows.push(`Row ${index + 2}: X value "${xValue}" is not a valid number`);
          }
        }
        
        // Check if y value is a valid number
        if (yValue === undefined || yValue === null || yValue === '' || yValue.toString().trim() === '') {
          invalidRows.push(`Row ${index + 2}: Y value is empty`);
        } else {
          const yNum = Number(yValue.toString().trim());
          if (isNaN(yNum)) {
            invalidRows.push(`Row ${index + 2}: Y value "${yValue}" is not a valid number`);
          }
        }

        // Check if ore_type value is not empty
        if (oreTypeValue === undefined || oreTypeValue === null || oreTypeValue.toString().trim() === '') {
          invalidRows.push(`Row ${index + 2}: ore_type value is empty`);
        }

        // Check if density value is a valid number
        if (densityValue === undefined && densityValue === null && densityValue === '') {
          const densityNum = parseFloat(densityValue);
          if (isNaN(densityNum)) {
            invalidRows.push(`Row ${index + 2}: Density value "${densityValue}" is not a valid number`);
          }
        }

        // Check if hardness value is a valid number
        if (hardnessValue === undefined && hardnessValue === null && hardnessValue === '') {
          const hardnessNum = parseFloat(hardnessValue);
          if (isNaN(hardnessNum)) {
            invalidRows.push(`Row ${index + 2}: Hardness value "${hardnessValue}" is not a valid number`);
          }
        }

        // Check if fragmentation_index value is a valid number
        if (fragmentationValue === undefined && fragmentationValue === null && fragmentationValue === '') {
          const fragmentationNum = parseFloat(fragmentationValue);
          if (isNaN(fragmentationNum)) {
            invalidRows.push(`Row ${index + 2}: Fragmentation Index value "${fragmentationValue}" is not a valid number`);
          }
        }

      });

      if (invalidRows.length > 0) {
        console.log('Validation errors found:', invalidRows);
        const errorMessage = invalidRows.length > 3 
          ? `${invalidRows.slice(0, 3).join('; ')} and ${invalidRows.length - 3} more errors.`
          : invalidRows.join('; ');
        
        return { 
          isValid: false, 
          error: `Data validation failed: ${errorMessage}` 
        };
      }

      console.log('CSV validation passed!');
      return { isValid: true, data: results };
    };

    export default CsvDataValidation;