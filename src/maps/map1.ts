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
    // KR-style: 72px from path center, corners prioritized, evenly distributed
    { x: 96, y: 152 },   // above first horizontal
    { x: 120, y: 320 },  // left of first vertical drop
    { x: 264, y: 296 },  // inside first corner turn
    { x: 264, y: 488 },  // below-right of second corner
    { x: 376, y: 288 },  // left of second vertical up
    { x: 520, y: 232 },  // right-below third corner
    { x: 576, y: 88 },   // above middle horizontal
    { x: 632, y: 232 },  // left-below fourth corner
    { x: 776, y: 408 },  // right-above fifth corner
    { x: 888, y: 384 },  // left of last vertical up
    { x: 1032, y: 360 }, // right-below sixth corner
    { x: 1120, y: 216 }, // above last horizontal
  ],
  cols: 20, // 1280/64
  rows: 11, // 704/64 (leave top 16px for HUD rendered on top)
  pathTiles: generatePathTiles(waypoints),
};
