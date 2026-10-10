import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, API_URL } from "@/lib/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  X, 
  MapPin, 
  Brain, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Loader2, 
  CheckCircle2,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

const BHOPAL_CENTER: [number, number] = [23.2599, 77.4126];

export function QuickReportWidget() {
  const { user } = useAuth();
  
  // Widget Open/Collapse status
  const [isOpen, setIsOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"report" | "chat">("report");

  // Form states (preserved on collapse)
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Submission pipeline states
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "completed" | "failed">("idle");
  const [submittedComplaint, setSubmittedComplaint] = useState<any>(null);

  // Recent complaints
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);

  // Q&A Assistant Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "assistant"; text: string }>>([
    { 
      sender: "assistant", 
      text: "Hello! I am your SahayogBhopal AI assistant. Ask me anything about your active complaints, resolution timelines, or how auto-routing works!" 
    }
  ]);
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeSubTab]);

  // Leaflet Dynamic Loading
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

  // Fetch recent complaints
  useEffect(() => {
    if (user?.role === "citizen") {
      api.complaints.getAll()
        .then((data: any) => {
          setRecentComplaints(data.slice(0, 3));
        })
        .catch(console.error);
    }
  }, [user, status]);

  // Acquire Geolocation
  useEffect(() => {
    if (isOpen && !position && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setPosition({ lat: BHOPAL_CENTER[0], lng: BHOPAL_CENTER[1] });
        }
      );
    }
  }, [isOpen, position]);

  // Socket.io integration for async AI analysis updates
  useEffect(() => {
    const baseUrl = API_URL.replace('/api', '');
    const socket = io(baseUrl);

    socket.on('complaint:analyzed', async (data) => {
      if (submittedComplaint && data.complaintId === submittedComplaint._id) {
        try {
          const updated = await api.complaints.getById(submittedComplaint._id);
          setSubmittedComplaint(updated.complaint);
          setStatus("completed");
          toast.success("AI photo classification complete!");
        } catch (err) {
          console.error(err);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [submittedComplaint]);

  if (!user || user.role !== "citizen") return null;

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function triggerGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("GPS position updated!");
      },
      (err) => {
        toast.error("Failed to acquire GPS: " + err.message);
      }
    );
  }

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
    if (!position) {
      toast.error("Please set a location on the mini-map.");
      return;
    }
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("description", description || "Quick Report submitted via widget.");
      formData.append("category", "other");
      formData.append("lat", String(position.lat));
      formData.append("lng", String(position.lng));
      if (photo) {
        formData.append("photo", photo);
      }

      const res = await api.complaints.create(formData);
      setSubmittedComplaint(res);
      
      if (photo) {
        setStatus("analyzing");
      } else {
        setStatus("completed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
      setStatus("failed");
    }
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setChatBusy(true);

    try {
      const res = await api.assistant.ask(userText);
      setChatMessages(prev => [...prev, { sender: "assistant", text: res.reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: "assistant", text: err.message || "I am currently having trouble connecting to my brain. Please try again." }]);
    } finally {
      setChatBusy(false);
    }
  }

  function resetWidget() {
    setDescription("");
    clearPhoto();
    setStatus("idle");
    setSubmittedComplaint(null);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      
      {/* Drawer Drawer Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-96 max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl flex flex-col gap-4 text-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <Sparkles className="h-4 w-4 text-secondary animate-pulse" />
                Sahayog Citizen Agent
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* TABS (Available when not currently submitting a report) */}
            {status === "idle" && (
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("report")}
                  className={`rounded-md py-1.5 transition-colors flex items-center justify-center gap-1 ${
                    activeSubTab === "report" ? "bg-background text-primary shadow" : "text-muted-foreground"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" /> File Quick Report
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("chat")}
                  className={`rounded-md py-1.5 transition-colors flex items-center justify-center gap-1 ${
                    activeSubTab === "chat" ? "bg-background text-primary shadow" : "text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Ask Assistant
                </button>
              </div>
            )}

            {/* TAB CONTENTS */}
            {activeSubTab === "report" || status !== "idle" ? (
              
              /* REPORT SUBMISSION FLOW */
              status !== "idle" ? (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                  {status === "uploading" && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                      <div>
                        <h4 className="font-bold text-foreground">Uploading Report</h4>
                        <p className="text-xs text-muted-foreground mt-1">Transmitting description and photo to city servers...</p>
                      </div>
                    </>
                  )}

                  {status === "analyzing" && (
                    <>
                      <Brain className="h-8 w-8 text-secondary animate-bounce" />
                      <div>
                        <h4 className="font-bold text-foreground">Analyzing Photo</h4>
                        <p className="text-xs text-muted-foreground mt-1">AI Claude Vision is identifying details & auto-routing...</p>
                      </div>
                    </>
                  )}

                  {status === "completed" && submittedComplaint && (
                    <div className="space-y-4 w-full">
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                      <div>
                        <h4 className="font-bold text-foreground">Report Filed!</h4>
                        <p className="text-xs text-muted-foreground mt-1">Complaint number: <strong>{submittedComplaint.complaintNumber}</strong></p>
                      </div>

                      {/* AI Readout */}
                      {submittedComplaint.aiCategory && (
                        <div className="bg-secondary/5 border border-secondary/10 p-3 rounded-lg text-left text-xs space-y-1.5">
                          <div className="font-bold text-secondary flex items-center gap-1">
                            <Brain className="h-3.5 w-3.5" /> AI Assisted Routing
                          </div>
                          <p className="text-muted-foreground italic">"{submittedComplaint.aiDescription}"</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="bg-secondary/15 text-secondary px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold">
                              {submittedComplaint.aiCategory}
                            </span>
                            <span className="bg-accent/15 text-accent px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold">
                              Severity: {submittedComplaint.aiSeverity}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="bg-muted/40 p-3 rounded-lg border text-xs text-left">
                        <span className="block text-muted-foreground">Routing Status:</span>
                        <span className="font-bold text-primary">
                          {submittedComplaint.aiReviewStatus === "auto_routed" 
                            ? `Routed to ${submittedComplaint.department?.name || 'Assigned Department'}`
                            : "Pending Admin Triage"}
                        </span>
                      </div>

                      <button
                        onClick={resetWidget}
                        className="w-full rounded-md bg-secondary py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90"
                      >
                        File Another Issue
                      </button>
                    </div>
                  )}

                  {status === "failed" && (
                    <>
                      <X className="h-8 w-8 text-destructive animate-pulse" />
                      <div>
                        <h4 className="font-bold text-foreground">Submission Failed</h4>
                        <p className="text-xs text-muted-foreground mt-1">Please check your network and try again.</p>
                      </div>
                      <button
                        onClick={() => setStatus("idle")}
                        className="w-full rounded bg-primary py-2 text-xs text-white"
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* FORM / IDLE STATE */
                <form onSubmit={submit} className="space-y-4">
                  {/* Geolocation Mini Map */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">Location Pin</span>
                      <button type="button" onClick={triggerGps} className="text-secondary hover:underline flex items-center gap-0.5 font-bold">
                        <MapPin className="h-3 w-3" /> Refresh GPS
                      </button>
                    </div>
                    {mounted && mod && position ? (
                      <div className="relative h-28 w-full overflow-hidden rounded-lg border border-border shadow-inner z-0">
                        <mod.MapContainer
                          center={[position.lat, position.lng]}
                          zoom={14}
                          zoomControl={false}
                          scrollWheelZoom={true}
                          style={{ height: "100%", width: "100%" }}
                        >
                          <mod.TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <MapEventsHandler />
                          <mod.CircleMarker
                            center={[position.lat, position.lng]}
                            radius={6}
                            pathOptions={{ color: "white", fillColor: "oklch(0.60 0.22 30)", weight: 2, fillOpacity: 1 }}
                          />
                        </mod.MapContainer>
                      </div>
                    ) : (
                      <div className="h-28 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground rounded-lg">
                        Acquiring location...
                      </div>
                    )}
                  </div>

                  {/* Photo Input */}
                  <div>
                    {photoPreview ? (
                      <div className="relative overflow-hidden rounded-lg border border-border">
                        <img src={photoPreview} alt="Selected" className="max-h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-background py-4 text-xs text-muted-foreground transition-colors hover:border-secondary hover:bg-muted/40">
                        <Camera className="h-4 w-4 text-secondary" />
                        <span className="font-semibold text-primary">Capture or Add Photo</span>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={onPickPhoto}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Optional description */}
                  <div>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short description (optional)..."
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                    />
                  </div>

                  <button
                    disabled={!position}
                    className="w-full rounded bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-secondary disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Quick Report
                  </button>
                </form>
              )
            ) : (
              
              /* Q&A ASSISTANT CHAT INTERFACE */
              <div className="flex flex-col gap-3 h-72">
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 border border-border/40 rounded-lg p-2.5 bg-muted/20">
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <span className="text-[9px] text-muted-foreground mb-0.5 capitalize">{msg.sender}</span>
                      <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-card border border-border rounded-tl-none text-foreground"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                      <span>Thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your complaints..."
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                  />
                  <button 
                    disabled={chatBusy || !chatInput.trim()}
                    className="rounded bg-secondary text-secondary-foreground px-3 hover:bg-secondary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* COLLAPSIBLE RECENT REPORTS SECTION */}
            <div className="border-t border-border pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowRecent(!showRecent)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                <span>Recent Reports ({recentComplaints.length})</span>
                {showRecent ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
              
              <AnimatePresence>
                {showRecent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-2 space-y-2"
                  >
                    {recentComplaints.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic py-2">No recent quick reports filed.</p>
                    ) : (
                      recentComplaints.map((c: any) => (
                        <div key={c._id} className="flex justify-between items-center bg-muted/40 p-2 rounded border border-border/50 text-[11px]">
                          <div>
                            <span className="font-semibold text-foreground">{c.complaintNumber}</span>
                            <span className="block text-[9px] text-muted-foreground max-w-[200px] truncate">{c.description}</span>
                          </div>
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            c.status === "Resolved" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[image:var(--gradient-hero)] text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open Quick Report Widget"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5 animate-pulse" />}
      </button>

    </div>
  );
}
