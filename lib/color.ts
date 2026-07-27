export default function getColorsFromName(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palette = [
    [0, 35],
    [95, 180],
    [200, 260],
    [270, 340],
  ];

  const range = palette[Math.abs(hash) % palette.length];
  const hue = range[0] + (Math.abs(hash >> 8) % (range[1] - range[0]));

  return {
    dark: `hsl(${hue}, 70%, 24%)`,
    medium: `hsl(${hue}, 65%, 34%)`,
    light: `hsl(${hue}, 45%, 95%)`,
  };
}