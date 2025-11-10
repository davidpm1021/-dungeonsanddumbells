/**
 * Case Transformation Utilities
 *
 * Converts between snake_case (database) and camelCase (API/JavaScript)
 * as per the casing policy in CLAUDE.md
 */

/**
 * Convert a snake_case string to camelCase
 * @param {string} str - The snake_case string
 * @returns {string} The camelCase string
 */
const toCamelCase = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert a camelCase string to snake_case
 * @param {string} str - The camelCase string
 * @returns {string} The snake_case string
 */
const toSnakeCase = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Recursively transform all keys in an object from snake_case to camelCase
 * @param {any} obj - The object, array, or primitive to transform
 * @returns {any} The transformed object with camelCase keys
 */
const transformKeysToCamel = (obj) => {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeysToCamel(item));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle objects
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = toCamelCase(key);
      acc[camelKey] = transformKeysToCamel(obj[key]);
      return acc;
    }, {});
  }

  // Handle primitives
  return obj;
};

/**
 * Recursively transform all keys in an object from camelCase to snake_case
 * @param {any} obj - The object, array, or primitive to transform
 * @returns {any} The transformed object with snake_case keys
 */
const transformKeysToSnake = (obj) => {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeysToSnake(item));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle objects
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = toSnakeCase(key);
      acc[snakeKey] = transformKeysToSnake(obj[key]);
      return acc;
    }, {});
  }

  // Handle primitives
  return obj;
};

module.exports = {
  toCamelCase,
  toSnakeCase,
  transformKeysToCamel,
  transformKeysToSnake
};
