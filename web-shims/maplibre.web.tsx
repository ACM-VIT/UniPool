// Web implementation of the subset of "@maplibre/maplibre-react-native"
// (v11) that the app actually uses, built on top of maplibre-gl via
// react-map-gl. This keeps the three native consumers (TripPreviewMap,
// RoutePreviewLayer, HomeScreen) unchanged: they import the same named
// components (Map, Camera, Marker, GeoJSONSource, Layer, UserLocation)
// and the same imperative refs (CameraRef.fitBounds/easeTo,
// MapRef.getBounds), and this module fulfils that contract in the browser.
//
// Only the surface the app touches is implemented. The native and web
// MapLibre share the same style-spec (layer paint/layout, GeoJSON
// sources, the OpenFreeMap tile styles), so layer and source props pass
// straight through.
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MapGL, {
  Layer as GLLayer,
  Marker as GLMarker,
  Source as GLSource,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type LngLat = [number, number];
type Bounds = [number, number, number, number]; // [west, south, east, north]
type Padding = { top?: number; bottom?: number; left?: number; right?: number };

// Shared handle to the underlying maplibre-gl Map instance, plus a
// readiness flag. Camera and UserLocation are rendered as children of
// Map, so they read the live instance from here once the style loads.
type MapInstanceContextValue = {
  getMap: () => maplibregl.Map | null;
  ready: boolean;
};
const MapInstanceContext = createContext<MapInstanceContextValue>({
  getMap: () => null,
  ready: false,
});

// Default view over India until a Camera child frames something specific.
const INDIA_VIEW = { longitude: 78.96, latitude: 20.59, zoom: 3.4 };

export type MapRef = {
  getBounds: () => Promise<Bounds | null>;
  getMap: () => maplibregl.Map | null;
  project: (lngLat: LngLat) => { x: number; y: number };
};

type MapProps = {
  children?: React.ReactNode;
  mapStyle?: string;
  onRegionDidChange?: (event: { nativeEvent: { bounds: Bounds } }) => void;
  onDidFinishLoadingMap?: () => void;
  // Native-only ornament / a11y props are accepted and ignored on web;
  // the equivalents are configured directly on the maplibre-gl map.
  [key: string]: unknown;
};

export const Map = forwardRef<MapRef, MapProps>(function Map(props, ref) {
  const { children, mapStyle, onRegionDidChange, onDidFinishLoadingMap, accessibilityLabel } = props;
  // react-map-gl MapRef. Its getMap() returns the underlying maplibre-gl
  // Map; this is the documented way to reach the instance (the load
  // event's target is not guaranteed to be it).
  const rmRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const firedRef = useRef(false);

  const getMap = useCallback((): maplibregl.Map | null => rmRef.current?.getMap?.() ?? null, []);

  const boundsArray = useCallback((): Bounds | null => {
    const map = getMap();
    if (!map) return null;
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }, [getMap]);

  useImperativeHandle(
    ref,
    () => ({
      getBounds: async () => boundsArray(),
      getMap,
      project: (lngLat: LngLat) => {
        const map = getMap();
        if (!map) return { x: 0, y: 0 };
        const point = map.project(lngLat);
        return { x: point.x, y: point.y };
      },
    }),
    [boundsArray, getMap],
  );

  const emitRegion = useCallback(() => {
    const bounds = boundsArray();
    if (bounds && onRegionDidChange) {
      onRegionDidChange({ nativeEvent: { bounds } });
    }
  }, [boundsArray, onRegionDidChange]);

  const handleLoaded = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setReady(true);
    onDidFinishLoadingMap?.();
    emitRegion();
  }, [emitRegion, onDidFinishLoadingMap]);

  // Belt and suspenders: also bind to the maplibre 'load' event directly
  // in case the react-map-gl onLoad prop does not fire in this runtime.
  useEffect(() => {
    const map = getMap();
    if (!map) return;
    if (typeof map.loaded === "function" && map.loaded()) {
      handleLoaded();
      return;
    }
    map.once?.("load", handleLoaded);
    return () => {
      map.off?.("load", handleLoaded);
    };
  }, [getMap, handleLoaded]);

  const contextValue = React.useMemo(() => ({ getMap, ready }), [getMap, ready]);

  return (
    // Absolute fill so the map covers its parent View (which RN lays out
    // with a real size). The wrapper is the positioned ancestor.
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} aria-label={accessibilityLabel as string}>
      <MapGL
        ref={rmRef}
        initialViewState={INDIA_VIEW}
        mapStyle={mapStyle as string}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={handleLoaded}
        onMoveEnd={emitRegion}
      >
        <MapInstanceContext.Provider value={contextValue}>{children}</MapInstanceContext.Provider>
      </MapGL>
    </div>
  );
});

type InitialViewState =
  | { center: LngLat; zoom: number }
  | { bounds: Bounds; padding?: Padding };

export type CameraRef = {
  fitBounds: (bounds: Bounds, options?: { padding?: Padding | number; duration?: number }) => void;
  easeTo: (options: { center?: LngLat; zoom?: number; duration?: number }) => void;
  flyTo: (options: { center?: LngLat; zoom?: number; duration?: number }) => void;
  jumpTo: (options: { center?: LngLat; zoom?: number }) => void;
};

type CameraProps = { initialViewState?: InitialViewState };

const fitBoundsTuple = (bounds: Bounds): [[number, number], [number, number]] => [
  [bounds[0], bounds[1]],
  [bounds[2], bounds[3]],
];

export const Camera = forwardRef<CameraRef, CameraProps>(function Camera(props, ref) {
  const { getMap, ready } = useContext(MapInstanceContext);
  const { initialViewState } = props;
  const appliedInitial = useRef(false);

  useEffect(() => {
    if (!ready || appliedInitial.current || !initialViewState) return;
    const map = getMap();
    if (!map) return;
    appliedInitial.current = true;
    if ("bounds" in initialViewState) {
      map.fitBounds(fitBoundsTuple(initialViewState.bounds), {
        padding: initialViewState.padding ?? 0,
        duration: 0,
        maxZoom: 16,
      });
    } else {
      map.jumpTo({ center: initialViewState.center, zoom: initialViewState.zoom });
    }
  }, [ready, initialViewState, getMap]);

  useImperativeHandle(
    ref,
    () => ({
      fitBounds: (bounds, options = {}) => {
        const map = getMap();
        if (!map) return;
        map.fitBounds(fitBoundsTuple(bounds), {
          padding: options.padding ?? 0,
          duration: options.duration ?? 0,
          maxZoom: 16,
        });
      },
      easeTo: (options) => {
        const map = getMap();
        if (!map) return;
        map.easeTo({ center: options.center, zoom: options.zoom, duration: options.duration ?? 0 });
      },
      flyTo: (options) => {
        const map = getMap();
        if (!map) return;
        map.flyTo({ center: options.center, zoom: options.zoom, duration: options.duration ?? 0 });
      },
      jumpTo: (options) => {
        const map = getMap();
        if (!map) return;
        map.jumpTo({ center: options.center, zoom: options.zoom });
      },
    }),
    [getMap],
  );

  return null;
});

type MarkerAnchor = "center" | "top" | "bottom" | "left" | "right";
type MarkerProps = {
  lngLat: LngLat;
  anchor?: MarkerAnchor;
  onPress?: () => void;
  children?: React.ReactNode;
};

export const Marker: React.FC<MarkerProps> = ({ lngLat, anchor = "center", onPress, children }) => (
  <GLMarker
    longitude={lngLat[0]}
    latitude={lngLat[1]}
    anchor={anchor}
    onClick={onPress ? () => onPress() : undefined}
    style={{ cursor: onPress ? "pointer" : "default" }}
  >
    {children}
  </GLMarker>
);

type GeoJSONSourceProps = {
  id: string;
  data: GeoJSON.Feature | GeoJSON.FeatureCollection;
  children?: React.ReactNode;
};

// In the native API, Layer children of a source bind to it implicitly.
// On web, maplibre-gl requires every layer to name its source, so we
// inject the source id into each child Layer here.
export const GeoJSONSource: React.FC<GeoJSONSourceProps> = ({ id, data, children }) => (
  <GLSource id={id} type="geojson" data={data}>
    {React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child as React.ReactElement<LayerProps>, { source: id })
        : child,
    )}
  </GLSource>
);

type LayerProps = {
  id: string;
  type: string;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  source?: string;
};

export const Layer: React.FC<LayerProps> = ({ id, type, layout, paint, source }) => (
  <GLLayer
    id={id}
    type={type as never}
    source={source as never}
    layout={(layout ?? {}) as never}
    paint={(paint ?? {}) as never}
  />
);

// Blue location puck driven by the browser Geolocation API, mirroring
// the native UserLocation dot. Renders nothing until a fix arrives.
export const UserLocation: React.FC<{ animated?: boolean; accuracy?: boolean; heading?: boolean; minDisplacement?: number }> = () => {
  const [position, setPosition] = useState<LngLat | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (fix) => setPosition([fix.coords.longitude, fix.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (!position) return null;
  return (
    <GLMarker longitude={position[0]} latitude={position[1]} anchor="center">
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          backgroundColor: "#1A73E8",
          border: "3px solid #FFFFFF",
          boxShadow: "0 0 0 4px rgba(26,115,232,0.25)",
        }}
      />
    </GLMarker>
  );
};

export default { Map, Camera, Marker, GeoJSONSource, Layer, UserLocation };
