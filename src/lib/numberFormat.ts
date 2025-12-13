/**
 * Formats a number according to the Indian numbering system
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with Indian comma separators
 */
export const formatIndianNumber = (num: number, decimals: number = 2): string => {
  if (isNaN(num)) return '0.00';
  
  const fixed = num.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');
  
  // Indian number system: x,xx,xxx
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  const formatted = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return decimalPart ? `${formatted}.${decimalPart}` : formatted;
};

/**
 * Formats currency in Indian Rupees
 * @param num - The number to format
 * @param includeSymbol - Whether to include ₹ symbol (default: true)
 * @returns Formatted currency string
 */
export const formatIndianCurrency = (num: number, includeSymbol: boolean = true): string => {
  const formatted = formatIndianNumber(num, 2);
  return includeSymbol ? `₹${formatted}` : formatted;
};
