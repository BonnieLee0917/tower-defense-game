import { MapData } from '../maps/map1';

export class PathManager {
  private waypoints: { x: number; y: number }[];

  constructor(mapData: MapData) {
    this.waypoints = mapData.waypoints;
  }

  getWaypoints() { return this.waypoints; }

  /** Get position and angle at a given distance along the path */
  getPositionAt(distance: number): { x: number; y: number; angle: number } | null {
    let remaining = distance;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= segLen) {
        const t = remaining / segLen;
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          angle: Math.atan2(b.y - a.y, b.x - a.x),
        };
      }
      remaining -= segLen;
    }
    return null; // reached end
  }

  /** Flying path: straight line from start to end */
  getFlyingPath(): { x: number; y: number }[] {
    const wp = this.waypoints;
    return [wp[0], wp[wp.length - 1]];
  }

  /** Get position along a custom path at given distance */
  getPositionAtOnPath(distance: number, path: { x: number; y: number }[]): { x: number; y: number; angle: number } | null {
    let remaining = distance;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= segLen) {
        const t = remaining / segLen;
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          angle: Math.atan2(b.y - a.y, b.x - a.x),
        };
      }
      remaining -= segLen;
    }
    return null;
  }

  getTotalLength(): number {
    let total = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return total;
  }
}
