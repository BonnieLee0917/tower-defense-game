// Map data: waypoints define enemy path, buildSpots define tower placement locations

export interface MapData {
  waypoints: { x: number; y: number }[];
  buildSpots: { x: number; y: number }[];
  // Grid dimensions for rendering
  cols: number;
  rows: number;
  // Tiles that are "path" (for rendering brown)
  pathTiles: { col: number; row: number }[];
}

// Helper: generate path tiles from waypoints (rasterize the path on the grid)
function generatePathTiles(waypoints: { x: number; y: number }[]): { col: number; row: number }[] {
  const tiles = new Set<string>();
  const TILE = 64;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = waypoints[i].x, ay = waypoints[i].y;
    const bx = waypoints[i + 1].x, by = waypoints[i + 1].y;
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.ceil(dist / 16);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      tiles.add(`${col},${row}`);
    }
  }
  return Array.from(tiles).map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });
}

const waypoints = [
  { x: 0, y: 224 },
  { x: 192, y: 224 },
  { x: 192, y: 416 },
  { x: 448, y: 416 },
  { x: 448, y: 160 },
  { x: 704, y: 160 },
  { x: 704, y: 480 },
  { x: 960, y: 480 },
  { x: 960, y: 288 },
  { x: 1280, y: 288 },
];

export const MAP_DATA: MapData = {
  waypoints,
  buildSpots: [
    // Left section
    { x: 96, y: 96 },    // top-left, above first horizontal path
    { x: 96, y: 480 },   // below first vertical drop
    { x: 320, y: 288 },  // between first zigzag arms
    // Middle-left section
    { x: 320, y: 544 },  // below second horizontal path
    { x: 544, y: 352 },  // between vertical segments
    { x: 544, y: 544 },  // below middle area
    // Middle-right section
    { x: 832, y: 96 },   // top, away from path
    { x: 832, y: 288 },  // middle, between paths
    { x: 832, y: 608 },  // bottom area, clear of path
    // Right section
    { x: 1056, y: 160 }, // above right path
    { x: 1056, y: 416 }, // below right path
    { x: 1184, y: 160 }, // near exit, top
  ],
  cols: 20, // 1280/64
  rows: 11, // 704/64 (leave top 16px for HUD rendered on top)
  pathTiles: generatePathTiles(waypoints),
};
