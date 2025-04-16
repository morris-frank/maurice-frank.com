/**
 * Converts OKLCH color values to a hex string
 * @param {number} l - Lightness percentage (0-100)
 * @param {number} c - Chroma percentage (0-100)
 * @param {number} h - Hue (0-360)
 * @returns {string} Hex color string (e.g. "#ff0000")
 */
export function oklchToHex(l, c, h) {
  // Normalize percentages to required ranges
  const normalizedL = l / 100; // Convert 0-100 to 0-1
  const normalizedC = (c / 100) * 0.4; // Convert 0-100 to 0-0.4

  // Convert OKLCH to OKLAB
  const a = normalizedC * Math.cos((h * Math.PI) / 180);
  const b_oklab = normalizedC * Math.sin((h * Math.PI) / 180);

  // Convert OKLAB to XYZ
  const l_ = normalizedL + 0.3963377774 * a + 0.2158037573 * b_oklab;
  const m_ = normalizedL - 0.1055613458 * a - 0.0638541728 * b_oklab;
  const s_ = normalizedL - 0.0894841775 * a - 1.291485548 * b_oklab;

  const l_xyz = l_ ** 3;
  const m_xyz = m_ ** 3;
  const s_xyz = s_ ** 3;

  const x = 1.2270138511 * l_xyz - 0.5577999807 * m_xyz + 0.281256149 * s_xyz;
  const y = -0.0405801784 * l_xyz + 1.1122568696 * m_xyz - 0.0716766787 * s_xyz;
  const z = -0.0763812845 * l_xyz - 0.4214819784 * m_xyz + 1.5861632204 * s_xyz;

  // Convert XYZ to RGB
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const b_rgb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  // Convert RGB to hex
  const toHex = (n) => {
    const hex = Math.round(Math.max(0, Math.min(255, n * 255))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b_rgb)}`;
}
