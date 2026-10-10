// live sensors, RTMC feeds and department APIs.
import { useState, useEffect } from "react";

export type Area = {
  name: string;
  lat: number;
  lng: number;
  aqi: number;
  aqiCategory: "Good" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  roadCondition: "Good" | "Fair" | "Poor" | "Critical";
  congestion: number; // 0..100
};

export const BHOPAL_AREAS: Area[] = [
  { name: "MP Nagar",     lat: 23.2330, lng: 77.4340, aqi: 178, aqiCategory: "Poor",      roadCondition: "Fair",     congestion: 82 },
  { name: "New Market",   lat: 23.2360, lng: 77.4020, aqi: 156, aqiCategory: "Poor",      roadCondition: "Poor",     congestion: 74 },
  { name: "Arera Colony", lat: 23.2200, lng: 77.4260, aqi:  92, aqiCategory: "Moderate",  roadCondition: "Good",     congestion: 41 },
  { name: "Habibganj",    lat: 23.2255, lng: 77.4360, aqi: 204, aqiCategory: "Very Poor", roadCondition: "Critical", congestion: 88 },
  { name: "Kolar Road",   lat: 23.1720, lng: 77.4260, aqi: 121, aqiCategory: "Moderate",  roadCondition: "Poor",     congestion: 63 },
  { name: "Old City",     lat: 23.2612, lng: 77.4020, aqi: 189, aqiCategory: "Poor",      roadCondition: "Critical", congestion: 91 },
  { name: "Bairagarh",    lat: 23.2712, lng: 77.3320, aqi: 133, aqiCategory: "Moderate",  roadCondition: "Fair",     congestion: 55 },
  { name: "Shahpura",     lat: 23.1970, lng: 77.4370, aqi: 104, aqiCategory: "Moderate",  roadCondition: "Good",     congestion: 48 },
];

export const DEPARTMENTS = [
  "PWD",
  "BMC",
  "Traffic",
  "Pollution Board",
  "Electricity",
  "Water",
] as const;

export const CATEGORIES = [
  { value: "pothole",      label: "Pothole / bad road", dept: "PWD" },
  { value: "blockage",     label: "Road blockage",       dept: "Traffic" },
  { value: "pollution",    label: "Air / smoke",         dept: "Pollution Board" },
  { value: "garbage",      label: "Garbage / drain",     dept: "BMC" },
  { value: "waterlogging", label: "Waterlogging",        dept: "BMC" },
  { value: "streetlight",  label: "Streetlight",         dept: "Electricity" },
] as const;

export function aqiColor(aqi: number): string {
  if (aqi <= 50)  return "oklch(0.75 0.16 145)";
  if (aqi <= 100) return "oklch(0.80 0.16 95)";
  if (aqi <= 200) return "oklch(0.72 0.17 55)";
  if (aqi <= 300) return "oklch(0.60 0.22 30)";
  return "oklch(0.45 0.20 20)";
}

// Map lat/lng to a 0..100 percentage inside a bounding box for the schematic map.
export const BHOPAL_BBOX = {
  minLat: 23.15, maxLat: 23.30,
  minLng: 77.30, maxLng: 77.46,
};

export function projectToMap(lat: number, lng: number) {
  const { minLat, maxLat, minLng, maxLng } = BHOPAL_BBOX;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

export function useLiveBhopalData() {
  const [areas, setAreas] = useState<Area[]>(BHOPAL_AREAS);

  useEffect(() => {
    // Simulate real-time updates every 4 seconds for the hackathon demo
    const interval = setInterval(() => {
      setAreas((prevAreas) =>
        prevAreas.map((area) => {
          // +/- 5 AQI change
          let newAqi = area.aqi + Math.floor(Math.random() * 11) - 5;
          newAqi = Math.max(20, Math.min(500, newAqi)); // clamp 20-500
          
          let category: Area["aqiCategory"] = "Good";
          if (newAqi > 50) category = "Moderate";
          if (newAqi > 150) category = "Poor";
          if (newAqi > 200) category = "Very Poor";
          if (newAqi > 300) category = "Severe";

          // +/- 3% congestion change
          let newCongestion = area.congestion + Math.floor(Math.random() * 7) - 3;
          newCongestion = Math.max(0, Math.min(100, newCongestion)); // clamp 0-100

          return {
            ...area,
            aqi: newAqi,
            aqiCategory: category,
            congestion: newCongestion,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return areas;
}