import * as React from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapView({ destination }) {
  const [viewState, setViewState] = React.useState({
    longitude: 74.8997661,
    latitude: 12.9102945,
    zoom: 14,
  });

  const [currentLocation, setCurrentLocation] = React.useState(null);
  const [destinationLocation, setDestinationLocation] = React.useState(null);
  const [routeData, setRouteData] = React.useState(null);
  const [locations, setLocations] = React.useState([]); // fetch from backend

  // Fetch locations from backend
  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/locations");
        const data = await res.json();
        setLocations(data); // expect [{name:"library", lat:12.9, lng:74.89}, ...]
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
  }, []);

  // Get user’s current location
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.error("Geolocation error:", err)
      );
    }
  }, []);

  // Set destination when user types a known location
  React.useEffect(() => {
    if (destination && locations.length > 0) {
      const loc = locations.find(
        (l) => l.name.toLowerCase() === destination.toLowerCase()
      );
      if (loc) {
        setDestinationLocation({ lat: loc.lat, lng: loc.lng });
        setViewState({
          ...viewState,
          longitude: loc.lng,
          latitude: loc.lat,
        });
      }
    }
  }, [destination, locations]);

  // Fetch route from OpenRouteService
  React.useEffect(() => {
    const fetchRoute = async () => {
      if (!currentLocation || !destinationLocation) return;
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijg0NTZkNzA1MGEzZTRiY2I4NTZlNWI0YTdhNTg3N2QxIiwiaCI6Im11cm11cjY0In0=&start=${currentLocation.lng},${currentLocation.lat}&end=${destinationLocation.lng},${destinationLocation.lat}`;
      const res = await fetch(url);
      const data = await res.json();
      const coords = data.features[0].geometry.coordinates;
      setRouteData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
      });
    };
    fetchRoute();
  }, [currentLocation, destinationLocation]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Map
        mapLib={import("maplibre-gl")}
        mapStyle="https://api.maptiler.com/maps/hybrid/style.json?key=TeDf5lZkkOzJucqs5tog"
        initialViewState={viewState}
        style={{ width: "100%", height: "100vh" }}
      >
        <NavigationControl position="top-left" />

        {/* User marker */}
        {currentLocation && (
          <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} color="blue" />
        )}

        {/* Destination marker */}
        {destinationLocation && (
          <Marker longitude={destinationLocation.lng} latitude={destinationLocation.lat} color="red" />
        )}

        {/* All campus markers */}
        {locations.map((loc) => (
          <Marker
            key={loc.name}
            longitude={loc.lng}
            latitude={loc.lat}
            color="orange"
          />
        ))}

        {/* Route line */}
        {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#FF5733",
                "line-width": 4,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
