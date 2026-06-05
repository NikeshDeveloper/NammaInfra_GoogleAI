/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { TRANSLATIONS } from "../utils/lang.js";
import { Complaint, ComplaintType } from "../types.js";
import { 
  MapPin, 
  Upload, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Phone, 
  User, 
  FileText,
  Eye,
  Camera,
  Layers,
  Award,
  Info,
  CheckCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CitizenPortalProps {
  language: "en" | "ta";
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  fetchComplaints: () => Promise<void>;
}

// Preset high fidelity mock images that correspond to real issues
const PRESET_PHOTOS = [
  {
    id: "pothole",
    name: { en: "Road Pothole", ta: "சாலைப் பள்ளம்" },
    url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    category: "ROADS" as ComplaintType
  },
  {
    id: "sewage",
    name: { en: "Sewage Overflow", ta: "சாக்கடை நீர் தேக்கம்" },
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
    category: "SEWAGE" as ComplaintType
  },
  {
    id: "garbage",
    name: { en: "Garbage Pile", ta: "குப்பை குவியல்" },
    url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    category: "GARBAGE" as ComplaintType
  },
  {
    id: "water_leak",
    name: { en: "Pipe Bursted", ta: "குடிநீர் குழாய் சேதம்" },
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
    category: "WATER" as ComplaintType
  }
];

// Assembly Constituencies, MLAs, Councilors, and Mayoral Leadership mapping
const REPS_BY_WARD: Record<string, { mla: string; mlaReg: string; party: string; phone: string; councilor: string; councilorPhone: string; photo: string }> = {
  "Ward 117 - Adyar": {
    mla: "Thiru Ma. Subramanian",
    mlaReg: "Saidapet MLA (Minister for Health & Family Welfare)",
    party: "DMK",
    phone: "+91 94440 44333",
    councilor: "Tmt. Geetha (Ward 117 Councilor)",
    councilorPhone: "+91 94451 90117",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
  },
  "Ward 123 - Mylapore": {
    mla: "Thiru Dha. Velu",
    mlaReg: "Mylapore Assembly Constituency",
    party: "DMK",
    phone: "+91 98403 55123",
    councilor: "Thiru S. Amirda Varshney (Ward 123 Councilor)",
    councilorPhone: "+91 94451 90123",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200"
  },
  "Ward 136 - Kodambakkam": {
    mla: "Dr. Ezhilan Naganathan",
    mlaReg: "Thousand Lights Assembly Constituency",
    party: "DMK",
    phone: "+91 94444 88136",
    councilor: "Tmt. J. Karunanidhi (Ward 136 Councilor)",
    councilorPhone: "+91 94451 90136",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"
  },
  "Ward 101 - Anna Nagar": {
    mla: "Thiru M. K. Mohan",
    mlaReg: "Anna Nagar Assembly Constituency",
    party: "DMK",
    phone: "+91 98410 10101",
    councilor: "Tmt. Hemalatha (Ward 101 Councilor)",
    councilorPhone: "+91 94451 90101",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
  },
  "Ward 142 - Velachery": {
    mla: "Thiru J. M. H. Aassan Maulaana",
    mlaReg: "Velachery Assembly Constituency",
    party: "INC",
    phone: "+91 99401 14200",
    councilor: "Thiru S. Baliah (Ward 142 Councilor)",
    councilorPhone: "+91 94451 90142",
    photo: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=200"
  },
  "Ward 110 - T. Nagar": {
    mla: "Thiru J. Karunanithi",
    mlaReg: "T. Nagar Assembly Constituency",
    party: "DMK",
    phone: "+91 98400 11042",
    councilor: "Thiru Subash (Ward 110 Councilor)",
    councilorPhone: "+91 94451 90110",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200"
  }
};

export default function CitizenPortal({
  language,
  complaints,
  setComplaints,
  fetchComplaints,
}: CitizenPortalProps) {
  const t = TRANSLATIONS[language];

  // Citizen session/profile state
  const [citizenSession, setCitizenSession] = useState<{ name: string; phone: string } | null>(() => {
    const saved = localStorage.getItem("tcos_citizen_session");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Dual view scope switcher (default to public directory so they see existing complaints, but can filter down)
  const [viewScope, setViewScope] = useState<"MY_REPORTS" | "PUBLIC_DIRECTORY">("PUBLIC_DIRECTORY");

  // Input states for login panel
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");

  // Form states
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState(citizenSession?.name || "");
  const [reporterPhone, setReporterPhone] = useState(citizenSession?.phone || "");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  
  // Custom image file state
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow states
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Live AI-powered RAG Similarity lookup states
  const [ragMatches, setRagMatches] = useState<any[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [followedId, setFollowedId] = useState<string | null>(null);

  // Selected Representative Ward selection state
  const [selectedRepWard, setSelectedRepWard] = useState("Ward 110 - T. Nagar");

  // Keep reporter details in sync with authenticated session
  useEffect(() => {
    if (citizenSession) {
      setReporterName(citizenSession.name);
      setReporterPhone(citizenSession.phone);
    }
  }, [citizenSession]);

  // Dynamic citizen-only filter
  const citizenComplaints = complaints.filter((c) => {
    if (viewScope === "PUBLIC_DIRECTORY") {
      return true; // Admins / public exploration directory map view
    }
    // "One user's complaints should not be visible to another citizen"
    if (!citizenSession) return false;
    return (
      (c.reporterName && c.reporterName.toLowerCase() === citizenSession.name.toLowerCase()) ||
      c.reporterPhone === citizenSession.phone
    );
  });

  // Live RAG database similarity lookup on debounced user description input
  useEffect(() => {
    if (description.trim().length < 12) {
      setRagMatches([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setRagLoading(true);
      try {
        const res = await fetch("/api/complaints/search-similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description })
        });
        if (res.ok) {
          const data = await res.json();
          // Exclude already resolved issues if they aren't useful, but show high overlap
          setRagMatches(data.matches || []);
        }
      } catch (err) {
        console.error("RAG search failed:", err);
      } finally {
        setRagLoading(false);
      }
    }, 750);

    return () => clearTimeout(delayDebounce);
  }, [description]);

  // Action to follow/upvote an existing duplicate complaint
  const handleFollowComplaint = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: reporterName || "Citizen Supporter",
          reporterPhone: reporterPhone || "No Mobile"
        })
      });
      if (res.ok) {
        setFollowedId(complaintId);
        await fetchComplaints();
        setTimeout(() => {
          setFollowedId(null);
          setDescription(""); // Reset search/description box upon successful lock-on
          setRagMatches([]);
        }, 3500);
      }
    } catch (err) {
      console.error("Sourcing follow failed:", err);
    }
  };

  // Trigger HTML5 geolocation
  const handleGPSDetect = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      // Fallback to random Chennai location bounds
      setLatitude(13.04 + (Math.random() - 0.5) * 0.05);
      setLongitude(80.24 + (Math.random() - 0.5) * 0.05);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setGpsLoading(false);
      },
      (error) => {
        console.warn("GPS Permission or signal error, setting fallback Chennai coordinates:", error);
        // Fallback to Chennai center bounds
        setLatitude(13.0425);
        setLongitude(80.2514);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Custom Local File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomImageName(file.name);
    setSelectedPresetId(null); // Clear preset if uploading custom

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Reset form layout
  const resetForm = () => {
    setDescription("");
    setSelectedPresetId(null);
    setCustomImageBase64(null);
    setCustomImageName(null);
    setLatitude(null);
    setLongitude(null);
  };

  // Trigger POST submission to live server
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    // SLA PDF Requirement: Validate inputs (photo is required), show error alerts
    if (!selectedPresetId && !customImageBase64) {
      alert("Photo required - Please upload an incident photo or select a category preset.");
      return;
    }

    if (!latitude || !longitude) {
      alert("Location not found – please pick on map or click 'Get Geolocation' to tag coordinates.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);

    // Get image source (preset or custom upload)
    let finalImageUrl = null;
    let finalBase64 = null;

    if (customImageBase64) {
      finalBase64 = customImageBase64;
    } else if (selectedPresetId) {
      const preset = PRESET_PHOTOS.find((p) => p.id === selectedPresetId);
      if (preset) {
        finalImageUrl = preset.url;
      }
    }

    try {
      const payload = {
        description,
        reporterName: reporterName || "Anonymous Citizen",
        reporterPhone: reporterPhone || "+91 Mobile Unspecified",
        latitude: latitude,
        longitude: longitude,
        imageUrl: finalImageUrl,
        imageBase64: finalBase64
      };

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("HTTP dispatch error from server-side.");
      }

      await fetchComplaints();
      setSuccessMessage(t.successReport);
      resetForm();

      // Clear success notification after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to connect with server AI dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit feedback rating / close out issue
  const handleSendFeedback = async (complaintId: string, rating: "THUMBS_UP" | "THUMBS_DOWN", comments: string) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId,
          rating,
          comments,
          userId: citizenSession?.name || "Citizen"
        })
      });
      if (res.ok) {
        await fetchComplaints();
        // Dynamic state update for active accordion view sync
        const freshList = await fetch("/api/complaints").then(r => r.json());
        if (Array.isArray(freshList)) {
          setComplaints(freshList);
          const matched = freshList.find(c => c.id === complaintId);
          if (matched) {
            setSelectedComplaint(matched);
          }
        }
      }
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
  };

  // Preset Selection Click
  const selectPreset = (id: string) => {
    setSelectedPresetId(id);
    setCustomImageBase64(null);
    setCustomImageName(null);
  };

  const repData = REPS_BY_WARD[selectedRepWard];

  return (
    <div className="space-y-6">
      
      {/* ELECTED REPRESENTATIVES & LEADERSHIP DESK */}
      <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#cca510]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 border-b border-[#262626]/60 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-[#cca510]" />
              Elected Representatives & Leadership Desk
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Chennai Municipal & Assembly Leaders responsible for legislative policies, city development budgets and civic oversight.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">Select Ward:</span>
            <select
              value={selectedRepWard}
              onChange={(e) => setSelectedRepWard(e.target.value)}
              className="rounded-xl border border-[#262626] bg-[#050505] p-2 text-xs font-semibold text-white focus:border-[#cca510]/50 focus:outline-none"
            >
              {Object.keys(REPS_BY_WARD).map((wName) => (
                <option key={wName} value={wName}>{wName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* MAYOR OF CHENNAI (CONSTANT) */}
          <div className="rounded-2xl border border-[#262626] bg-[#050505] p-4 flex gap-4 items-center">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
              alt="Mayor of Chennai"
              referrerPolicy="no-referrer"
              className="h-16 w-16 min-w-16 rounded-full object-cover border border-[#cca510]/30"
            />
            <div className="min-w-0">
              <span className="inline-block bg-[#cca510]/10 text-[#cca510] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1">
                Chennai Mayor
              </span>
              <h3 className="text-xs font-bold text-white truncate">Tmt. Priya Rajan, M.Tech</h3>
              <p className="text-[10px] text-slate-400 leading-tight">Chief Mayor, Greater Chennai Corporation (GCC)</p>
              <p className="text-[9px] text-[#cca510] font-mono mt-1.5 select-all">+91 44 2538 4510</p>
            </div>
          </div>

          {/* ASSEMBLY constituency MLA */}
          <div className="rounded-2xl border border-[#262626] bg-[#050505] p-4 flex gap-4 items-center">
            <img
              src={repData.photo}
              alt={repData.mla}
              referrerPolicy="no-referrer"
              className="h-16 w-16 min-w-16 rounded-full object-cover border border-[#cca510]/30"
            />
            <div className="min-w-0">
              <span className="inline-block bg-[#cca510]/10 text-[#cca510] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1">
                Assembly MLA ({repData.party})
              </span>
              <h3 className="text-xs font-bold text-white truncate">{repData.mla}</h3>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{repData.mlaReg}</p>
              <p className="text-[9px] text-[#cca510] font-mono mt-1.5 select-all">{repData.phone}</p>
            </div>
          </div>

          {/* WARD COUNCILOR */}
          <div className="rounded-2xl border border-[#262626] bg-[#050505] p-4 flex gap-4 items-center sm:col-span-2 lg:col-span-1">
            <div className="h-16 w-16 min-w-16 rounded-full bg-[#111111] border border-[#262626] flex items-center justify-center text-[#cca510]">
              <Award className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <span className="inline-block bg-[#cca510]/10 text-[#cca510] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 border border-[#cca510]/25">
                Ward Representative
              </span>
              <h3 className="text-xs font-bold text-white truncate">{repData.councilor}</h3>
              <p className="text-[10px] text-slate-400 leading-tight">Elected Councilor, GCC Council</p>
              <p className="text-[9px] text-[#cca510] font-mono mt-1.5 select-all">{repData.councilorPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CITIZEN OPERATIONAL SPACE & VERIFIED SIGN-IN */}
      <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6 relative overflow-hidden font-mono text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-[#cca510]" />
              Citizen Secure Profile Space
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Authenticate via Name and Phone to bind submissions securely and enforce complete isolation, meeting the data privacy SLA guidelines.
            </p>
          </div>

          {citizenSession ? (
            <div className="flex items-center gap-3 bg-[#050505] p-3 rounded-2xl border border-emerald-500/20">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="text-left font-mono">
                <p className="text-xs font-bold text-white leading-none">{citizenSession.name}</p>
                <p className="text-[9px] text-slate-500 mt-1 leading-none">{citizenSession.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("tcos_citizen_session");
                  setCitizenSession(null);
                  setViewScope("PUBLIC_DIRECTORY");
                }}
                className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 text-xs font-semibold font-sans transition-all cursor-pointer"
              >
                Disconnect Profile
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="login-name-field"
                type="text"
                placeholder="Full Name"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="rounded-xl border border-[#262626] bg-[#050505] px-3.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none font-sans"
              />
              <input
                id="login-phone-field"
                type="text"
                placeholder="Phone (e.g. +91 9444)"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="rounded-xl border border-[#262626] bg-[#050505] px-3.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!loginName.trim() || !loginPhone.trim()) {
                    alert("Please enter both Name and Phone details to verify session.");
                    return;
                  }
                  const session = { name: loginName.trim(), phone: loginPhone.trim() };
                  localStorage.setItem("tcos_citizen_session", JSON.stringify(session));
                  setCitizenSession(session);
                  setViewScope("MY_REPORTS");
                }}
                className="rounded-xl bg-[#cca510] hover:bg-[#a37c0b] text-black px-4 py-1.5 text-xs font-bold uppercase transition-all tracking-wider font-sans cursor-pointer"
              >
                Access Profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      
      {/* LEFT COLUMN: QUICK REPORT ISSUES */}
      <div className="lg:col-span-7">
        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6 md:p-8 text-left">
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#cca510]" />
              {t.reportIssueTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{t.reportIssueDesc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contact Information Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-[#cca510]" />
                  {t.fullName}
                </label>
                <input
                  id="reporter-name-input"
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  disabled={!!citizenSession}
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none ${
                    citizenSession ? "border-emerald-500/20 bg-emerald-500/5 text-slate-300 font-bold" : "border-[#262626] bg-[#050505]"
                  }`}
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-[#cca510]" />
                  {t.phone}
                </label>
                <input
                  id="reporter-phone-input"
                  type="text"
                  placeholder="e.g. +91 94440 98765"
                  disabled={!!citizenSession}
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none ${
                    citizenSession ? "border-emerald-500/20 bg-emerald-500/5 text-slate-300 font-bold" : "border-[#262626] bg-[#050505]"
                  }`}
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-[#cca510]" />
                {t.descriptionLabel} <span className="text-[#cca510]">*</span>
              </label>
              <textarea
                id="complaint-desc-textarea"
                required
                rows={4}
                placeholder={t.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-[#262626] bg-[#050505] p-3.5 text-sm text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none"
              />
            </div>

            {/* Live AI-Powered RAG Similar Cases Detector */}
            {ragLoading && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-slate-400 text-2xs font-mono">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#cca510]" />
                RAG SECURE INDEX: Analysing historical records for semantic incident overlapping...
              </div>
            )}

            <AnimatePresence>
              {ragMatches.length > 0 && !ragLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 overflow-hidden text-left"
                >
                  <div className="flex items-start gap-2 text-amber-500">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-2xs font-bold uppercase tracking-wider text-[#cca510]">
                        RAG Guard: Overlapping Civic Issues Detected
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Our semantic matching agent identified potential duplicates. To speed up municipal dispatch, you can co-sign an existing filing to increase its resolution priority rather than filing again!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ragMatches.map((match: any) => {
                      const fullComplaint = complaints.find(c => c.id === match.id);
                      if (!fullComplaint) return null;
                      
                      const isFollowed = followedId === match.id;

                      return (
                        <div
                          key={match.id}
                          className="rounded-xl border border-[#262626] bg-[#050505] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#cca510]">
                                {match.id}
                              </span>
                              <span className="rounded bg-[#cca510]/10 border border-[#cca510]/30 px-1.5 py-0.5 text-[8px] font-mono font-bold text-[#cca510] uppercase">
                                {match.similarity} Overlap
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                Supporters: {fullComplaint.followersCount || 1}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono bg-[#111111] px-1 py-0.2 rounded">
                                Assigned to: {fullComplaint.assignedOfficer || "Pending Dispatch"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {fullComplaint.description}
                            </p>
                            <p className="text-[9px] text-slate-500 italic mt-1 leading-none font-mono">
                              Match reason: {match.reason}
                            </p>
                          </div>

                          <button
                            id={`follow-rag-btn-${match.id}`}
                            type="button"
                            disabled={isFollowed}
                            onClick={() => handleFollowComplaint(match.id)}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:self-center ${
                              isFollowed
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-[#cca510] hover:bg-[#a37c0b] text-black"
                            }`}
                          >
                            {isFollowed ? (
                              <>
                                <CheckCheck className="h-3.5 w-3.5" />
                                Co-Signed
                              </>
                            ) : (
                              <>
                                <Layers className="h-3.5 w-3.5" />
                                Co-Sign Issue
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {followedId && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2.5 text-emerald-400 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-bold">Citizen Backing Registered</p>
                        <p className="text-[10px] text-emerald-500/80 mt-0.5">Your co-sign escalates the SLA tracker and merges duplicate dispatch crews!</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo Attachment Options */}
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {t.imageSimTitle}
              </label>
              
              {/* Preset civic scenarios */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
                {PRESET_PHOTOS.map((photo) => (
                  <button
                    id={`preset-photo-${photo.id}`}
                    key={photo.id}
                    type="button"
                    onClick={() => selectPreset(photo.id)}
                    className={`relative overflow-hidden rounded-xl border p-1 text-left transition-all ${
                      selectedPresetId === photo.id
                        ? "border-[#cca510] bg-[#cca510]/10 scale-95"
                        : "border-[#262626] bg-[#111111]/80 hover:border-slate-700"
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name.en}
                      referrerPolicy="no-referrer"
                      className="h-16 w-full rounded-lg object-cover"
                    />
                    <div className="mt-1.5 px-1">
                      <p className="truncate text-[10px] font-medium text-slate-300">
                        {language === "en" ? photo.name.en : photo.name.ta}
                      </p>
                      <p className="text-[8px] font-mono tracking-widest text-[#cca510] uppercase">
                        {photo.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Image Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  customImageBase64 
                    ? "border-emerald-500 bg-emerald-500/5" 
                    : "border-[#262626] bg-[#111111]/80 hover:border-[#cca510]/30"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                {customImageBase64 ? (
                  <div className="flex items-center gap-3">
                    <img 
                      src={customImageBase64} 
                      alt="Custom preview" 
                      className="h-12 w-12 rounded-lg object-cover border border-emerald-500/50"
                    />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-emerald-400">File Armed for AI Scan</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px] font-mono">{customImageName}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                    <p className="text-[11px] font-medium text-slate-300">{t.imageSimDesc}</p>
                    <p className="text-[9px] text-slate-500 mt-1">supports standard images up to 5MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Coordinates / GPS Row */}
            <div className="rounded-2xl bg-[#050505] p-4 border border-[#262626]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#cca510]" />
                    Incident Coordinates Mapping
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click Geolocation to capture coordinates, or defaults to central precinct.
                  </p>
                </div>
                
                <button
                  id="gps-detect-btn"
                  type="button"
                  disabled={gpsLoading}
                  onClick={handleGPSDetect}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#cca510] hover:bg-[#a37c0b] disabled:bg-slate-800 text-black px-4 py-1.5 text-xs font-bold tracking-wide transition-all"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3" />
                      {t.getGeoLocation}
                    </>
                  )}
                </button>
              </div>

              {latitude && longitude && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#262626] pt-3">
                  <div className="rounded-xl bg-[#111111] px-3 py-1.5 border border-[#262626] font-mono text-[11px] text-slate-300">
                    <span className="text-slate-500 font-bold uppercase text-[9px] block mb-0.5">{t.latitude}</span>
                    {latitude}
                  </div>
                  <div className="rounded-xl bg-[#111111] px-3 py-1.5 border border-[#262626] font-mono text-[11px] text-slate-300">
                    <span className="text-slate-500 font-bold uppercase text-[9px] block mb-0.5">{t.longitude}</span>
                    {longitude}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Submit */}
            <button
              id="report-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-black py-3 text-sm font-black tracking-wider uppercase transition-all shadow-lg hover:shadow-yellow-500/10 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  {t.processingAI}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-black" />
                  {t.submitReport}
                </>
              )}
            </button>
          </form>

          {/* Real-time Status Alert banner */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2.5 text-emerald-400"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN: REPORTEE HISTORY & OPERATIONS TIMELINE */}
      <div className="lg:col-span-5">
        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6 h-full flex flex-col text-left">
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#cca510]" />
              {t.activeComplaints}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Select any logged file to display AI routing logs and work crew SLA details.
            </p>
          </div>

          {/* SLA Directory Switcher (Isolates reports strictly per session) */}
          <div className="flex gap-2 p-1 bg-[#050505] rounded-xl border border-[#262626] mb-4 font-mono">
            <button
              id="scope-public-btn"
              type="button"
              onClick={() => setViewScope("PUBLIC_DIRECTORY")}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer uppercase ${
                viewScope === "PUBLIC_DIRECTORY"
                  ? "bg-[#cca510] text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Public Directory
            </button>
            <button
              id="scope-my-btn"
              type="button"
              onClick={() => {
                if (!citizenSession) {
                  alert("Please authenticate using the Citizen Secure Profile Space login card above!");
                  return;
                }
                setViewScope("MY_REPORTS");
              }}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer uppercase flex items-center justify-center gap-1 ${
                viewScope === "MY_REPORTS"
                  ? "bg-[#cca510] text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              My Reports {citizenSession ? `(${complaints.filter(c => (c.reporterName && c.reporterName.toLowerCase() === citizenSession.name.toLowerCase()) || c.reporterPhone === citizenSession.phone).length})` : ""}
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] flex-1 pr-1">
            {citizenComplaints.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#262626] p-8 text-center text-slate-500 font-mono">
                <FileText className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                <p className="text-xs">{viewScope === "MY_REPORTS" ? "No reports found under your authenticated profile." : t.noActiveComplaints}</p>
                {viewScope === "MY_REPORTS" && (
                  <p className="text-[10px] text-slate-600 mt-1.5 pb-1 font-sans">Submit an incident using the form on the left to verify active tracking!</p>
                )}
              </div>
            ) : (
              citizenComplaints.map((complaint) => {
                const isSelected = selectedComplaint?.id === complaint.id;
                
                // Calculate dynamic age since declaration in hours/days (SLA Monitoring requirement)
                const createdDate = new Date(complaint.createdAt).getTime();
                const diffMs = Date.now() - createdDate;
                const diffHrs = Math.max(1, Math.round(diffMs / (3600 * 1000)));
                const daysOpen = Math.floor(diffHrs / 24);
                const ageLabel = daysOpen > 0 ? `${daysOpen}d ${diffHrs % 24}h open` : `${diffHrs}h open`;
                const isOverdue = complaint.status !== "RESOLVED" && diffHrs > complaint.expectedHours;

                return (
                  <div
                    id={`citation-card-${complaint.id}`}
                    key={complaint.id}
                    className={`rounded-2xl border transition-all text-left overflow-hidden ${
                      isSelected 
                        ? "border-[#cca510] bg-[#cca510]/5 shadow-md shadow-amber-500/5" 
                        : "border-[#262626] bg-[#111111]/80 hover:border-slate-700 hover:bg-[#111111]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedComplaint(isSelected ? null : complaint)}
                      className="w-full p-4 flex items-start gap-3 text-left"
                    >
                      <div className="shrink-0 pt-0.5">
                        {complaint.status === "PENDING" && (
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                        )}
                        {complaint.status === "IN_PROGRESS" && (
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {complaint.status === "RESOLVED" && (
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-[#cca510]">
                            {complaint.id}
                          </span>
                          <span className="rounded bg-[#050505] px-2 py-0.5 text-[9px] font-bold text-slate-300 border border-[#262626]">
                            {complaint.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {complaint.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono border-t border-[#262626]/40 pt-2.5">
                          <span>{complaint.wardName}</span>
                          
                          {/* SLA Exceeded highlight badge */}
                          {isOverdue ? (
                            <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                              OVERDUE ⚠️ ({ageLabel})
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400 bg-[#050505] border border-[#262626] px-1.5 py-0.5 rounded">
                              {ageLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expandable SLA & AI Operations Details */}
                    {isSelected && (
                      <div className="px-4 pb-4 border-t border-[#262626] bg-[#050505] space-y-3 text-xs leading-relaxed pt-3">
                        {/* Dynamic Action items and classification information */}
                        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#262626] font-mono text-[10px] space-y-1.5 text-slate-300">
                          <div className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            AI Incident Report
                          </div>
                          <p className="text-slate-400">{complaint.aiClassification}</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#262626] text-[11px] space-y-1 text-slate-300">
                          <span className="text-[#cca510] font-semibold block">{t.actionPlan}:</span>
                          <p className="whitespace-pre-line text-slate-400 font-mono text-2xs leading-normal">
                            {complaint.recommendedAction}
                          </p>
                        </div>

                        {/* Assigned Handlers (Pending with) */}
                        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#262626] text-[11px] space-y-1.5 text-slate-300 text-left">
                          <span className="text-[#cca510] font-bold flex items-center gap-1.5 uppercase text-2xs tracking-wider font-mono">
                            <User className="h-3.5 w-3.5" />
                            Assigned Handlers (Pending With)
                          </span>
                          <div className="flex flex-col leading-tight select-all">
                            <p className="text-xs font-semibold text-white">{complaint.assignedOfficer || "Chief Zonal Engineer (GCC)"}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{complaint.assignedDept || "Chennai Public Works & Engineering Department"}</p>
                          </div>
                        </div>

                        {/* Co-Signing Citizens List */}
                        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#cca510]/20 text-[11px] flex items-center justify-between gap-3 text-slate-300">
                          <span className="text-slate-400 font-medium">Verified Backers (Followers count):</span>
                          <span className="font-mono font-bold bg-[#cca510]/10 text-[#cca510] hover:bg-[#cca510]/20 border border-[#cca510]/20 px-2 py-0.5 rounded text-2xs">
                            {complaint.followersCount || 1} Citizens Co-Signed
                          </span>
                        </div>

                        {/* Status timeline parameters */}
                        <div className="flex items-center justify-between gap-3 text-[10px] bg-[#111111] p-2 rounded-lg border border-[#262626]">
                          <span className="text-slate-400 font-medium">Status:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[9px] ${
                            complaint.status === "PENDING" ? "bg-red-500/10 text-red-100 border border-red-500/30" :
                            complaint.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-100 border border-amber-500/30" :
                            "bg-emerald-500/10 text-emerald-100 border border-emerald-500/30"
                          }`}>
                            {complaint.status === "PENDING" ? t.statusPending :
                             complaint.status === "IN_PROGRESS" ? t.statusInProgress :
                             t.statusResolved}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-[10px] bg-[#111111] p-2 rounded-lg border border-[#262626]">
                          <span className="text-slate-400 font-medium">{t.expectedResolution}:</span>
                          <span className="font-bold font-mono text-white">
                            {complaint.expectedHours} {t.hours}
                          </span>
                        </div>

                        {/* Image Preview (Before / After resolution) */}
                        {(complaint.imageUrl || complaint.resolvedImageUrl) && (
                          <div className="space-y-1.5">
                            <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wide block">
                              {t.beforeAfterTitle}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {/* Before Image */}
                              <div>
                                <span className="text-[9px] text-slate-500 font-mono block mb-0.5">{t.before}</span>
                                {complaint.imageUrl ? (
                                  <img
                                    src={complaint.imageUrl === "base64_captured" ? customImageBase64 || "" : complaint.imageUrl}
                                    alt="Before report"
                                    referrerPolicy="no-referrer"
                                    className="h-20 w-fit max-w-full rounded-lg object-cover border border-[#262626]"
                                  />
                                ) : (
                                  <div className="h-20 rounded-lg bg-[#111111] border border-[#262626] flex items-center justify-center text-slate-600 text-[10px]">
                                    No Image Provided
                                  </div>
                                )}
                              </div>
                              
                              {/* After Image */}
                              <div>
                                <span className="text-[9px] text-[#cca510] font-mono block mb-0.5">{t.after}</span>
                                {complaint.status === "RESOLVED" && complaint.resolvedImageUrl ? (
                                  <img
                                    src={complaint.resolvedImageUrl}
                                    alt="After restoration"
                                    referrerPolicy="no-referrer"
                                    className="h-20 w-fit max-w-full rounded-lg object-cover border border-[#cca510]/30"
                                  />
                                ) : (
                                  <div className="h-20 rounded-lg bg-[#111111] border border-[#262626] border-dashed flex items-center justify-center text-slate-600 text-[10px] text-center">
                                    Awaiting Resolution
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {complaint.officialRemarks && (
                              <div className="mt-2 p-2 bg-emerald-950/20 rounded-lg border border-emerald-500/10 text-[10px] text-slate-300 leading-snug">
                                <span className="font-bold text-[#cca510] block mb-0.5">Official Remarks:</span>
                                "{complaint.officialRemarks}"
                              </div>
                            )}

                            {/* CITIZEN RESOLUTION FEEDBACK WORKSPACE */}
                            {complaint.status === "RESOLVED" && (
                              <div className="mt-3 p-3 bg-[#0a0a0a]/50 rounded-xl border border-[#262626] space-y-2.5 text-left font-mono">
                                <div className="flex items-center gap-1.5 border-b border-[#262626] pb-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                  <span className="font-bold text-slate-300 text-2xs uppercase tracking-wider">Citizen Resolution Survey</span>
                                </div>

                                {complaint.feedbackRating ? (
                                  <div className="space-y-1">
                                    <p className="text-2xs uppercase tracking-tight text-emerald-400 font-bold">Feedback Confirmed ✓</p>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xl">{complaint.feedbackRating === "THUMBS_UP" ? "👍" : "👎"}</span>
                                      <span className="text-xs text-white font-semibold font-sans">
                                        {complaint.feedbackRating === "THUMBS_UP" ? "Thumbs Up - Highly Satisfied" : "Thumbs Down - Unsatisfied"}
                                      </span>
                                    </div>
                                    {complaint.feedbackComments && (
                                      <p className="text-slate-400 text-2xs italic mt-1 font-sans bg-[#050505] p-2 rounded-lg border border-[#262626]">
                                        "{complaint.feedbackComments}"
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-2xs text-slate-400 font-sans leading-relaxed">
                                      Please rate this resolution. Submitting updates publishes citizen feedback to the official ledger index.
                                    </p>
                                    <div className="flex gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSendFeedback(complaint.id, "THUMBS_UP", "")}
                                        className="flex-1 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-2xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                                      >
                                        👍 Thumbs Up
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendFeedback(complaint.id, "THUMBS_DOWN", "")}
                                        className="flex-1 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-2xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                                      >
                                        👎 Thumbs Down
                                      </button>
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                      <input
                                        id={`feedback-comments-input-${complaint.id}`}
                                        type="text"
                                        placeholder="Type details and press enter..."
                                        className="w-full rounded-lg border border-[#262626] bg-[#050505] px-2.5 py-1.5 text-2xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none"
                                        onKeyDown={async (e) => {
                                          if (e.key === "Enter") {
                                            const commentVal = (e.target as HTMLInputElement).value;
                                            if (!commentVal.trim()) return;
                                            await handleSendFeedback(complaint.id, "THUMBS_UP", commentVal.trim());
                                          }
                                        }}
                                      />
                                      <p className="text-[8px] text-slate-500 font-sans">Press ENTER inside input block to publish text as Thumbs Up.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  </div>
  );
}
