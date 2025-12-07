//  HELPER FUNCTIONS

/**
 * Check if CSV parsing produced any errors
 */
const checkParsingErrors = (errors) => {
  if (errors && errors.length > 0) {
    console.log("Parsing errors found:", errors);
    const errorMsg = errors[0].message || "Invalid CSV format detected.";
    return { isValid: false, error: `CSV parsing error: ${errorMsg}` };
  }
  return null;
};

/**
 * Validate that data exists and is not empty
 */
const checkDataExists = (data) => {
  if (!data || data.length === 0) {
    console.log("No data found");
    return {
      isValid: false,
      error: "The CSV file appears to be empty or invalid.",
    };
  }
  return null;
};

/**
 * Extract and normalize headers from CSV data
 */
const extractHeaders = (data) => {
  const headers = data[0];
  if (!headers || headers.length === 0) {
    console.log("No headers found");
    return { isValid: false, error: "No headers found in the CSV file." };
  }

  console.log("Original headers:", headers);

  const normalizedHeaders = headers.map((h) => {
    const normalized = h?.toString().trim().toLowerCase();
    console.log(`Header "${h}" normalized to "${normalized}"`);
    return normalized;
  });

  console.log("Normalized headers:", normalizedHeaders);
  return { normalizedHeaders };
};

/**
 * Check if all required columns are present
 */
const checkRequiredColumns = (normalizedHeaders) => {
  const requiredColumns = [
    "x",
    "y",
    "ore_type",
    "density",
    "hardness",
    "fragmentation_index",
  ];

  const missingColumns = requiredColumns.filter((col) => {
    const isPresent = normalizedHeaders.includes(col.toLowerCase());
    console.log(
      `Checking for column "${col}": ${isPresent ? "FOUND" : "MISSING"}`
    );
    return !isPresent;
  });

  if (missingColumns.length > 0) {
    console.log("Missing columns detected:", missingColumns);
    return {
      isValid: false,
      error: `Missing required columns: ${missingColumns.join(", ")}.`,
    };
  }
  return null;
};

/**
 * Get column indices for all required fields
 */
const getColumnIndices = (normalizedHeaders) => {
  const indices = {
    xIndex: normalizedHeaders.indexOf("x"),
    yIndex: normalizedHeaders.indexOf("y"),
    oreTypeIndex: normalizedHeaders.indexOf("ore_type"),
    densityIndex: normalizedHeaders.indexOf("density"),
    hardnessIndex: normalizedHeaders.indexOf("hardness"),
    fragmentationIndex: normalizedHeaders.indexOf("fragmentation_index"),
  };

  console.log(
    `Column indices - X: ${indices.xIndex}, Y: ${indices.yIndex}, ore_type: ${indices.oreTypeIndex}, ` +
      `density: ${indices.densityIndex}, hardness: ${indices.hardnessIndex}, fragmentation_index: ${indices.fragmentationIndex}`
  );

  return indices;
};

/**
 * Check if a value is empty (undefined, null, or empty string)
 */
const isEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value.toString().trim() === ""
  );
};

/**
 * Validate a numeric field and return error if invalid
 */
const validateNumericField = (value, fieldName, rowNum) => {
  if (isEmpty(value)) {
    return `Row ${rowNum}: ${fieldName} value is empty`;
  }

  const numValue = Number(value.toString().trim());
  if (isNaN(numValue)) {
    return `Row ${rowNum}: ${fieldName} value "${value}" is not a valid number`;
  }

  return null;
};

/**
 * Validate an optional numeric field (only checks if value is present)
 */
// const validateOptionalNumericField = (value, fieldName, rowNum) => {
//   if (isEmpty(value)) {
//     return null; // Optional field can be empty
//   }

//   const numValue = parseFloat(value);
//   if (isNaN(numValue)) {
//     return `Row ${rowNum}: ${fieldName} value "${value}" is not a valid number`;
//   }

//   return null;
// };

/**
 * Validate a single data row
 */
const validateDataRow = (row, index, columnIndices) => {
  const rowNum = index + 2; // +2 because row 1 is headers
  const errors = [];

  console.log(`Validating row ${rowNum}:`, row);

  // Check if row is empty
  if (!row || row.length === 0) {
    return [`Row ${rowNum}: Empty row detected`];
  }

  // Check if row has enough columns
  const maxIndex = Math.max(
    columnIndices.xIndex,
    columnIndices.yIndex,
    columnIndices.oreTypeIndex,
    columnIndices.densityIndex,
    columnIndices.hardnessIndex,
    columnIndices.fragmentationIndex
  );

  if (row.length <= maxIndex) {
    return [
      `Row ${rowNum}: Insufficient columns (expected at least ${
        maxIndex + 1
      }, got ${row.length})`,
    ];
  }

  // Extract values
  const values = {
    x: row[columnIndices.xIndex],
    y: row[columnIndices.yIndex],
    oreType: row[columnIndices.oreTypeIndex],
    density: row[columnIndices.densityIndex],
    hardness: row[columnIndices.hardnessIndex],
    fragmentation: row[columnIndices.fragmentationIndex],
  };

  console.log(
    `Row ${rowNum} values - X: "${values.x}", Y: "${values.y}", ore_type: "${values.oreType}", ` +
      `Density: "${values.density}", Hardness: "${values.hardness}", Fragmentation Index: "${values.fragmentation}"`
  );

  // Validate required numeric fields
  const xError = validateNumericField(values.x, "X", rowNum);
  if (xError) errors.push(xError);

  const yError = validateNumericField(values.y, "Y", rowNum);
  if (yError) errors.push(yError);

  // Validate ore_type (required, non-empty string)
  if (isEmpty(values.oreType)) {
    errors.push(`Row ${rowNum}: ore_type value is empty`);
  }

  // Validate optional numeric fields
  const densityError = validateNumericField(values.density, "Density", rowNum);
  if (densityError) errors.push(densityError);

  const hardnessError = validateNumericField(
    values.hardness,
    "Hardness",
    rowNum
  );
  if (hardnessError) errors.push(hardnessError);

  const fragmentationError = validateNumericField(
    values.fragmentation,
    "Fragmentation Index",
    rowNum
  );
  if (fragmentationError) errors.push(fragmentationError);

  // Range validation for material properties (only if they're valid numbers)
  if (!densityError) {
    const density = Number(values.density);
    if (density < 0.001 || density > 25) {
      errors.push(
        `Row ${rowNum}: Density "${density}" must be between 0.5 and 20 g/cm³`
      );
    }
  }

  if (!hardnessError) {
    const hardness = Number(values.hardness);
    if (hardness < 0 || hardness > 1) {
      errors.push(
        `Row ${rowNum}: Hardness "${hardness}" must be between 0.0 and 1.0`
      );
    }
  }

  if (!fragmentationError) {
    const fragmentation = Number(values.fragmentation);
    if (fragmentation < 0 || fragmentation > 1) {
      errors.push(
        `Row ${rowNum}: Fragmentation index "${fragmentation}" must be between 0.0 and 1.0`
      );
    }
  }
  return errors;
};

/**
 * Validate all data rows
 */
const validateDataRows = (data, columnIndices) => {
  const dataRows = data.slice(1); // Skip header row

  if (dataRows.length === 0) {
    console.log("No data rows found");
    return { isValid: false, error: "No data rows found in the CSV file." };
  }

  console.log(`Validating ${dataRows.length} data rows...`);

  const allErrors = [];
  dataRows.forEach((row, index) => {
    const rowErrors = validateDataRow(row, index, columnIndices);
    allErrors.push(...rowErrors);
  });

  if (allErrors.length > 0) {
    console.log("Validation errors found:", allErrors);
    const errorMessage =
      allErrors.length > 3
        ? `${allErrors.slice(0, 3).join("; ")} and ${
            allErrors.length - 3
          } more errors.`
        : allErrors.join("; ");

    return {
      isValid: false,
      error: `Data validation failed: ${errorMessage}`,
    };
  }

  return null;
};

//  MAIN VALIDATION FUNCTION

/**
 * Validates CSV data structure and content
 * @param {Object} results - Papa Parse results object with data and errors
 * @returns {Object} - { isValid: boolean, error?: string, data?: Object }
 */
const csvDataValidation = (results) => {
  console.log("Starting CSV validation...");
  const { data, errors } = results;

  // Check for parsing errors
  const parsingError = checkParsingErrors(errors);
  if (parsingError) return parsingError;

  // Check if data exists
  const dataExistsError = checkDataExists(data);
  if (dataExistsError) return dataExistsError;

  console.log("Raw CSV data:", data);

  // Extract and normalize headers
  const headerResult = extractHeaders(data);
  if (headerResult.isValid === false) return headerResult;
  const { normalizedHeaders } = headerResult;

  // Check required columns
  const columnsError = checkRequiredColumns(normalizedHeaders);
  if (columnsError) return columnsError;

  // Get column indices
  const columnIndices = getColumnIndices(normalizedHeaders);

  //Validate data rows
  const rowsError = validateDataRows(data, columnIndices);
  if (rowsError) return rowsError;

  console.log("CSV validation passed!");
  return { isValid: true, data: results };
};

export default csvDataValidation;
