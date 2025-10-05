const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex || hex.length < 4) return null;
  let normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalizedHex.length === 3) {
      normalizedHex = normalizedHex.split('').map(char => char + char).join('');
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const getContrastingTextColor = (hexColor: string): string => {
  // Defaults to a light text color suitable for dark themes
  const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#f9fafb';
  const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() || '#030712';
  
  if (!hexColor) return defaultColor;
  
  const rgb = hexToRgb(hexColor);
  if (!rgb) return defaultColor;
  
  // WCAG luminance formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Use dark text on light backgrounds, and light text on dark backgrounds
  return luminance > 0.5 ? darkColor : defaultColor;
};
