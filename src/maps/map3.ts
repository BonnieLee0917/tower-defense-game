// Map 3: "Fortress Approach" — complex zigzag with longer path
import { MapData } from './map1';

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
      tiles.add(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`);
    }
  }
  return Array.from(tiles).map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });
}

// Fortress approach: long winding path with many turns
const waypoints = [
  { x: 0, y: 160 },
  { x: 320, y: 160 },
  { x: 320, y: 544 },
  { x: 640, y: 544 },
  { x: 640, y: 160 },
  { x: 960, y: 160 },
  { x: 960, y: 416 },
  { x: 1120, y: 416 },
  { x: 1120, y: 288 },
  { x: 1280, y: 288 },
];

export const MAP3_DATA: MapData = {
  waypoints,
  buildSpots: [
    // Densely placed along the winding path
    { x: 160, y: 88 },
    { x: 160, y: 288 },
    { x: 248, y: 352 },
    { x: 392, y: 352 },
    { x: 392, y: 616 },
    { x: 480, y: 416 },
    { x: 568, y: 288 },
    { x: 712, y: 232 },
    { x: 712, y: 480 },
    { x: 800, y: 88 },
    { x: 888, y: 288 },
    { x: 1032, y: 288 },
    { x: 1048, y: 488 },
    { x: 1192, y: 352 },
  ],
  cols: 20,
  rows: 11,
  pathTiles: generatePathTiles(waypoints),
};
