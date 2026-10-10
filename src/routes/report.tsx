import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Camera, X, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/SiteNav";
import { BHOPAL_AREAS, CATEGORIES } from "@/lib/bhopal-data";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an issue · SahayogBhopal" },
      { name: "description", content: "Report potholes, pollution, waterlogging or blockages anywhere in Bhopal." },
    ],
  }),
  component: ReportPage,
});

const BHOPAL_CENTER: [number, number] = [23.2599, 77.4126];

function ReportPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    description: "",
    category: CATEGORIES[0].value as string,
    priority: "Medium",
    area: BHOPAL_AREAS[0].name,
  });
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // GPS/Map Selection state
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mod, setMod] = useState<{
    MapContainer: any; TileLayer: any; CircleMarker: any; useMapEvents: any;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl]) => {
      if (!alive) return;
      setMod({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        useMapEvents: rl.useMapEvents
      });
      setMounted(true);
    });
    return () => { alive = false; };
  }, []);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Photo must be under 8 MB.");
      return;
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function useGps() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Acquiring GPS position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("GPS Location acquired!");
      },
      (err) => {
        toast.error("Failed to acquire GPS location: " + err.message);
      }
    );
  }

  // Helper component to handle click events on Leaflet Map
  function MapEventsHandler() {
    if (!mod) return null;
    const { useMapEvents } = mod;
    useMapEvents({
      click(e: any) {
        setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { nav({ to: "/auth" }); return; }
    if (!position) {
      toast.error("Please click on the map or click 'Use GPS' to specify the location.");
      return;
    }
    setBusy(true);
    
    try {
      const formData = new FormData();
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("priority", form.priority);
      formData.append("area", form.area);
      formData.append("lat", String(position.lat));
      formData.append("lng", String(position.lng));
      if (photo) {
        formData.append("photo", photo);
      }

      await api.complaints.create(formData);
      
      toast.success("Complaint filed successfully — auto-assigned and logged!");
      nav({ to: "/reports" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit complaint");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Report an issue</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what's happening on the street. We'll map, classify, and route it to the right department automatically.
        </p>

        {!loading && !user && (
          <div className="mt-6 rounded-md border border-accent/60 bg-accent/10 p-4 text-sm">
            You need an account to submit. <Link to="/auth" className="font-semibold text-secondary hover:underline">Sign in</Link>.
          </div>
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          {/* Left Column: Map Selector */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Select Location</span>
              <button
                type="button"
                onClick={useGps}
                className="flex items-center gap-1 text-xs font-bold text-secondary hover:underline"
              >
                <MapPin className="h-3 w-3" /> Use GPS Location
              </button>
            </div>
            {mounted && mod ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border shadow-md z-0">
                <mod.MapContainer
                  center={BHOPAL_CENTER}
                  zoom={12}
                  scrollWheelZoom={true}
                  style={{ height: "100%", width: "100%" }}
                >
                  <mod.TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapEventsHandler />
                  {position && (
                    <mod.CircleMarker
                      center={[position.lat, position.lng]}
                      radius={8}
                      pathOptions={{
                        color: "#fff",
                        weight: 2,
                        fillColor: "oklch(0.60 0.22 30)",
                        fillOpacity: 1,
                      }}
                    />
                  )}
                </mod.MapContainer>
              </div>
            ) : (
              <div className="aspect-[4/3] w-full rounded-xl border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Loading Bhopal map...
              </div>
            )}
            {position && (
              <div className="text-xs text-muted-foreground bg-muted p-2.5 rounded-md">
                Coordinates: <span className="font-semibold text-foreground">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
              </div>
            )}
          </div>

          {/* Right Column: Form */}
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Area">
                <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls}>
                  {BHOPAL_AREAS.map((a) => (<option key={a.name} value={a.name}>{a.name}</option>))}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </Field>
            </div>

            <Field label="Photo (optional)">
              {photoPreview ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={photoPreview} alt="Selected" className="max-h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-secondary hover:bg-muted/40">
                  <Camera className="h-5 w-5 text-secondary" />
                  <span className="font-semibold text-primary">Add a photo</span>
                  <span className="text-[10px]">Snap photo or upload file · up to 8 MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickPhoto}
                    className="hidden"
                  />
                </label>
              )}
            </Field>

            <Field label="Description">
              <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what's wrong (e.g. 3-foot pothole on main road causing bikes to swerve)..."
                className={inputCls} />
            </Field>

            <button
              disabled={busy || !user || !position}
              className="w-full rounded-md bg-accent py-3 text-sm font-bold text-accent-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? "Submitting complaint..." : "Submit report"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}