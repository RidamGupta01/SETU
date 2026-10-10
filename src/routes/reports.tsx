import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api, API_URL } from "@/lib/api";
import { io } from "socket.io-client";
import { 
  AlertOctagon, 
  Check, 
  Clock, 
  MapPin, 
  Star, 
  FileText, 
  User as UserIcon, 
  AlertCircle,
  Eye,
  Brain,
  Plus,
  Sparkles
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Civic Complaints Queue & SLA Tracker · SahayogBhopal" },
      { name: "description", content: "Citizen complaints lifecycle, department queues, SLA tracking, and audit trails." },
    ],
  }),
  component: ComplaintsPage,
});

const STATUSES = ["Received", "Assigned", "In Progress", "Resolved", "Rejected"] as const;

function ComplaintsPage() {
  const { user, isPrivileged } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"complaints" | "triage" | "audit">("complaints");
  const [filter, setFilter] = useState<string>("all");
  
  // Active selected complaint details
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  
  // Status update inputs
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState<string>("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Reassignment inputs
  const [reassignDeptId, setReassignDeptId] = useState<string>("");
  const [reassignNote, setReassignNote] = useState<string>("");
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Rating inputs
  const [rating, setRating] = useState<number>(0);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Socket.io integration
  useEffect(() => {
    const baseUrl = API_URL.replace('/api', '');
    const socket = io(baseUrl);

    socket.on('complaint:created', (data) => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
    });

    socket.on('complaint:analyzed', (data) => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      if (selectedComplaintId === data.complaintId) {
        qc.invalidateQueries({ queryKey: ["complaint-details", selectedComplaintId] });
      }
      toast.info(`AI analysis complete for complaint #${data.complaintId.slice(-6)}`);
    });

    socket.on('complaint:updated', (data) => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      if (selectedComplaintId === data.complaintId) {
        qc.invalidateQueries({ queryKey: ["complaint-details", selectedComplaintId] });
      }
      if (user && user._id === data.citizenId) {
        if (data.status === 'Resolved') {
          toast.success(
            <div className="flex flex-col gap-1.5 p-1 w-full">
              <div className="flex items-center gap-1.5 font-extrabold text-green-600 dark:text-green-400">
                <Sparkles className="h-4 w-4 animate-bounce" /> Work Completed 🎉
              </div>
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {data.message || "Your complaint has been marked as Resolved! Please open the tracker panel to rate your satisfaction."}
              </p>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.success(`Your complaint status was updated to: ${data.status}`);
        }
      }
    });

    socket.on('sla:violated', (data) => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      if (user && (user.role === 'admin' || user.role === 'super_admin')) {
        toast.error(`SLA Violation Alert: ${data.message}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [qc, selectedComplaintId, user]);

  // Complaints Query
  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ["complaints"],
    queryFn: async () => {
      return await api.complaints.getAll();
    },
  });

  // Departments Query
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      return await api.departments.getAll();
    }
  });

  // Audit Logs Query (Nodal Admins only)
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      return await api.auditLogs.getAll();
    },
    enabled: activeTab === "audit" && (user?.role === "admin" || user?.role === "super_admin"),
  });

  // Active Complaint Details Query
  const { data: activeDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["complaint-details", selectedComplaintId],
    queryFn: async () => {
      if (!selectedComplaintId) return null;
      return await api.complaints.getById(selectedComplaintId);
    },
    enabled: !!selectedComplaintId,
  });

  // Filter complaints
  const filteredComplaints = filter === "all" 
    ? complaints 
    : complaints.filter((c: any) => c.status === filter);

  // SLA violation check
  const isSlaBreached = (c: any) => {
    if (c.status === "Resolved" || c.status === "Rejected") return c.isSlaViolated;
    return c.isSlaViolated || new Date(c.slaDeadline) < new Date();
  };

  // Submit status update handler
  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaintId || !newStatus) return;
    setSubmittingStatus(true);
    try {
      await api.complaints.updateStatus(selectedComplaintId, newStatus, statusNote);
      toast.success("Complaint status updated successfully.");
      setStatusNote("");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["complaint-details", selectedComplaintId] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setSubmittingStatus(false);
    }
  }

  // Submit reassignment handler
  async function handleReassign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaintId || !reassignDeptId) return;
    setSubmittingReassign(true);
    try {
      await api.complaints.reassign(selectedComplaintId, reassignDeptId, reassignNote);
      toast.success("Department reassigned successfully.");
      setReassignNote("");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["complaint-details", selectedComplaintId] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign department");
    } finally {
      setSubmittingReassign(false);
    }
  }

  // Submit feedback rating handler
  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaintId || rating === 0) {
      toast.error("Please select a rating of 1 to 5 stars.");
      return;
    }
    setSubmittingRating(true);
    try {
      await api.complaints.rate(selectedComplaintId, rating, ratingComment);
      toast.success("Feedback submitted. Thank you!");
      setRating(0);
      setRatingComment("");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["complaint-details", selectedComplaintId] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmittingRating(false);
    }
  }

  const isNodalAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        
        {/* Header & Tabs */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Complaints Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor, assign, and track SLA and resolution progress for all citizen complaints.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isNodalAdmin ? (
              <div className="flex rounded-lg bg-muted p-1 text-sm">
                <button
                  onClick={() => setActiveTab("complaints")}
                  className={`rounded-md px-4 py-1.5 font-semibold transition-colors ${
                    activeTab === "complaints" ? "bg-background text-primary shadow" : "text-muted-foreground"
                  }`}
                >
                  Complaints Queue
                </button>
                <button
                  onClick={() => setActiveTab("triage")}
                  className={`rounded-md px-4 py-1.5 font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "triage" ? "bg-background text-primary shadow" : "text-muted-foreground"
                  }`}
                >
                  <Brain className="h-4 w-4" /> AI Triage Queue
                  {complaints.filter((c: any) => c.aiReviewStatus === 'needs_review').length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`rounded-md px-4 py-1.5 font-semibold transition-colors ${
                    activeTab === "audit" ? "bg-background text-primary shadow" : "text-muted-foreground"
                  }`}
                >
                  Audit Logs
                </button>
              </div>
            ) : null}
            
            {activeTab === "complaints" && (
              <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1 text-xs">
                {(["all", ...STATUSES] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`rounded px-3 py-1.5 font-semibold uppercase tracking-wider transition-colors ${
                      filter === s ? "bg-background text-primary shadow" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Complaints Section */}
        {activeTab === "complaints" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            
            {/* Left side: Complaints List */}
            <div className="space-y-4">
              {loadingComplaints ? (
                <div className="flex py-20 justify-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-r-2" />
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                  No complaints found matching this filter.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-widest text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Complaint</th>
                        <th className="px-4 py-3 text-left">Department</th>
                        <th className="px-4 py-3 text-left">SLA Status</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredComplaints.map((c: any) => {
                        const breached = isSlaBreached(c);
                        const isSelected = selectedComplaintId === c._id;
                        return (
                          <tr 
                            key={c._id} 
                            className={`transition-colors border-l-4 ${
                              breached 
                                ? "border-l-destructive bg-destructive/5 hover:bg-destructive/10" 
                                : isSelected 
                                  ? "border-l-secondary bg-secondary/5" 
                                  : "border-l-transparent hover:bg-muted/30"
                            }`}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-start gap-3">
                                {c.photoUrl ? (
                                  <a href={`${API_URL.replace('/api', '')}${c.photoUrl}`} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img 
                                      src={`${API_URL.replace('/api', '')}${c.photoUrl}`} 
                                      alt="" 
                                      className="h-12 w-12 rounded-md border border-border object-cover" 
                                    />
                                  </a>
                                ) : (
                                  <div className="grid h-12 w-12 place-items-center rounded-md bg-muted text-muted-foreground">
                                    <FileText className="h-6 w-6" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    {c.complaintNumber}
                                    {c.aiReviewStatus === 'auto_routed' && c.aiConfidence && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary/15 text-secondary px-2 py-0.5 text-[9px] font-bold">
                                        <Brain className="h-2.5 w-2.5" /> AI-routed ({(c.aiConfidence * 100).toFixed(0)}%)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">{c.description}</div>
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    Filed by: {c.citizen?.fullName || "Citizen"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-semibold text-primary">{c.department?.name || "Unassigned / Triage"}</span>
                            </td>
                            <td className="px-4 py-4">
                              {breached ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                                  <AlertCircle className="h-3.5 w-3.5" /> Overdue (SLA)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <Clock className="h-3.5 w-3.5 text-green-500" /> Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${
                                c.status === "Resolved" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : c.status === "Rejected"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedComplaintId(c._id);
                                  setNewStatus(c.status);
                                  setReassignDeptId(c.department?._id || "");
                                }}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                                  isSelected 
                                    ? "bg-secondary text-secondary-foreground" 
                                    : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Detailed Action Panel */}
            <div className="space-y-6">
              {!selectedComplaintId ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm text-sm text-muted-foreground">
                  Select a complaint from the list to track its status, view timelines, and update details.
                </div>
              ) : loadingDetails || !activeDetails ? (
                <div className="flex py-20 justify-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary" />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden animate-in fade-in duration-300">
                  
                  {/* Panel Header */}
                  <div className="border-b border-border bg-muted/40 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{activeDetails.complaint.complaintNumber}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Type: {activeDetails.complaint.complaintType}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${
                        activeDetails.complaint.status === "Resolved" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {activeDetails.complaint.status}
                      </span>
                    </div>
                  </div>

                  {/* Panel Content */}
                  <div className="p-5 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</h4>
                      <p className="mt-2 text-sm text-foreground leading-relaxed">{activeDetails.complaint.description}</p>
                    </div>

                    {activeDetails.complaint.photoUrl && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Attached Photo</h4>
                        <a href={`${API_URL.replace('/api', '')}${activeDetails.complaint.photoUrl}`} target="_blank" rel="noreferrer">
                          <img 
                            src={`${API_URL.replace('/api', '')}${activeDetails.complaint.photoUrl}`} 
                            alt="Complaint attachment" 
                            className="max-h-48 w-full rounded-lg border border-border object-cover hover:opacity-90 transition-opacity" 
                          />
                        </a>
                      </div>
                    )}

                    {/* AI photo analysis results badge readouts */}
                    {activeDetails.complaint.aiCategory && (
                      <div className="bg-secondary/5 border border-secondary/15 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                          <Brain className="h-4 w-4 animate-pulse" /> AI-assisted classification
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">
                          {activeDetails.complaint.aiDescription || "Civic infrastructure issue observed."}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="rounded bg-secondary/10 px-2 py-0.5 text-[9px] font-semibold text-secondary uppercase tracking-wider">
                            Category: {activeDetails.complaint.aiCategory.replace('_', ' ')}
                          </span>
                          <span className="rounded bg-accent/15 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
                            Severity: {activeDetails.complaint.aiSeverity || 'medium'}
                          </span>
                          {activeDetails.complaint.aiConfidence && (
                            <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              Confidence: {(activeDetails.complaint.aiConfidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="block text-muted-foreground">Assignee Dept:</span>
                        <span className="font-semibold text-primary">{activeDetails.complaint.department?.name || "Unassigned"}</span>
                      </div>
                      <div>
                        <span className="block text-muted-foreground">SLA Deadline:</span>
                        <span className="font-semibold text-foreground">
                          {new Date(activeDetails.complaint.slaDeadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Complaint Timeline</h4>
                      <div className="relative border-l border-border pl-6 ml-2 space-y-6 text-sm">
                        {activeDetails.timeline.map((step: any) => (
                          <div key={step._id} className="relative">
                            <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-secondary shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            </span>
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-foreground">Status: {step.newStatus}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(step.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">By: {step.actor?.fullName} ({step.actor?.role})</p>
                              {step.message ? (
                                <div className="mt-2 text-xs text-foreground bg-secondary/5 border border-secondary/15 p-3 rounded-lg flex flex-col gap-1">
                                  <div className="font-semibold text-secondary flex items-center gap-1">
                                    <Brain className="h-3 w-3 animate-pulse" /> AI Assistant Update
                                  </div>
                                  <p className="italic text-muted-foreground font-medium">"{step.message}"</p>
                                </div>
                              ) : step.remarks ? (
                                <p className="mt-1 text-xs bg-muted/40 p-2 rounded border border-border/40 text-foreground italic">
                                  "{step.remarks}"
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Officer Status Update Controls */}
                    {isPrivileged && (
                      <form onSubmit={handleStatusUpdate} className="border-t border-border pt-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Update Complaint Status</h4>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                            >
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Status Note</label>
                            <input
                              required
                              type="text"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="e.g. Cleared road debris..."
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                            />
                          </div>
                        </div>

                        <button
                          disabled={submittingStatus}
                          className="w-full rounded bg-secondary py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90 disabled:opacity-60"
                        >
                          {submittingStatus ? "Updating..." : "Update Status"}
                        </button>
                      </form>
                    )}

                    {/* Officer/Admin Manual Reassign Controls */}
                    {isPrivileged && (
                      <form onSubmit={handleReassign} className="border-t border-border pt-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reassign Department</h4>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Target Department</label>
                            <select
                              value={reassignDeptId}
                              onChange={(e) => setReassignDeptId(e.target.value)}
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                            >
                              <option value="" disabled>Select...</option>
                              {departments.map((d: any) => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Reassignment Note</label>
                            <input
                              required
                              type="text"
                              value={reassignNote}
                              onChange={(e) => setReassignNote(e.target.value)}
                              placeholder="e.g. Forwarding to energy division..."
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
                            />
                          </div>
                        </div>

                        <button
                          disabled={submittingReassign || !reassignDeptId}
                          className="w-full rounded bg-accent py-2 text-xs font-bold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
                        >
                          {submittingReassign ? "Reassigning..." : "Confirm Reassignment"}
                        </button>
                      </form>
                    )}

                    {/* Feedback Rating system (Interactive only for Citizens when Resolved) */}
                    {activeDetails.complaint.status === "Resolved" && (
                      <div className="border-t border-border pt-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Citizen Feedback</h4>
                        
                        {activeDetails.complaint.rating ? (
                          <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-lg space-y-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= activeDetails.complaint.rating ? "fill-amber-400 text-amber-400" : "text-border"
                                  }`}
                                />
                              ))}
                            </div>
                            {activeDetails.complaint.ratingComment && (
                              <p className="text-xs text-muted-foreground italic">"{activeDetails.complaint.ratingComment}"</p>
                            )}
                          </div>
                        ) : user?.role === "citizen" ? (
                          <form onSubmit={handleRatingSubmit} className="space-y-3">
                            <label className="block text-xs font-medium text-muted-foreground">
                              Rate your resolution satisfaction:
                            </label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  onMouseEnter={() => setRatingHover(star)}
                                  onMouseLeave={() => setRatingHover(0)}
                                  className="focus:outline-none"
                                >
                                  <Star
                                    className={`h-6 w-6 transition-colors ${
                                      star <= (ratingHover || rating) 
                                        ? "fill-amber-400 text-amber-400" 
                                        : "text-input hover:text-amber-300"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            
                            <textarea
                              rows={2}
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Add any comments on the resolution quality (optional)..."
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-secondary"
                            />

                            <button
                              disabled={submittingRating || rating === 0}
                              className="w-full rounded bg-accent py-2 text-xs font-bold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
                            >
                              {submittingRating ? "Submitting..." : "Submit Feedback"}
                            </button>
                          </form>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Pending citizen rating feedback.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* AI Triage Queue Tab (Nodal Admins only) */}
        {activeTab === "triage" && isNodalAdmin && (
          <div className="mt-8 space-y-6">
            {loadingComplaints ? (
              <div className="flex py-20 justify-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              </div>
            ) : complaints.filter((c: any) => c.aiReviewStatus === 'needs_review').length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No complaints currently require manual triage assignment.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {complaints.filter((c: any) => c.aiReviewStatus === 'needs_review').map((c: any) => (
                  <TriageCard key={c._id} complaint={c} departments={departments} qc={qc} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab (Nodal Admins only) */}
        {activeTab === "audit" && isNodalAdmin && (
          <div className="mt-8">
            {loadingAudit ? (
              <div className="flex py-20 justify-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No system status updates logged.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Actor</th>
                      <th className="px-4 py-3 text-left">Entity</th>
                      <th className="px-4 py-3 text-left">From Status</th>
                      <th className="px-4 py-3 text-left">To Status</th>
                      <th className="px-4 py-3 text-left">Note / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log: any) => (
                      <tr key={log._id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{log.actor?.fullName || "System"}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{log.actor?.role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            log.entityType === "permit" 
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
                          }`}>
                            {log.entityType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.fromStatus}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{log.toStatus}</td>
                        <td className="px-4 py-3 text-xs italic text-foreground max-w-sm truncate">
                          {log.note || "No details provided"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Triage card component for Needs Review complaints
function TriageCard({ complaint, departments, qc }: { complaint: any; departments: any[]; qc: any }) {
  const [selectedDept, setSelectedDept] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDept) {
      toast.error("Please select a department first.");
      return;
    }
    setBusy(true);
    try {
      await api.complaints.confirmTriage(complaint._id, selectedDept, note);
      toast.success("Routing confirmed successfully.");
      qc.invalidateQueries({ queryKey: ["complaints"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm routing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col justify-between animate-in zoom-in-95 duration-200">
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h4 className="font-bold text-foreground">{complaint.complaintNumber}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Filed: {new Date(complaint.createdAt).toLocaleDateString()}</p>
          </div>
          <span className="inline-flex rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-semibold leading-5">
            Needs Triage
          </span>
        </div>
        
        {complaint.photoUrl && (
          <img 
            src={`${API_URL.replace('/api', '')}${complaint.photoUrl}`} 
            alt="Complaint" 
            className="h-40 w-full object-cover rounded-lg border border-border" 
          />
        )}

        <div className="space-y-1">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Citizen Description</span>
          <p className="text-xs text-foreground leading-relaxed italic">"{complaint.description}"</p>
        </div>

        {/* AI Best Guess */}
        <div className="bg-secondary/5 border border-secondary/10 p-3.5 rounded-lg space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-secondary">
            <Brain className="h-4 w-4" /> AI Best Guess classification
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block text-[9px] text-muted-foreground">Category</span>
              <span className="font-semibold text-foreground capitalize">{complaint.aiCategory?.replace('_', ' ') || 'unknown'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-muted-foreground">Confidence</span>
              <span className="font-semibold text-foreground">
                {complaint.aiConfidence ? `${(complaint.aiConfidence * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-muted-foreground">Severity</span>
              <span className="font-semibold text-foreground capitalize">{complaint.aiSeverity || 'medium'}</span>
            </div>
          </div>
          {complaint.aiDescription && (
            <div className="mt-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground leading-relaxed">
              <strong>Observation:</strong> {complaint.aiDescription}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleConfirm} className="border-t border-border bg-muted/20 p-5 space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground mb-1">Select Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
            >
              <option value="" disabled>Select...</option>
              {departments.map((d: any) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Route to Smart City"
              className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-secondary"
            />
          </div>
        </div>

        <button
          disabled={busy || !selectedDept}
          className="w-full rounded bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
        >
          {busy ? "Routing..." : "Confirm Triage Routing"}
        </button>
      </form>
    </div>
  );
}