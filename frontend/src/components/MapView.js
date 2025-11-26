import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const styles = {
  container: {
    position: "relative",
    height: "calc(100vh - 80px)", // leave space for navbar
    width: "100%",
  },
  map: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
  },
  overlay: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "rgba(255,255,255,0.95)",
    color: "#000",
    padding: "8px 12px",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 13,
    zIndex: 1000,
  },
  spinnerOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.6)",
    zIndex: 1200,
  },
};

function Spinner() {
  return (
    <svg width="48" height="48" viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#007bff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default function MapView({ destination }) {
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const indoorFloorRef = useRef(null);
  const indoorGraphRef = useRef(null);
  const indoorRouteLayerRef = useRef(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [localDestination, setLocalDestination] = useState(null); // {lat,lng,name}
  const [startLatLng, setStartLatLng] = useState(null); // L.LatLng or null
  const [selectingStart, setSelectingStart] = useState(false);
  const [routeTick, setRouteTick] = useState(0);
  const SHOW_VERTEX_MARKERS = false;
  // Runtime toggles for noisy overlays (default: hidden)
  const [showGeojsonPaths, setShowGeojsonPaths] = useState(false);
  const [showIndoorGraphMarkers, setShowIndoorGraphMarkers] = useState(false);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const lastKnownPositionRef = useRef(null);
  const startManualRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const pendingUpdateTimeoutRef = useRef(null);
  const tileLayerRef = useRef({});
  const pathGraphRef = useRef(null); // graph built from campus path LineStrings
  const [directRoute, setDirectRoute] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite');

  // Tile providers map — satellite (Esri) and street (OSM)
  const tileProviders = {
    satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community", maxZoom: 19 },
    street: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", maxZoom: 19 },
  };

  const createTileLayer = (key) => {
    const p = tileProviders[key] || tileProviders.street;
    return L.tileLayer(p.url, { attribution: p.attribution, maxZoom: p.maxZoom || 20 });
  };

  // --- Helper utilities for indoor routing ---
  const lngLatDist = (a, b) => {
    // approximate distance in degrees (sufficient for small campus)
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  const pointInPolygon = (point, polygon) => {
    // Robust ray-casting point-in-polygon.
    // point: L.LatLng or [lat, lng]
    // polygon: array of [lng, lat]
    if (!point || !polygon || !polygon.length) return false;
    const x = (point.lng !== undefined) ? point.lng : (Array.isArray(point) ? point[1] : null);
    const y = (point.lat !== undefined) ? point.lat : (Array.isArray(point) ? point[0] : null);
    if (x === null || y === null) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const buildAdj = (graph) => {
    const adj = {};
    if (!graph) return adj;
    graph.nodes.forEach(n => { adj[n.id] = []; });
    graph.edges.forEach(e => {
      if (adj[e.from]) adj[e.from].push({ to: e.to, w: e.weight });
      if (adj[e.to]) adj[e.to].push({ to: e.from, w: e.weight });
    });
    return adj;
  };

  const nearestNodeToPoint = (graph, pointLatLng) => {
    if (!graph) return null;
    const p = [pointLatLng.lng, pointLatLng.lat];
    let best = null, bestD = Infinity;
    graph.nodes.forEach(n => {
      const d = lngLatDist(n.coord, p);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  };

  const buildPathGraph = (geojson) => {
    if (!geojson || !geojson.features) return null;
    const nodes = [];
    const edges = [];
    const coordKey = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const idxByKey = {};
    let idx = 0;
    const addVertex = (c) => {
      const k = coordKey(c);
      if (idxByKey[k] !== undefined) return idxByKey[k];
      const id = `p${idx++}`;
      nodes.push({ id, coord: [c[0], c[1]] });
      idxByKey[k] = id;
      return id;
    };

    const walkLine = (coords) => {
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i]; const b = coords[i+1];
        const idA = addVertex(a); const idB = addVertex(b);
        const w = lngLatDist(a, b);
        edges.push({ from: idA, to: idB, weight: w });
      }
    };

    geojson.features.forEach(f => {
      if (!f.geometry) return;
      if (f.geometry.type === 'LineString') {
        walkLine(f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiLineString') {
        f.geometry.coordinates.forEach(ls => walkLine(ls));
      }
    });

    // convert node ids already stored in idxByKey: map id strings back to node objects
    return { nodes, edges };
  };

  const buildVisibilityGraph = (polygon, extraCoords = []) => {
    // polygon: array of [lng,lat]
    // extraCoords: array of [lng,lat] to include (e.g., path graph nodes)
    if (!polygon || !polygon.length) return null;
    // Simple sampler: if polygon has many vertices, uniformly sample to maxPoints
    const simplifyCoords = (coords, maxPoints = 300) => {
      if (!coords || coords.length <= maxPoints) return coords.slice();
      const step = Math.ceil(coords.length / maxPoints);
      const out = [];
      for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
      // ensure last coordinate is included
      if (out.length && out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1]);
      return out;
    };

    const nodes = [];
    const edges = [];
    const coordKey = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const idByKey = {};
    let idx = 0;
    const add = (c) => {
      const k = coordKey(c);
      if (idByKey[k]) return idByKey[k];
      const id = `v${idx++}`;
      nodes.push({ id, coord: [c[0], c[1]] });
      idByKey[k] = id;
      return id;
    };

    // add polygon vertices (sample if very large)
    const polyVerts = simplifyCoords(polygon, 300);
    for (const v of polyVerts) add(v);
    // add extra coords (path graph nodes etc.)
    for (const c of extraCoords) add(c);

    // link visible pairs (naive O(n^2) check; polygon small for campus)
    const allNodes = nodes.slice();
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const a = allNodes[i].coord; const b = allNodes[j].coord;
        const latlngA = L.latLng(a[1], a[0]);
        const latlngB = L.latLng(b[1], b[0]);
        if (segmentFullyInside(latlngA, latlngB, polygon)) {
          const w = lngLatDist(a, b);
          edges.push({ from: allNodes[i].id, to: allNodes[j].id, weight: w });
        }
      }
    }

    return { nodes, edges };
  };

  const aStar = (graph, startId, goalId) => {
    if (!graph) return null;
    const nodesById = {};
    graph.nodes.forEach(n => nodesById[n.id] = n);
    const adj = buildAdj(graph);

    const h = (id) => {
      const a = nodesById[id].coord; // [lng,lat]
      const b = nodesById[goalId].coord;
      return lngLatDist(a, b);
    };

    const open = new Set([startId]);
    const cameFrom = {};
    const gScore = {}; const fScore = {};
    graph.nodes.forEach(n => { gScore[n.id] = Infinity; fScore[n.id] = Infinity; });
    gScore[startId] = 0; fScore[startId] = h(startId);

    while (open.size) {
      // pick node in open with lowest fScore
      let current = null; let bestF = Infinity;
      open.forEach(id => { if (fScore[id] < bestF) { bestF = fScore[id]; current = id; } });
      if (current === goalId) {
        // reconstruct
        const path = [];
        let cur = current;
        while (cur) { path.unshift(cur); cur = cameFrom[cur]; }
        return path;
      }

      open.delete(current);

      const neighbors = adj[current] || [];
      for (const nb of neighbors) {
        const tentative = gScore[current] + (nb.w || 1);
        if (tentative < (gScore[nb.to] ?? Infinity)) {
          cameFrom[nb.to] = current;
          gScore[nb.to] = tentative;
          fScore[nb.to] = tentative + h(nb.to);
          if (!open.has(nb.to)) open.add(nb.to);
        }
      }
    }
    return null; // no path
  };

  const segmentFullyInside = (aLatLng, bLatLng, polygon, steps = 20) => {
    if (!polygon) return false;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = aLatLng.lat + (bLatLng.lat - aLatLng.lat) * t;
      const lng = aLatLng.lng + (bLatLng.lng - aLatLng.lng) * t;
      if (!pointInPolygon(L.latLng(lat, lng), polygon)) return false;
    }
    return true;
  };

  const polygonCentroid = (polygon) => {
    if (!polygon || !polygon.length) return null;
    let sumX = 0, sumY = 0;
    polygon.forEach(p => { sumX += p[0]; sumY += p[1]; });
    const cx = sumX / polygon.length; const cy = sumY / polygon.length; // cx=lng, cy=lat
    return L.latLng(cy, cx);
  };

  // compute distance in meters between two {lat,lng} objects using Haversine
  const latLngDistanceMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (v) => v * Math.PI / 180;
    const R = 6371000; // earth radius in meters
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  // Create a smooth curved polyline (quadratic Bezier) between two L.LatLngs.
  // curvature: scalar (0 = straight, ~0.1-0.4 gives a gentle curve)
  // steps: number of sample points along the curve
  const makeCurve = (aLatLng, bLatLng, opts = {}) => {
    const curvature = typeof opts.curvature === 'number' ? opts.curvature : 0.18;
    const steps = opts.steps || 64;
    const ax = aLatLng.lng, ay = aLatLng.lat;
    const bx = bLatLng.lng, by = bLatLng.lat;
    // midpoint
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    // vector from A to B
    const vx = bx - ax, vy = by - ay;
    // perpendicular vector
    let px = -vy, py = vx;
    const norm = Math.sqrt(px * px + py * py) + 1e-12;
    px /= norm; py /= norm;
    // offset magnitude proportional to distance and curvature
    const dist = Math.sqrt(vx * vx + vy * vy);
    const offset = dist * curvature;
    const cx = mx + px * offset; const cy = my + py * offset; // control point (lng, lat)

    const latlngs = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      // Quadratic Bezier: B(t) = (1-t)^2*A + 2(1-t)t*C + t^2*B
      const x = omt * omt * ax + 2 * omt * t * cx + t * t * bx;
      const y = omt * omt * ay + 2 * omt * t * cy + t * t * by;
      latlngs.push(L.latLng(y, x));
    }
    return latlngs;
  };

  // Choose curvature based on destination (name) and geometry so curves vary per location.
  const getCurveParams = (aLatLng, bLatLng, destName) => {
    // presets per location keyword (lowercase)
    const presets = {
      library: 0.08,
      cafe: 0.28,
      'admin block': 0.14,
      default: 0.18,
    };
    const key = (destName || '').toString().toLowerCase();
    // find preset by keyword match
    let preset = presets.default;
    Object.keys(presets).forEach(k => { if (k !== 'default' && key.includes(k)) preset = presets[k]; });

    // Determine sign (which side the curve should bulge) using center/cross product
    let sign = 1;
    try {
      if (mapRef.current) {
        const center = mapRef.current.getCenter(); // L.LatLng
        const ax = aLatLng.lng - center.lng; const ay = aLatLng.lat - center.lat;
        const bx = bLatLng.lng - aLatLng.lng; const by = bLatLng.lat - aLatLng.lat;
        const cross = ax * by - ay * bx;
        sign = cross >= 0 ? 1 : -1;
      }
    } catch (e) { }

    // scale curvature modestly with distance so long routes curve more
    const dx = aLatLng.lng - bLatLng.lng; const dy = aLatLng.lat - bLatLng.lat;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scale = Math.min(Math.max(dist * 2.0, 0.5), 2.5); // guard
    const curvature = preset * scale * sign;
    return { curvature, steps: Math.min(160, Math.max(24, Math.round(80 * scale))) };
  };

  const buildInstructions = ({ startInside, destInside, meters, minutes, destName }) => {
    const parts = [];
    if (startInside === false || destInside === false) {
      parts.push("One or both locations are outside the campus boundary. Follow campus exit signs and main roads to reach public transport or parking. Consider using a vehicle for long distances.");
    }
    if (typeof meters === 'number' && meters > 2000) {
      parts.push(`This route is ${(meters/1000).toFixed(2)} km (~${minutes} min). Consider taking a bike, shuttle, or other transport for comfort.`);
    } else if (typeof meters === 'number' && meters > 800) {
      parts.push(`This route is ${(meters/1000).toFixed(2)} km (~${minutes} min). It's a moderate walk.`);
    }
    if (parts.length === 0) return null;
    return parts.join(' ');
  };

  // The main initialization effect uses many internal helper functions
  // which are stable for this component instance. We intentionally
  // disable exhaustive-deps for this large init effect to avoid
  // re-running initialization on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Initialize map once
    mapRef.current = L.map("map", { zoomControl: true }).setView([12.9103, 74.8998], 17);

    // add initial tile layer according to `mapStyle`
    try {
      tileLayerRef.current = createTileLayer(mapStyle).addTo(mapRef.current);
      // basic tileerror handler: log (we keep swap-on-demand via UI)
      tileLayerRef.current.on && tileLayerRef.current.on('tileerror', () => console.warn('Tile load error'));
    } catch (e) {
      console.warn('Failed to create tile layer', e);
    }

    // Try to load local SJEC GeoJSON overlay (optional) and add markers for all positions
    // This will handle Point and MultiPoint features, and add markers for vertices of
    // LineString / Polygon geometries as a fallback so all positions are represented.
    let geoJsonLayerRef = { current: null };
    (async () => {
      try {
        const res = await fetch("/mapp.geojson");
        if (!res.ok) throw new Error("geojson missing");

        const data = await res.json();

        const defaultIcon = L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const markersGroup = L.featureGroup();

        // helper: create marker from [lon, lat] or {lat,lng}
        const makeMarker = (coord, props = {}) => {
          let lat, lng;
          if (Array.isArray(coord)) {
            // GeoJSON coord: [lon, lat]
            lng = coord[0];
            lat = coord[1];
          } else if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
            lat = coord.lat; lng = coord.lng;
          } else if (coord && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
            lat = coord[1]; lng = coord[0];
          }
          if (typeof lat === 'number' && typeof lng === 'number') {
            const m = L.marker([lat, lng], { icon: defaultIcon });
            if (props && props.popup) m.bindPopup(props.popup);
            markersGroup.addLayer(m);
          }
        };

        // recursive walker for nested coordinate arrays (LineString/Polygon etc.)
        const walkCoords = (coords, collectCb) => {
          if (!coords) return;
          if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            collectCb(coords);
            return;
          }
          for (const c of coords) walkCoords(c, collectCb);
        };

        // Add GeoJSON layer (draw geometries) and create markers for positions
        const geoLayer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            // create a marker for Point features
            const popup = feature.properties ? Object.entries(feature.properties).map(([k,v])=>`<b>${k}:</b> ${v}`).join('<br/>') : undefined;
            const m = L.marker(latlng, { icon: defaultIcon });
            if (popup) m.bindPopup(popup);
            // clicking a campus marker selects it as destination
            m.on('click', () => {
              try {
                setLocalDestination({ lat: latlng.lat, lng: latlng.lng, name: feature.properties && (feature.properties.areaName || feature.properties.name) || 'Destination' });
                setStatus(`Selected destination: ${feature.properties && (feature.properties.areaName || feature.properties.name) || 'Destination'}`);
              } catch (e) { }
            });
            markersGroup.addLayer(m);
            return m;
          },
          onEachFeature: (feature, layer) => {
            // bind a useful popup summarizing properties
            const props = feature.properties || {};
            const name = props.areaName || props.name || props.title || null;
            const popupHtml = name ? `<b>${name}</b>` : Object.keys(props).length ? Object.entries(props).map(([k,v])=>`<b>${k}:</b> ${v}`).join('<br/>') : null;
            if (popupHtml) layer.bindPopup(popupHtml);

            // for non-Point geometries, optionally add markers for vertex positions (disabled by default)
            if (SHOW_VERTEX_MARKERS) {
              const geom = feature.geometry;
              if (geom && geom.type && geom.coordinates) {
                if (geom.type === 'MultiPoint') {
                  geom.coordinates.forEach(c => makeMarker(c, { popup: popupHtml }));
                } else if (geom.type === 'LineString' || geom.type === 'MultiLineString' || geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                  walkCoords(geom.coordinates, (coord) => makeMarker(coord, { popup: popupHtml }));
                }
              }
            }
          },
          style: (feature) => ({ color: '#0077b6', weight: 2, opacity: 0.6 }),
        });
        // store geojson layer and add only if runtime flag enabled
        geoJsonLayerRef.current = geoLayer;
        if (showGeojsonPaths && mapRef.current) geoLayer.addTo(mapRef.current);

        // store markers group for cleanup (do not add to map until user enables paths)
        tileLayerRef.current.geoJsonMarkers = markersGroup;
        if (showGeojsonPaths && mapRef.current) markersGroup.addTo(mapRef.current);
        // build path graph from any LineString / MultiLineString features (campus paths)
        try {
          const graph = buildPathGraph(data);
          if (graph && graph.nodes && graph.nodes.length) {
            pathGraphRef.current = graph;
            console.log('Path graph built, nodes:', graph.nodes.length, 'edges:', graph.edges.length);
          }
        } catch (e) { console.warn('Failed to build path graph', e); }
        // --- load simple indoor demo data (library) if present ---
        try {
          const f = await fetch('/indoor/library_floor1.geojson');
          if (f.ok) {
            const indoor = await f.json();
            indoorFloorRef.current = indoor;
            // draw indoor polygon & features visibly
            const indoorLayer = L.geoJSON(indoor, {
              style: (ft) => ft.geometry && ft.geometry.type === 'Polygon' ? { color: '#ff6600', weight: 2, opacity: 0.45, fillOpacity: 0.05 } : { color: '#0077b6' },
              pointToLayer: (feature, latlng) => {
                if (feature.properties && feature.properties.type === 'room') return L.circleMarker(latlng, { radius: 6, fillColor: '#ffcc00', color: '#333', weight: 1, fillOpacity: 0.9 });
                return L.circleMarker(latlng, { radius: 5, fillColor: '#0077b6', color: '#fff', weight: 1, fillOpacity: 0.9 });
              }
            });
            tileLayerRef.current.indoorLayer = indoorLayer;
            if (showIndoorGraphMarkers && mapRef.current) { indoorLayer.addTo(mapRef.current); }
          }
        } catch (e) {
          console.log('No indoor geojson found', e);
        }

        try {
          const g = await fetch('/indoor/library_graph.json');
            if (g.ok) {
            indoorGraphRef.current = await g.json();
            // build graph-group (store for runtime toggling)
            const graphGroup = L.featureGroup();
            indoorGraphRef.current.nodes.forEach(n => {
              const lat = n.coord[1], lng = n.coord[0];
              const marker = L.circleMarker([lat, lng], { radius: 6, fillColor: '#00aa00', color: '#004400', weight: 1, fillOpacity: 0.9 }).bindPopup(`<b>${n.name}</b>`);
              marker.on('click', () => {
                setLocalDestination({ lat, lng, name: n.name });
                setStatus(`Selected indoor destination: ${n.name}`);
              });
              graphGroup.addLayer(marker);
            });
            tileLayerRef.current.indoorGraphGroup = graphGroup;
            if (showIndoorGraphMarkers && mapRef.current) { graphGroup.addTo(mapRef.current); tileLayerRef.current.indoorGraphMarkers = graphGroup; }
          }
        } catch (e) { console.log('No indoor graph found', e); }

        // load campus boundary and buildings for campus-constrained routing
        try {
          const cb = await fetch('/campus_boundary.geojson');
          if (cb.ok) {
            const campus = await cb.json();
            // do NOT add the campus boundary polygon to the map by default
            // (it produced a long purple outline in the view). Keep the
            // polygon coordinates for containment/routing checks only.
            const campusLayer = L.geoJSON(campus, { style: { color: '#8844aa', weight: 2, opacity: 0.6, fillOpacity: 0.02 } });
            tileLayerRef.current.campusLayer = campusLayer; // not added to map
            // store polygon coords for containment checks (array of [lng,lat])
            tileLayerRef.current.campusPolygon = campus.features && campus.features[0] && campus.features[0].geometry && campus.features[0].geometry.coordinates && campus.features[0].geometry.coordinates[0];
          }
        } catch (e) { console.log('No campus boundary found', e); }

        try {
          const b = await fetch('/buildings.geojson');
          if (b.ok) {
            const buildings = await b.json();
            // keep raw buildings geojson for proximity snapping to named buildings
            tileLayerRef.current.buildingsGeojson = buildings;
            const buildLayer = L.geoJSON(buildings, { style: { color: '#5555ff', weight: 2, opacity: 0.8, fillOpacity: 0.2 }, onEachFeature: (f, layer) => { if (f.properties && f.properties.name) layer.bindPopup(`<b>${f.properties.name}</b>`); } });
            tileLayerRef.current.buildingsLayer = buildLayer;
            if (showGeojsonPaths && mapRef.current) buildLayer.addTo(mapRef.current);
          }
        } catch (e) { console.log('No buildings file', e); }

      } catch (err) {
        console.log('GeoJSON load failed:', err);
      }
    })();

    // store ref for cleanup on unmount
    // attach to tileLayerRef scope by adding property
    tileLayerRef.current.geoJsonLayerRef = geoJsonLayerRef;


    return () => {
      // Clean up map and routing control
      try {
        // remove tile listeners first
        try {
          if (tileLayerRef.current) {
            tileLayerRef.current.off && tileLayerRef.current.off('tileerror');
          }
        } catch (err) {}

        if (routingControlRef.current) {
          try {
            // try to remove any attached routefound listeners safely
            if (routingControlRef.current._container && routingControlRef.current.off) {
              try { routingControlRef.current.off('routesfound'); } catch (e) {}
            }
            // only remove control via map when map exists and routing control is attached
            if (mapRef.current && routingControlRef.current._map) {
              try { mapRef.current.removeControl(routingControlRef.current); } catch (e) { console.warn('removeControl failed', e); }
            }
          } catch (e) {
            console.warn('Error while removing routing control', e);
          }
          routingControlRef.current = null;
        }
        // remove geojson layers/markers if present
        try {
          if (tileLayerRef.current && tileLayerRef.current.geoJsonLayerRef && tileLayerRef.current.geoJsonLayerRef.current) {
            try { mapRef.current.removeLayer(tileLayerRef.current.geoJsonLayerRef.current); } catch(e) {}
          }
        } catch (e) {}
        try {
          if (tileLayerRef.current && tileLayerRef.current.geoJsonMarkers) {
            try { mapRef.current.removeLayer(tileLayerRef.current.geoJsonMarkers); } catch(e) {}
          }
        } catch (e) {}
        try {
          if (indoorRouteLayerRef.current && mapRef.current) {
            try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e) {}
          }
        } catch(e) {}

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  // swap tile layer when mapStyle changes
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      if (tileLayerRef.current && mapRef.current && mapRef.current.hasLayer && mapRef.current.hasLayer(tileLayerRef.current)) {
        try { mapRef.current.removeLayer(tileLayerRef.current); } catch (e) { }
      }
    } catch (e) {}
    try {
      tileLayerRef.current = (typeof createTileLayer === 'function') ? createTileLayer(mapStyle) : null;
      if (tileLayerRef.current && mapRef.current) tileLayerRef.current.addTo(mapRef.current);
      if (tileLayerRef.current && tileLayerRef.current.on) tileLayerRef.current.on('tileerror', () => console.warn('Tile load error'));
    } catch (e) { console.warn('Tile layer switch failed', e); }
  }, [mapStyle]);

  // Runtime toggles: add/remove geojson path layer when the flag changes
  useEffect(() => {
    if (!mapRef.current) return;
    const gref = tileLayerRef.current && tileLayerRef.current.geoJsonLayerRef && tileLayerRef.current.geoJsonLayerRef.current;
    const markers = tileLayerRef.current && tileLayerRef.current.geoJsonMarkers;
    const builds = tileLayerRef.current && tileLayerRef.current.buildingsLayer;
    try {
      if (showGeojsonPaths) {
        if (gref && mapRef.current && !mapRef.current.hasLayer(gref)) gref.addTo(mapRef.current);
        if (markers && mapRef.current && !mapRef.current.hasLayer(markers)) markers.addTo(mapRef.current);
        if (builds && mapRef.current && !mapRef.current.hasLayer(builds)) builds.addTo(mapRef.current);
      } else {
        try { if (gref && mapRef.current && mapRef.current.hasLayer(gref)) mapRef.current.removeLayer(gref); } catch (e) {}
        try { if (markers && mapRef.current && mapRef.current.hasLayer(markers)) mapRef.current.removeLayer(markers); } catch (e) {}
        try { if (builds && mapRef.current && mapRef.current.hasLayer(builds)) mapRef.current.removeLayer(builds); } catch (e) {}
      }
    } catch (e) { }
  }, [showGeojsonPaths]);

  // Runtime toggles: add/remove indoor graph node markers
  useEffect(() => {
    if (!mapRef.current) return;
    const grp = tileLayerRef.current && tileLayerRef.current.indoorGraphGroup;
    if (!grp) return;
    try {
      if (showIndoorGraphMarkers) {
        grp.addTo(mapRef.current);
        tileLayerRef.current.indoorGraphMarkers = grp;
        // also add indoor polygon/features when showing indoor markers
        if (tileLayerRef.current && tileLayerRef.current.indoorLayer && !mapRef.current.hasLayer(tileLayerRef.current.indoorLayer)) {
          try { mapRef.current.addLayer(tileLayerRef.current.indoorLayer); } catch (e) {}
        }
      } else {
        if (tileLayerRef.current && tileLayerRef.current.indoorGraphMarkers && mapRef.current) {
          try { mapRef.current.removeLayer(tileLayerRef.current.indoorGraphMarkers); } catch (e) { }
          tileLayerRef.current.indoorGraphMarkers = null;
        }
        if (tileLayerRef.current && tileLayerRef.current.indoorLayer && mapRef.current && mapRef.current.hasLayer(tileLayerRef.current.indoorLayer)) {
          try { mapRef.current.removeLayer(tileLayerRef.current.indoorLayer); } catch (e) {}
        }
      }
    } catch (e) { }
  }, [showIndoorGraphMarkers]);

  // allow selecting a start location by clicking on the map when enabled
  useEffect(() => {
    if (!mapRef.current) return;
    if (!selectingStart) return;
    setStatus('Click on map to choose start location');
    const handler = (e) => {
      try {
        const latlng = e.latlng;
        setStartLatLng(latlng);
        startManualRef.current = true;
        if (startMarkerRef.current) {
          try { mapRef.current.removeLayer(startMarkerRef.current); } catch (e) {}
        }
        startMarkerRef.current = L.marker(latlng, { icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [30,30] }) }).addTo(mapRef.current).bindPopup('Start');
        setSelectingStart(false);
        setStatus('Start selected');
        // force route recalculation
        setRouteTick(t => t + 1);
      } catch (e) { console.error('start select error', e); }
    };
    mapRef.current.once('click', handler);
    return () => {
      try { mapRef.current.off('click', handler); } catch (e) {}
    };
  }, [selectingStart]);

  // HIGH-ACCURACY GPS ONLY — NO SNAPPING, NO FALLBACKS, NO CACHING
  useEffect(() => {
    if (!mapRef.current) return;

    const requestAccurateGPS = () => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            console.log("📡 Raw GPS:", latitude, longitude, "Accuracy:", accuracy);

            // Reject inaccurate readings and retry
            if (accuracy > 25) {
              console.warn("⚠ Low accuracy (" + accuracy + "m), retrying...");
              setTimeout(() => resolve(requestAccurateGPS()), 600);
              return;
            }

            resolve({ latitude, longitude });
          },
          (err) => {
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      });
    };

    (async () => {
      try {
        setStatus("Locating...");

        const { latitude, longitude } = await requestAccurateGPS();

        const here = L.latLng(latitude, longitude);

        // Save real location
        lastKnownPositionRef.current = { lat: latitude, lng: longitude };
        setStartLatLng(here);

        // Remove old start marker if any
        if (startMarkerRef.current) {
          try { mapRef.current.removeLayer(startMarkerRef.current); } catch {}
        }

        // Add fresh marker
        startMarkerRef.current = L.marker(here, {
          icon: L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            iconSize: [35, 35],
          }),
        })
          .addTo(mapRef.current)
          .bindPopup("You are here");

        setStatus("Accurate GPS location set");

      } catch (err) {
        console.error("GPS Error:", err);
        setStatus("Unable to get accurate location");
      }
    })();
  }, []);

  useEffect(() => {
    if ((!destination && !localDestination) || !mapRef.current) return;

    let cancelled = false;
    setLoading(true);
    setStatus("Getting current location...");

    const apiUrl = `${API_BASE}/api/locations`;

    const run = async () => {
      try {
        // determine start: prefer user-chosen startLatLng, otherwise use geolocation
        let userLatLng = null;
        if (startLatLng) {
          userLatLng = startLatLng;
        } else if (lastKnownPositionRef.current) {
          const p = lastKnownPositionRef.current;
          userLatLng = L.latLng(p.lat, p.lng);
        } else {
          // final fallback: request a one-off position
          try {
            const pos = await new Promise((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
            );
            if (cancelled) return;
            userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
          } catch (e) {
            // geolocation failed; inform user and abort routing
            setStatus('Unable to determine current location');
            setLoading(false);
            return;
          }
        }

        setStatus("Adding your marker...");
        // add or update start marker
        if (startMarkerRef.current && startLatLng) {
          // already placed by selection
        } else {
          if (startMarkerRef.current) {
            try { mapRef.current.removeLayer(startMarkerRef.current); } catch (e) {}
            startMarkerRef.current = null;
          }
          startMarkerRef.current = L.marker(userLatLng, {
            icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [35, 35] }),
          }).addTo(mapRef.current).bindPopup("You are here");
        }

        // determine destination: prefer localDestination (user clicked), otherwise fetch from server by prop `destination`
        let destLatLng = null; let destName = null;
        if (localDestination) {
          destLatLng = L.latLng(localDestination.lat, localDestination.lng);
          destName = localDestination.name;
        } else {
          setStatus("Fetching destination from server...");
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error(`fetch failed ${res.status}`);
          const locations = await res.json();
          if (cancelled) return;
          const dest = locations.find((l) => l.areaName && l.areaName.toLowerCase() === destination.toLowerCase());
          if (!dest) {
            setStatus("Destination not found");
            alert(`Destination "${destination}" not found in database!`);
            setLoading(false);
            return;
          }
          destLatLng = L.latLng(dest.lat, dest.lng);
          destName = dest.areaName || destination;
        }
        setStatus("Adding destination marker...");
        if (destMarkerRef.current && mapRef.current) {
          try { mapRef.current.removeLayer(destMarkerRef.current); } catch (e) {}
          destMarkerRef.current = null;
        }
        destMarkerRef.current = L.marker(destLatLng, {
          icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", iconSize: [35, 35] }),
        })
          .addTo(mapRef.current)
          .bindPopup(destName || (destination || (localDestination && localDestination.name)));

        // remove previous route if present
        if (routingControlRef.current && mapRef.current) {
          try { mapRef.current.removeControl(routingControlRef.current); } catch (e) { }
          routingControlRef.current = null;
        }
        if (indoorRouteLayerRef.current && mapRef.current) {
          try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch (e) { }
          indoorRouteLayerRef.current = null;
        }

        // Decide whether to run indoor routing (demo) or outdoor routing
        let didIndoor = false;
        try {
            const g = indoorGraphRef.current;
          if (g) {
              // match by node name or if user asked for 'library' route to entrance
              const destLower = (localDestination && localDestination.name ? localDestination.name : destination).toLowerCase();
              let indoorTarget = g.nodes.find(n => n.name && n.name.toLowerCase() === destLower) || null;
              if (!indoorTarget && destLower === 'library') {
                indoorTarget = g.nodes.find(n => n.name && n.name.toLowerCase().includes('entrance')) || null;
              }

            if (indoorTarget) {
              // check whether user is inside the indoor polygon (floor)
              const floorFeature = indoorFloorRef.current && indoorFloorRef.current.features && indoorFloorRef.current.features.find(f => f.properties && f.properties.type === 'floor');
              let userInside = false;
              if (floorFeature && floorFeature.geometry && floorFeature.geometry.coordinates && floorFeature.geometry.coordinates[0]) {
                // floorFeature.geometry.coordinates[0] is an array of [lng,lat]
                userInside = pointInPolygon(userLatLng, floorFeature.geometry.coordinates[0]);
              }

              console.log('Indoor routing check: userInside=', userInside, 'startNode candidates=', g.nodes.map(n=>n.name));

              if (userInside) {
                // compute nearest graph node to user and run a* to target
                const startNode = nearestNodeToPoint(g, userLatLng);
                if (startNode) {
                  const pathIds = aStar(g, startNode.id, indoorTarget.id);
                  if (pathIds && pathIds.length) {
                    // build latlng array
                    const nodesById = {};
                    g.nodes.forEach(n => nodesById[n.id] = n);
                    const latlngs = pathIds.map(id => {
                      const c = nodesById[id].coord; return [c[1], c[0]]; // [lat,lng]
                    });
                    try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
                    indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#ff6600', weight: 5, opacity: 0.9, dashArray: '8,6' }).addTo(mapRef.current);
                    mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40, 40] });
                    setStatus('Indoor route ready');
                    didIndoor = true;
                  }
                }
              }
            }
          }
        } catch (e) { console.log('Indoor routing check failed', e); }

        if (!didIndoor) {
          // if both start and destination are inside campus boundary, prefer campus-constrained routing
          try {
            const poly = tileLayerRef.current && tileLayerRef.current.campusPolygon;
            const startInside = poly && pointInPolygon(userLatLng, poly);
            const destInside = poly && pointInPolygon(destLatLng, poly);
            if (startInside && destInside) {
              // 1) Try routing along provided path graph (if available)
              let usedPath = false;
              if (pathGraphRef.current) {
                try {
                  const g = pathGraphRef.current;
                  const startNode = nearestNodeToPoint(g, userLatLng);
                  const endNode = nearestNodeToPoint(g, destLatLng);
                  if (startNode && endNode) {
                    const pathIds = aStar(g, startNode.id, endNode.id);
                    if (pathIds && pathIds.length) {
                      const nodesById = {};
                      g.nodes.forEach(n => nodesById[n.id] = n);
                      const latlngs = pathIds.map(id => { const c = nodesById[id].coord; return L.latLng(c[1], c[0]); });
                      let ok = true;
                      for (let i = 0; i < latlngs.length - 1; i++) {
                        if (!segmentFullyInside(latlngs[i], latlngs[i+1], poly)) { ok = false; break; }
                      }
                      if (ok) {
                        if (indoorRouteLayerRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e) {} }
                        try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
                        indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#007bff', weight: 5, opacity: 0.95 }).addTo(mapRef.current);
                        try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch(e){}
                        let meters = 0; for (let i = 0; i < latlngs.length - 1; i++) meters += mapRef.current.distance(latlngs[i], latlngs[i+1]);
                          const minutes = Math.round((meters/1.4)/60);
                          setRouteInfo({ distanceKm: (meters/1000).toFixed(2), minutes });
                          setInstructions(buildInstructions({ startInside, destInside, meters, minutes, destName: destName }));
                        setStatus('Routed along campus paths');
                        didIndoor = true; usedPath = true;
                      }
                    }
                  }
                } catch (e) { console.warn('Path-graph routing failed', e); }
              }

              // 2) If path graph didn't yield a path, try a visibility graph constructed from campus polygon (and path nodes if present)
              if (!usedPath) {
                try {
                  const extra = (pathGraphRef.current && pathGraphRef.current.nodes) ? pathGraphRef.current.nodes.map(n=>n.coord) : [];
                  const vis = buildVisibilityGraph(poly, extra.concat([[userLatLng.lng, userLatLng.lat],[destLatLng.lng, destLatLng.lat]]));
                  if (vis) {
                    // map start/dest to nearest vis nodes
                    const startNode = nearestNodeToPoint(vis, userLatLng);
                    const endNode = nearestNodeToPoint(vis, destLatLng);
                    if (startNode && endNode) {
                      const pathIds = aStar(vis, startNode.id, endNode.id);
                      if (pathIds && pathIds.length) {
                        const nodesById = {};
                        vis.nodes.forEach(n => nodesById[n.id] = n);
                        const latlngs = pathIds.map(id => { const c = nodesById[id].coord; return L.latLng(c[1], c[0]); });
                        let ok = true;
                        for (let i = 0; i < latlngs.length - 1; i++) {
                          if (!segmentFullyInside(latlngs[i], latlngs[i+1], poly)) { ok = false; break; }
                        }
                        if (ok) {
                          if (indoorRouteLayerRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e) {} }
                          try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
                          indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#007bff', weight: 5, opacity: 0.95 }).addTo(mapRef.current);
                          try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch(e){}
                          let meters = 0; for (let i = 0; i < latlngs.length - 1; i++) meters += mapRef.current.distance(latlngs[i], latlngs[i+1]);
                            const minutes = Math.round((meters/1.4)/60);
                            setRouteInfo({ distanceKm: (meters/1000).toFixed(2), minutes });
                            setInstructions(buildInstructions({ startInside, destInside, meters, minutes, destName: (localDestination && localDestination.name) || destination }));
                            setStatus('Routed via campus visibility graph');
                          didIndoor = true; usedPath = true;
                        }
                      }
                    }
                  }
                } catch (e) { console.warn('Visibility-graph routing failed', e); }
              }

              // 3) If no path available, fall back to shortest straight segment inside campus or centroid heuristic
              if (!usedPath) {
                if (segmentFullyInside(userLatLng, destLatLng, poly)) {
                  if (indoorRouteLayerRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e) {} }
                  try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
                  // draw a curved line for better visuals; curvature chosen per-destination
                  const dstName = (localDestination && localDestination.name) || destination || '';
                  const cp = getCurveParams(userLatLng, destLatLng, dstName);
                  const curve = makeCurve(userLatLng, destLatLng, { curvature: cp.curvature, steps: cp.steps });
                  indoorRouteLayerRef.current = L.polyline(curve, { color: '#007bff', weight: 4, opacity: 0.9 }).addTo(mapRef.current);
                  try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch(e){}
                  let meters = 0; for (let i = 0; i < curve.length - 1; i++) meters += mapRef.current.distance(curve[i], curve[i+1]);
                  const minutes = Math.round((meters/1.4)/60);
                  setRouteInfo({ distanceKm: (meters/1000).toFixed(2), minutes });
                  setInstructions(buildInstructions({ startInside, destInside, meters, minutes, destName: (localDestination && localDestination.name) || destination }));
                  setStatus('Campus-constrained curved straight route');
                } else {
                  const centroid = polygonCentroid(poly);
                  if (centroid) {
                    // draw two gentle curves: user->centroid and centroid->dest
                    const dstName = (localDestination && localDestination.name) || destination || '';
                    const cp1 = getCurveParams(userLatLng, centroid, dstName);
                    const cp2 = getCurveParams(centroid, destLatLng, dstName);
                    const c1 = makeCurve(userLatLng, centroid, { curvature: cp1.curvature, steps: Math.max(16, Math.round(cp1.steps/2)) });
                    const c2 = makeCurve(centroid, destLatLng, { curvature: cp2.curvature, steps: Math.max(16, Math.round(cp2.steps/2)) });
                    const latlngs = c1.concat(c2);
                    if (indoorRouteLayerRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e) {} }
                    try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
                    indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#007bff', weight: 4, opacity: 0.9, dashArray: '4,6' }).addTo(mapRef.current);
                    try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch(e){}
                    let meters = 0; for (let i = 0; i < latlngs.length - 1; i++) meters += mapRef.current.distance(latlngs[i], latlngs[i+1]);
                      const minutes = Math.round((meters/1.4)/60);
                      setRouteInfo({ distanceKm: (meters/1000).toFixed(2), minutes });
                      setInstructions(buildInstructions({ startInside, destInside, meters, minutes, destName: (localDestination && localDestination.name) || destination }));
                      setStatus('Campus-constrained centroid curved route');
                  }
                }
                didIndoor = true;
              }
            }
          } catch (e) { console.log('campus routing check failed', e); }
          if (directRoute) {
            // draw a smooth curved polyline between points (nicer visual than straight line)
            try { if (routingControlRef.current) { mapRef.current.removeControl(routingControlRef.current); routingControlRef.current = null; } } catch (e) {}
            try { if (indoorRouteLayerRef.current) { mapRef.current.removeLayer(indoorRouteLayerRef.current); indoorRouteLayerRef.current = null; } } catch (e) {}
            try { if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; } } catch(e){}
            const latlngs = makeCurve(userLatLng, destLatLng, { curvature: 0.18, steps: 80 });
            indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#007bff', weight: 4, opacity: 0.95, smoothFactor: 1 }).addTo(mapRef.current);
            try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch (e) {}
            // compute polyline length along the curve for display
            let meters = 0;
            for (let i = 0; i < latlngs.length - 1; i++) meters += mapRef.current.distance(latlngs[i], latlngs[i+1]);
            const minutes = Math.round((meters/1.4) / 60); // walking speed ~1.4 m/s
            setRouteInfo({ distanceKm: (meters/1000).toFixed(2), minutes });
            try {
              const poly = tileLayerRef.current && tileLayerRef.current.campusPolygon;
              const sInside = poly && pointInPolygon(userLatLng, poly);
              const dInside = poly && pointInPolygon(destLatLng, poly);
              setInstructions(buildInstructions({ startInside: sInside, destInside: dInside, meters, minutes, destName: (localDestination && localDestination.name) || destination }));
            } catch (e) { /* ignore */ }
            setStatus('Direct route drawn');
          } else {
            // fallback to outdoor (leaflet-routing-machine)
            routingControlRef.current = L.Routing.control({
              waypoints: [userLatLng, destLatLng],
              lineOptions: { styles: [{ color: "#007bff", weight: 5, opacity: 0.9 }] },
              createMarker: () => null,
              routeWhileDragging: false,
              showAlternatives: false,
            }).addTo(mapRef.current);

            // Wrap internal clear to avoid errors when map is removed unexpectedly
            try {
              const rc = routingControlRef.current;
              if (rc && rc._clearLines && typeof rc._clearLines === 'function') {
                const origClear = rc._clearLines.bind(rc);
                rc._clearLines = function() {
                  try {
                    if (!this._map) return; // nothing to clear
                    origClear();
                  } catch (err) {
                    console.warn('Safe _clearLines caught error', err);
                  }
                };
              }
            } catch (e) {
              console.warn('Failed to wrap routing clearLines', e);
            }
          }
        }

        // When routes are found, pick the shortest route, clear routing-control lines and draw only that polyline.
        const onRoutesFound = (e) => {
          try {
            const routes = e.routes || [];
            if (!routes.length) return;
            // pick route with smallest distance (summary.totalDistance or summary.total_distance)
            let best = routes[0];
            let bestDist = (best.summary && (best.summary.totalDistance || best.summary.total_distance)) || Infinity;
            for (const rt of routes) {
              const d = (rt.summary && (rt.summary.totalDistance || rt.summary.total_distance)) || Infinity;
              if (d < bestDist) { best = rt; bestDist = d; }
            }

            // remove any previously drawn custom route polyline
            if (indoorRouteLayerRef.current && mapRef.current) {
              try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch (err) {}
              indoorRouteLayerRef.current = null;
            }

            // clear routing-control internal lines safely
            try {
              if (routingControlRef.current && routingControlRef.current._clearLines) routingControlRef.current._clearLines();
            } catch (err) { /* ignore */ }

            // draw chosen route as a single polyline
            try {
              const coords = best.coordinates || best.route || [];
              // best.coordinates is typically an array of L.LatLng-like {lat,lng}
              const latlngs = coords.map(c => (c.lat !== undefined && c.lng !== undefined) ? L.latLng(c.lat, c.lng) : (Array.isArray(c) && c.length >= 2 ? L.latLng(c[1], c[0]) : null)).filter(Boolean);
              if (latlngs.length) {
                indoorRouteLayerRef.current = L.polyline(latlngs, { color: '#007bff', weight: 5, opacity: 0.95 }).addTo(mapRef.current);
                try { mapRef.current.fitBounds(indoorRouteLayerRef.current.getBounds(), { padding: [40,40] }); } catch(e){}
              }
            } catch (err) { console.warn('Failed to draw chosen route', err); }

            // set route info (distance/time)
              try {
                const meters = best.summary && (best.summary.totalDistance || best.summary.total_distance) || 0;
                const seconds = best.summary && (best.summary.totalTime || best.summary.total_time || best.summary.totalDuration) || 0;
                const km = (meters / 1000).toFixed(2);
                const mins = Math.round(seconds / 60);
                setRouteInfo({ distanceKm: km, minutes: mins });
                // set instructions based on whether points are inside campus and distance
                try {
                  const poly = tileLayerRef.current && tileLayerRef.current.campusPolygon;
                  const sInside = poly && pointInPolygon(userLatLng, poly);
                  const dInside = poly && pointInPolygon(destLatLng, poly);
                  setInstructions(buildInstructions({ startInside: sInside, destInside: dInside, meters, minutes: mins, destName: (localDestination && localDestination.name) || destination }));
                } catch (e) {}
              } catch (err) { }

            // remove campus boundary layer to hide that purple box (if desired)
            try {
              if (tileLayerRef.current && tileLayerRef.current.campusLayer && mapRef.current) {
                mapRef.current.removeLayer(tileLayerRef.current.campusLayer);
                tileLayerRef.current.campusLayer = null;
                tileLayerRef.current.campusPolygon = null;
              }
            } catch (err) { }

          } catch (err) {
            console.warn('routesfound handler error', err);
          }
        };

        if (routingControlRef.current && routingControlRef.current.on) {
          routingControlRef.current.on("routesfound", onRoutesFound);
        }

        try {
          mapRef.current.fitBounds([userLatLng, destLatLng], { padding: [60, 60] });
        } catch (e) { }
        setStatus("Route ready");
      } catch (err) {
        console.error("Map routing error:", err);
        setStatus("Error: " + (err.message || "unknown"));
        if (err.code === 1) alert("Geolocation permission denied");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [destination, localDestination, startLatLng, routeTick]);

  return (
    <div style={styles.container}>
      <div id="map" style={styles.map} />

      <div style={styles.overlay}>
        <div style={{ fontWeight: 600 }}>{(localDestination && localDestination.name) ? `Destination: ${localDestination.name}` : (destination ? `Destination: ${destination}` : "Map")}</div>
        <div style={{ fontSize: 12, marginTop: 6, color: "#666" }}>{status}</div>

        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button onClick={() => { setSelectingStart(true); setStatus('Select start: click on map'); }} style={{ padding: '6px 8px' }}>Select Start</button>
          <button onClick={async () => {
            // Fixed campus center location for consistency across all devices
            const CAMPUS_CENTER = { lat: 12.9103, lng: 74.8998 };
            const finalLatLng = L.latLng(CAMPUS_CENTER.lat, CAMPUS_CENTER.lng);
            setStatus('Using campus center location');
            lastKnownPositionRef.current = CAMPUS_CENTER;
            startManualRef.current = false;

            try {
              // Try to snap to the nearest named location from sjec-locations geojson
              let snapName = null;
              let bestMeters = Infinity;
              let bestLocation = null;
              // Note: We use mapp.geojson locations data loaded during init
              // Check if we can access the rendered location points and snap to nearest
              try {
                const geoData = await fetch("/sjec- locations-1.xlsx.geojson");
                if (geoData.ok) {
                  const locations = await geoData.json();
                  if (locations && locations.features && locations.features.length) {
                    for (const feat of locations.features) {
                      if (feat.geometry && feat.geometry.type === 'Point') {
                        const coords = feat.geometry.coordinates;
                        const locName = feat.properties && (feat.properties.areaName || feat.properties.name);
                        const meters = latLngDistanceMeters(CAMPUS_CENTER, { lat: coords[1], lng: coords[0] });
                        if (meters < bestMeters) {
                          bestMeters = meters;
                          bestLocation = { lat: coords[1], lng: coords[0], name: locName };
                        }
                      }
                    }
                  }
                }
              } catch (e) { console.warn('Could not load named locations', e); }

              // Snap to nearest named location if found, else use campus center
              const snapLatLng = (bestLocation && bestMeters <= 30) ? L.latLng(bestLocation.lat, bestLocation.lng) : finalLatLng;
              if (bestLocation && bestMeters <= 30) {
                setStatus(`Starting at ${bestLocation.name} (campus center proxy)`);
                snapName = bestLocation.name;
              } else {
                setStatus('Starting at campus center');
              }

              setStartLatLng(snapLatLng);
              try { if (startMarkerRef.current && mapRef.current) { mapRef.current.removeLayer(startMarkerRef.current); } } catch (e) {}
              try {
                const popupParts = [`Start: Campus Center`];
                if (snapName) popupParts.push(`Near: ${snapName}`);
                startMarkerRef.current = L.marker(snapLatLng, { icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [35,35] }) }).addTo(mapRef.current).bindPopup(popupParts.join(' • '));
                try { startMarkerRef.current.openPopup(); } catch(e) {}
              } catch (e) {}
              // trigger a route recalculation
              setRouteTick(t => t + 1);
            } catch (err) {
              console.error('Failed to set campus location', err);
              setStatus('Error setting location');
            }
          }} style={{ padding: '6px 8px' }}>Use Campus Center</button>
          <button onClick={() => {
            // Clear the selected destination and any drawn route/markers
            setLocalDestination(null);
            setStatus('Destination cleared');
            setRouteInfo(null);
            setInstructions(null);
            setRouteTick(t => t + 1);
            try {
              if (destMarkerRef.current && mapRef.current) { try { mapRef.current.removeLayer(destMarkerRef.current); } catch (e) {} destMarkerRef.current = null; }
              if (routingControlRef.current && mapRef.current) { try { mapRef.current.removeControl(routingControlRef.current); } catch (e) {} routingControlRef.current = null; }
              if (indoorRouteLayerRef.current && mapRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch (e) {} indoorRouteLayerRef.current = null; }
            } catch (e) {
              console.warn('Clear destination cleanup failed', e);
            }
          }} style={{ padding: '6px 8px' }}>Clear Destination</button>
          <button onClick={() => {
            // Clear extra overlays: geojson markers, indoor graph markers, indoor polygon, campus/buildings layers
            try {
              if (tileLayerRef.current) {
                if (tileLayerRef.current.geoJsonMarkers && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.geoJsonMarkers); tileLayerRef.current.geoJsonMarkers = null; }
                if (tileLayerRef.current.indoorGraphMarkers && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.indoorGraphMarkers); tileLayerRef.current.indoorGraphMarkers = null; }
                if (tileLayerRef.current.indoorLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.indoorLayer); tileLayerRef.current.indoorLayer = null; }
                if (tileLayerRef.current.campusLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.campusLayer); tileLayerRef.current.campusLayer = null; tileLayerRef.current.campusPolygon = null; }
                if (tileLayerRef.current.buildingsLayer && mapRef.current) { mapRef.current.removeLayer(tileLayerRef.current.buildingsLayer); tileLayerRef.current.buildingsLayer = null; }
                if (tileLayerRef.current.geoJsonLayerRef && tileLayerRef.current.geoJsonLayerRef.current && mapRef.current) { try { mapRef.current.removeLayer(tileLayerRef.current.geoJsonLayerRef.current); } catch(e){} tileLayerRef.current.geoJsonLayerRef.current = null; }
              }
              // also remove indoor-route and start/dest markers
              if (indoorRouteLayerRef.current && mapRef.current) { try { mapRef.current.removeLayer(indoorRouteLayerRef.current); } catch(e){} indoorRouteLayerRef.current = null; }
              if (startMarkerRef.current && mapRef.current) { try { mapRef.current.removeLayer(startMarkerRef.current); } catch(e){} startMarkerRef.current = null; }
              if (destMarkerRef.current && mapRef.current) { try { mapRef.current.removeLayer(destMarkerRef.current); } catch(e){} destMarkerRef.current = null; }
              setStatus('Cleared overlays');
            } catch (e) { console.warn('Clear overlays failed', e); }
          }} style={{ padding: '6px 8px' }}>Clear Overlays</button>
          <button onClick={() => { setRouteTick(t => t + 1); setStatus('Recalculating route...'); }} style={{ padding: '6px 8px' }}>Recalculate Route</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={true} disabled />
            <span style={{ fontSize: 12 }}>Direct route (always on)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, marginRight: 6 }}>Map style:</span>
            <select value={mapStyle} onChange={(e) => setMapStyle(e.target.value)} style={{ padding: '4px 6px' }}>
              <option value="satellite">Satellite</option>
              <option value="street">Street</option>
            </select>
          </label>
          {/* Live tracking feature removed */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showGeojsonPaths} onChange={(e) => setShowGeojsonPaths(e.target.checked)} />
            <span style={{ fontSize: 12 }}>Show paths</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showIndoorGraphMarkers} onChange={(e) => setShowIndoorGraphMarkers(e.target.checked)} />
            <span style={{ fontSize: 12 }}>Show indoor nodes</span>
          </label>
        </div>

        <div style={{ marginTop: 8, fontSize: 12 }}>
          <div><strong>Start:</strong> {startLatLng ? `${startLatLng.lat.toFixed(6)}, ${startLatLng.lng.toFixed(6)}` : 'Device location'}</div>
          <div><strong>Selected dest:</strong> {localDestination ? localDestination.name : 'None (or use destination prop)'}</div>
        </div>

        {routeInfo && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#000" }}>
            <strong>Route:</strong> {routeInfo.distanceKm} km • {routeInfo.minutes} min
          </div>
        )}
        {instructions && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#333", background: 'rgba(255,255,255,0.9)', padding: '8px', borderRadius: 6 }}>
            <strong>Note:</strong> {instructions}
          </div>
        )}
      </div>

      {loading && (
        <div style={styles.spinnerOverlay}>
          <Spinner />
        </div>
      )}
    </div>
  );
}
