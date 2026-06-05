/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TRANSLATIONS } from "../utils/lang.js";
import { Complaint, WardLeaderboardItem, ComplaintStatus, ComplaintType } from "../types.js";
import { 
  Shield, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Award, 
  Search, 
  Activity, 
  ChevronRight, 
  CornerDownRight, 
  PenTool,
  CheckCircle2,
  Trash2,
  User,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CommandCenterProps {
  language: "en" | "ta";
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  fetchComplaints: () => Promise<void>;
}

// Bounding box mapping for Chennai region to SVG coordinates
const minLat = 12.95;
const maxLat = 13.10;
const minLng = 80.20;
const maxLng = 80.29;

const mapCoordsToSvg = (lat: number, lng: number) => {
  const x = ((lng - minLng) / (maxLng - minLng)) * 400 + 50; // map with padding
  const y = 400 - (((lat - minLat) / (maxLat - minLat)) * 340 + 30);
  return { x, y };
};

// Preset Ward polygons coordinates to render a tactical district Map representation
const WARD_POLYGONS = [
  {
    name: "Ward 101 - Anna Nagar",
    color: "#e2e8f0",
    points: "100,50 200,60 180,150 120,160 80,120",
    centerX: 140,
    centerY: 100
  },
  {
    name: "Ward 110 - T. Nagar",
    color: "#cbd5e1",
    points: "180,150 280,160 250,250 200,240 160,200",
    centerX: 210,
    centerY: 200
  },
  {
    name: "Ward 117 - Adyar",
    color: "#94a3b8",
    points: "200,240 300,250 260,350 160,360 170,290",
    centerX: 220,
    centerY: 300
  },
  {
    name: "Ward 123 - Mylapore",
    color: "#64748b",
    points: "280,160 380,170 340,280 300,250",
    centerX: 310,
    centerY: 210
  },
  {
    name: "Ward 142 - Velachery",
    color: "#475569",
    points: "160,360 260,350 220,440 120,430 110,380",
    centerX: 180,
    centerY: 390
  }
];

export default function CommandCenter({
  language,
  complaints,
  setComplaints,
  fetchComplaints,
}: CommandCenterProps) {
  const t = TRANSLATIONS[language];

  // Official Identity Authentication States
  const [official, setOfficial] = useState<{ name: string; username: string; role: string } | null>(() => {
    const saved = localStorage.getItem("tn_civic_official_session");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Operational Subtabs ("map_and_issues" or "audit_logs")
  const [activeSubTab, setActiveSubTab] = useState<"map_and_issues" | "audit_logs">("map_and_issues");

  // Audit Logs Store
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");

  // Component state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [leaderboard, setLeaderboard] = useState<WardLeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  
  // Status action states
  const [officialRemarks, setOfficialRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Audit Logs history
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error("Audit lookup failure:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (official) {
      fetchAuditLogs();
    }
  }, [official, complaints]);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      if (res.ok) {
        const data = await res.json();
        setOfficial(data.user);
        localStorage.setItem("tn_civic_official_session", JSON.stringify(data.user));
        setUsernameInput("");
        setPasswordInput("");
      } else {
        const data = await res.json();
        setAuthError(data.error || "Authentication rejected. Invalid credentials.");
      }
    } catch (err) {
      setAuthError("Failed to connect with Ministry Auth server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setOfficial(null);
    localStorage.removeItem("tn_civic_official_session");
  };

  // Fetch Leaderboard on load
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error("Failed to load ward leaderboards:", e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [complaints]);

  // Update Status via Server API
  const handleUpdateStatus = async (status: ComplaintStatus) => {
    if (!selectedComplaint) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          officialRemarks,
          actor: official?.name || "Gov Official"
        })
      });

      if (res.ok) {
        const updated = await res.json();
        // Update local list state
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedComplaint(updated);
        setOfficialRemarks("");
        await fetchComplaints();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
      alert("Fail to authenticate status transition.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats Counters
  const totalAlerts = complaints.length;
  const pendingCount = complaints.filter(c => c.status === "PENDING").length;
  const inProgressCount = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const resolvedCount = complaints.filter(c => c.status === "RESOLVED").length;
  
  const avgSlaVal = leaderboard.length > 0 
    ? (leaderboard.reduce((acc, curr) => acc + curr.avgResolutionHours, 0) / leaderboard.length).toFixed(1)
    : "5.4";

  // Filter complaints list
  const filteredComplaints = complaints.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.id.toLowerCase().includes(term) ||
      c.type.toLowerCase().includes(term) ||
      c.wardName.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );
  });

  if (!official) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 md:p-8 rounded-3xl border border-[#262626] bg-[#0a0a0a] shadow-2xl relative overflow-hidden text-left font-sans">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#cca510]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#cca510]/10 flex items-center justify-center text-[#cca510] mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-extrabold text-white">Government Official Portal</h2>
          <p className="text-xs text-slate-400 mt-1 pb-1">
            Tamil Nadu Civic Operating System (TCOS) Municipal Authority Secure Authentication
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono font-bold">
              Official Email/ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. tngov_official"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono font-bold">
              Operational Keycode
            </label>
            <input
              type="password"
              required
              placeholder="e.g. chennai2026"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none font-mono"
            />
          </div>

          {authError && (
            <div className="p-3 text-2xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-mono leading-relaxed">
              ⚠️ {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#cca510] hover:bg-[#a37c0b] disabled:bg-slate-800 text-black py-2.5 text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer"
          >
            {authLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Interrogating Gate...
              </>
            ) : (
              "Sign In to Command Console"
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[#262626]/80 pt-4 text-left font-sans">
          <p className="text-[10px] uppercase font-bold text-[#cca510]/80 tracking-wider font-mono">Demo Testing Credentials:</p>
          <div className="grid grid-cols-1 gap-2 mt-2 font-mono">
            <div className="p-2 bg-[#111111] rounded-lg border border-[#262626] text-[10px] text-slate-400">
              <span className="text-white font-bold block">GCC Chief Engineer Account</span>
              ID: <span className="text-[#cca510] font-bold select-all">tngov_official</span> • Key: <span className="text-[#cca510] font-bold font-sans">chennai2026</span>
            </div>
            <div className="p-2 bg-[#111111] rounded-lg border border-[#262626] text-[10px] text-slate-400">
              <span className="text-white font-bold block">Regional Assistant commissioner</span>
              ID: <span className="text-[#cca510] font-bold select-all">subdivision_officer</span> • Key: <span className="text-[#cca510] font-bold font-sans text-xs">tngov_pwd</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Official Session Details & Tab Swapper */}
      <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#cca510]/10 border border-[#cca510]/20 flex items-center justify-center text-[#cca510]">
            <Shield className="h-5 w-5 font-bold" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
              {official.name}
              <span className="text-[8px] tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded font-mono font-black">
                Verified Civic Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">Precinct Central Command • tcos://{official.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("map_and_issues")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeSubTab === "map_and_issues"
                ? "bg-[#cca510] text-black font-bold shadow"
                : "bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 border border-[#262626]"
            }`}
          >
            🛠️ Operational Dispatch Map
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSubTab("audit_logs")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeSubTab === "audit_logs"
                ? "bg-[#cca510] text-black font-bold shadow"
                : "bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 border border-[#262626]"
            }`}
          >
            📜 Secure Audit Ledger ({auditLogs.length})
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl text-2xs font-bold tracking-wide bg-gradient-to-r from-red-950/20 to-red-900/20 hover:from-red-950/40 hover:to-red-900/40 text-red-400 border border-red-500/20 transition-all cursor-pointer font-mono uppercase"
          >
            Logout
          </button>
        </div>
      </div>
      
      {activeSubTab === "map_and_issues" ? (
        <div className="space-y-6">
      
      {/* 1. TOP STATS BAR WITH NEON ACCENTS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        
        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 shadow-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.statsTotalCount}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-display md:text-3xl">{totalAlerts}</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Live Node</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 shadow-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.statsPendingCount}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-500 font-display md:text-3xl">{pendingCount}</span>
            <span className="text-[10px] font-mono text-red-400/80 animate-pulse">Awaiting</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-500" 
              style={{ width: `${totalAlerts > 0 ? (pendingCount / totalAlerts) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 shadow-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.statsInProgCount}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-display md:text-3xl">{inProgressCount}</span>
            <span className="text-[10px] font-mono text-amber-300">Active</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 transition-all duration-500" 
              style={{ width: `${totalAlerts > 0 ? (inProgressCount / totalAlerts) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 shadow-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.statsResolvedCount}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500 font-display md:text-3xl">{resolvedCount}</span>
            <span className="text-[10px] font-mono text-emerald-400">Closed</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${totalAlerts > 0 ? (resolvedCount / totalAlerts) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="col-span-2 rounded-3xl border border-[#262626] bg-[#0a0a0a] p-4 shadow-md md:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-[#cca510] font-bold">{t.avgResolution}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-display md:text-3xl">{avgSlaVal}</span>
            <span className="text-[10px] font-mono text-slate-400">hours</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-[#cca510]" style={{ width: "90%" }} />
          </div>
        </div>

      </div>

      {/* 2. MAIN SPLIT GRID: REAL-TIME TACTICAL MAP & CONTROL CONSOLE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* MAP PANEL (LEFT - 5 COLS) */}
        <div className="lg:col-span-5 rounded-3xl border border-[#262626] bg-[#0a0a0a] p-5 flex flex-col min-h-[480px]">
          <div>
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#cca510]" />
              {t.mapViewTitle}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.mapViewSubtitle}</p>
          </div>

          <div className="relative flex-1 rounded-2xl border border-[#262626] bg-[#050505] mt-4 overflow-hidden flex items-center justify-center p-2 min-h-[350px]">
            {/* Tactical Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            
            {/* Custom SVG Geospatial Map of Chennai wards */}
            <svg 
              viewBox="0 0 500 450" 
              className="w-full h-full max-w-[400px] max-h-[360px] z-10 transition-transform duration-300"
            >
              {/* Draw Ward boundaries */}
              <g className="opacity-40 stroke-slate-800 stroke-[1.5] fill-none">
                {WARD_POLYGONS.map((ward, i) => (
                  <polygon
                    id={`ward-poly-${i}`}
                    key={ward.name}
                    points={ward.points}
                    className="hover:opacity-85 hover:fill-slate-950/40 transition-all cursor-pointer"
                    title={ward.name}
                  />
                ))}
              </g>

              {/* Draw Ward labels on Map */}
              {WARD_POLYGONS.map((ward) => (
                <text
                  key={`lbl-${ward.name}`}
                  x={ward.centerX}
                  y={ward.centerY}
                  textAnchor="middle"
                  className="fill-slate-500 text-[8px] font-mono tracking-tighter uppercase pointer-events-none select-none font-semibold"
                >
                  {ward.name.split("-")[1]?.trim()}
                </text>
              ))}

              {/* Render dynamic coordinates pins for reported complaints */}
              {complaints.map((c) => {
                const { x, y } = mapCoordsToSvg(c.latitude, c.longitude);
                const isSelected = selectedComplaint?.id === c.id;
                
                // Pin color mapping
                let pinColor = "#ef4444"; // pending
                if (c.status === "IN_PROGRESS") pinColor = "#fbbf24"; // active yellow
                else if (c.status === "RESOLVED") pinColor = "#10b981"; // green

                return (
                  <g 
                    key={c.id} 
                    className="cursor-pointer z-20 group"
                    onClick={() => setSelectedComplaint(c)}
                  >
                    {/* Ripple/Pulse Ring effect around active or high severity alerts */}
                    {c.status !== "RESOLVED" && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 10 : 6}
                        fill={pinColor}
                        opacity={0.25}
                        className="animate-ping"
                        style={{ animationDuration: isSelected ? "1.5s" : "2s" }}
                      />
                    )}

                    {/* Core interactive Map pin */}
                    <circle
                      id={`pin-node-${c.id}`}
                      cx={x}
                      cy={y}
                      r={isSelected ? 6 : 4}
                      fill={pinColor}
                      stroke={isSelected ? "#ffffff" : pinColor}
                      strokeWidth={isSelected ? 1.5 : 0}
                      className="transition-all duration-300 group-hover:scale-125"
                    />

                    {/* Floating label box on hover */}
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      className="fill-slate-200 text-[6px] font-mono bg-black opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out font-bold uppercase tracking-wide"
                    >
                      {c.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Compass HUD decoration */}
            <div className="absolute bottom-2.5 right-2.5 font-mono text-[8px] text-slate-500 select-none pointer-events-none border border-[#262626] p-1.5 rounded-lg bg-[#050505]/80">
              HUD CALIBRATION: ONLINE<br />
              SYS RESOLUTION: ± 1.2M
            </div>
            
            <div className="absolute top-2.5 left-2.5 font-mono text-[8px] text-slate-500 bg-[#050505]/80 px-2 py-1.5 rounded-lg flex flex-col gap-1 select-none pointer-events-none border border-[#262626]">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> {t.statusPending}</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" /> {t.statusInProgress}</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> {t.statusResolved}</div>
            </div>
          </div>
        </div>
        {/* COMPLAINTS DISPATCH CONSOLE LIST (RIGHT - 7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-5 flex flex-col flex-1 min-h-[480px]">
            {/* Search Filter Head */}
            <div className="flex flex-col gap-3 min-w-0 md:flex-row md:items-center md:justify-between border-b border-[#262626] pb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#cca510]" />
                  Operations Control Console
                </h3>
              </div>
              
              <div className="relative max-w-full md:max-w-xs flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  id="ops-search-input"
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[#262626] bg-[#050505] pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Main content pane */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mt-4 flex-1">
              
              {/* Complaints feed (5 cols) */}
              <div className="md:col-span-5 flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredComplaints.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-xs font-mono font-bold leading-relaxed">
                    NO COMPLAINTS REPORTED IN SEARCH SCOPE
                  </div>
                ) : (
                  filteredComplaints.map((c) => {
                    const isSelected = selectedComplaint?.id === c.id;
                    
                    return (
                      <button
                        id={`ops-select-btn-${c.id}`}
                        key={c.id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`w-full rounded-xl border p-3 flex items-start gap-2.5 transition-all text-left ${
                          isSelected 
                            ? "border-[#cca510] bg-[#cca510]/5" 
                            : "border-[#262626] bg-[#111111]/80 hover:border-slate-800 hover:bg-[#111111]"
                        }`}
                      >
                        <div className="shrink-0 pt-1">
                          {c.status === "PENDING" && <span className="h-2 w-2 rounded-full bg-red-500 block" />}
                          {c.status === "IN_PROGRESS" && <span className="h-2 w-2 rounded-full bg-yellow-400 block" />}
                          {c.status === "RESOLVED" && <span className="h-2 w-2 rounded-full bg-emerald-500 block" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-[#cca510]">{c.id}</span>
                            <span className="text-[8px] font-mono uppercase bg-[#050505] px-1 py-0.5 rounded text-slate-400 border border-[#262626]">{c.type}</span>
                          </div>
                          
                          <p className="text-[10px] text-slate-300 font-sans tracking-wide truncate mt-1 leading-normal">
                            {c.description}
                          </p>
                          
                          <div className="mt-2 text-[7px] text-slate-500 font-mono flex items-center justify-between">
                            <span>{c.wardName.split(" ").slice(2).join(" ")}</span>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Operational Detail Sheet / Workflow Form (7 cols) */}
              <div className="md:col-span-7 rounded-2xl border border-[#262626] bg-[#050505] p-4 space-y-4 max-h-[360px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {selectedComplaint ? (
                    <motion.div
                      key={selectedComplaint.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      {/* Meta descriptor */}
                      <div className="border-b border-[#262626] pb-3 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-black text-[#cca510]">{selectedComplaint.id}</span>
                          <h4 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1">
                            <CornerDownRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            {selectedComplaint.wardName}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block font-mono font-semibold px-2 py-0.5 text-[8px] uppercase tracking-wider rounded ${
                            selectedComplaint.status === "PENDING" ? "bg-red-500/10 text-red-100 border border-red-500/30" :
                            selectedComplaint.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-100 border border-amber-500/30" :
                            "bg-emerald-500/10 text-emerald-100 border border-emerald-500/30"
                          }`}>
                            {selectedComplaint.status}
                          </span>
                        </div>
                      </div>

                      {/* Reporter parameters */}
                      <div className="grid grid-cols-2 gap-3 text-[10px] bg-[#111111] p-2.5 rounded-xl border border-[#262626] font-mono">
                        <div>
                          <span className="text-slate-500 block text-2xs uppercase">Citizen Reporter</span>
                          <span className="text-slate-300 font-bold">{selectedComplaint.reporterName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-2xs uppercase">Contact Link</span>
                          <span className="text-slate-300 font-bold">{selectedComplaint.reporterPhone}</span>
                        </div>
                      </div>

                      {/* Text details */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Incident Statement</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans font-light bg-[#111111] p-3 rounded-xl border border-[#262626]">
                          {selectedComplaint.description}
                        </p>
                      </div>

                      {/* AI Classification Analysis Block */}
                      <div className="p-3 rounded-xl bg-[#111111] border border-[#262626] font-mono text-[10px] space-y-2">
                        <div className="text-[#cca510] font-black uppercase tracking-wider flex items-center gap-1 border-b border-[#262626] pb-1.5">
                          <Activity className="h-3 w-3" />
                          AI ROUTING DECISION MATRIX
                        </div>
                        <p className="text-slate-300 leading-relaxed">{selectedComplaint.aiClassification}</p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-[#262626]">
                          <div>
                            <span className="text-2xs text-slate-500 uppercase">SLA Target TIME</span>
                            <span className="block font-bold text-white text-[11px]">{selectedComplaint.expectedHours} Hours</span>
                          </div>
                          <div>
                            <span className="text-2xs text-slate-500 uppercase">Severity Level</span>
                            <span className="block font-bold text-[11px]" style={{ color: selectedComplaint.severity > 3 ? "#ef4444" : "#fbbf24" }}>
                              Level {selectedComplaint.severity}/5
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#262626]">
                          <span className="text-2xs text-slate-500 uppercase block mb-1">MUNICIPAL WORK ORDER DISPATCH</span>
                          <p className="text-emerald-400 font-bold leading-normal whitespace-pre-line text-2xs">
                            {selectedComplaint.recommendedAction}
                          </p>
                        </div>
                      </div>

                      {/* Image attachments before & after */}
                      {(selectedComplaint.imageUrl || selectedComplaint.resolvedImageUrl) && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-[#262626] space-y-2">
                          <span className="text-[9px] font-mono uppercase tracking-wide text-slate-400 font-bold block">Restoration Visuals</span>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedComplaint.imageUrl && (
                              <div>
                                <span className="text-[8px] text-slate-500 font-mono uppercase tracking-tight block mb-1">Incident Snap</span>
                                <img
                                  src={selectedComplaint.imageUrl}
                                  alt="Report incident before"
                                  referrerPolicy="no-referrer"
                                  className="h-20 w-full rounded-lg object-cover border border-[#262626]"
                                />
                              </div>
                            )}

                            <div>
                              <span className="text-[8px] text-[#cca510] font-mono uppercase tracking-tight block mb-1">Restoration Clear</span>
                              {selectedComplaint.status === "RESOLVED" && selectedComplaint.resolvedImageUrl ? (
                                <img
                                  src={selectedComplaint.resolvedImageUrl}
                                  alt="Report resolved after"
                                  referrerPolicy="no-referrer"
                                  className="h-20 w-full rounded-lg object-cover border border-[#cca510]/30"
                                />
                              ) : (
                                <div className="h-20 rounded-lg bg-emerald-500/5 border border-dashed border-[#262626] flex items-center justify-center text-slate-500 text-[9px] leading-snug px-2 text-center">
                                  Awaiting closure report
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action workflow panel for official */}
                      {selectedComplaint.status !== "RESOLVED" && (
                        <div className="border-t border-[#262626] pt-4 space-y-3">
                          <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
                            <PenTool className="h-3.5 w-3.5 text-[#cca510]" />
                            {t.updateStatusLabel}
                          </label>

                          <textarea
                             id="remarks-textarea"
                             rows={2}
                             placeholder={t.officialRemarksPlaceholder}
                             value={officialRemarks}
                             onChange={(e) => setOfficialRemarks(e.target.value)}
                             className="w-full rounded-xl border border-[#262626] bg-[#050505] p-2.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            {selectedComplaint.status === "PENDING" && (
                              <button
                                id="status-inprogress-btn"
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-[#262626] hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 hover:text-white py-2 text-[10px] font-bold uppercase transition-all border border-slate-700"
                              >
                                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.markInProg}
                              </button>
                            )}

                            <button
                              id="status-resolved-btn"
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus("RESOLVED")}
                              className={`inline-flex items-center justify-center rounded-xl py-2 text-[10px] font-bold uppercase transition-all border ${
                                selectedComplaint.status === "PENDING" 
                                  ? "col-span-1 bg-[#cca510] hover:bg-[#a37c0b] text-black border-[#cca510]" 
                                  : "col-span-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border-emerald-600"
                              }`}
                            >
                              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.markResolved}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-500 font-mono text-xs max-w-xs mx-auto">
                      <Shield className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
                      {t.selectComplaintMap}
                    </div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 3. WARD PERFORMANCE RANKING / LEADERBOARD (BOTTOM WIDGET - 12 COLS) */}
      <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#262626] pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-[#cca510]" />
              {t.leaderboardTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{t.leaderboardDesc}</p>
          </div>
          <div className="rounded border border-emerald-500/10 bg-emerald-500/5 px-3 py-1 text-2xs font-mono text-emerald-400 flex items-center gap-1.5 uppercase font-bold tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            System Synchronized
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#cca510]" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[#262626] font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold pb-2.5">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">{t.topPerformingWards}</th>
                  <th className="pb-3 text-center">{t.statsTotalCount}</th>
                  <th className="pb-3 text-center">{t.statsResolvedCount}</th>
                  <th className="pb-3 text-center">{t.wardAvgSLA}</th>
                  <th className="pb-3 pr-2 text-right">{t.wardScore}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] font-mono text-sm">
                {leaderboard.map((ward, i) => {
                  let badgeBg = "bg-[#050505] text-slate-400 border border-[#262626]";
                  if (i === 0) badgeBg = "bg-amber-500/15 text-amber-400 border border-amber-500/20";
                  else if (i === 1) badgeBg = "bg-slate-400/15 text-slate-300 border border-slate-400/20";
                  else if (i === 2) badgeBg = "bg-amber-900/15 text-amber-600 border border-amber-900/20";

                  return (
                    <tr key={ward.id} className="hover:bg-[#111111]/40 group">
                      <td className="py-3.5 pl-2 font-black text-xs">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] ${badgeBg}`}>
                           0{i + 1}
                        </span>
                      </td>
                      <td className="py-3.5 font-sans font-bold text-slate-200 group-hover:text-white transition-colors">
                        {ward.name}
                      </td>
                      <td className="py-3.5 text-center text-slate-300 font-semibold">{ward.totalComplaints}</td>
                      <td className="py-3.5 text-center text-slate-300 font-semibold">{ward.resolvedComplaints}</td>
                      <td className="py-3.5 text-center text-slate-400">{ward.avgResolutionHours} hrs</td>
                      <td className="py-3.5 pr-2 text-right font-black">
                        <span className={`text-xs ${
                          ward.score > 90 ? "text-emerald-400" :
                          ward.score > 80 ? "text-amber-400" :
                          "text-slate-400"
                        }`}>
                          {ward.score}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
      ) : (
        <div className="rounded-3xl border border-[#262626] bg-[#0a0a0a] p-6 lg:p-8 space-y-6 text-left relative overflow-hidden font-mono">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#cca510]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[#262626]/80 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Activity className="h-5 w-5 text-[#cca510] animate-pulse" />
                Secure Civic Ledger Audit Logs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans animate-fade-in">
                Cryptographically tracked administrative ledger logging state transitions, authentication events, and civic upvotes. This index is immutable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Audit Logs */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search logs (e.g. COMP-101, Citizen)..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="rounded-xl border border-[#262626] bg-[#050505] pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#cca510]/50 focus:outline-none w-64"
                />
              </div>

              <button
                type="button"
                disabled={auditLoading}
                onClick={fetchAuditLogs}
                className="rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#262626] px-3.5 py-1.5 text-xs text-white flex items-center gap-1.5 transition-all cursor-pointer font-semibold font-sans"
              >
                {auditLoading ? <Loader2 className="h-3 w-3 animate-spin text-[#cca510]" /> : "🔄 Force Refresh"}
              </button>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {auditLoading && auditLogs.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#cca510]" />
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Synchronizing ledger stream...</p>
              </div>
            ) : (() => {
              const cleanedFilter = auditSearchTerm.toLowerCase();
              const filteredAudits = auditLogs.filter(log => {
                return (
                  log.id.toLowerCase().includes(cleanedFilter) ||
                  log.complaintId.toLowerCase().includes(cleanedFilter) ||
                  log.action.toLowerCase().includes(cleanedFilter) ||
                  log.actor.toLowerCase().includes(cleanedFilter) ||
                  log.details.toLowerCase().includes(cleanedFilter)
                );
              });

              if (filteredAudits.length === 0) {
                return (
                  <div className="py-16 text-center border border-dashed border-[#262626] rounded-2xl text-slate-500 text-xs font-sans">
                    No matching ledger items found for "{auditSearchTerm}".
                  </div>
                );
              }

              return filteredAudits.map((log) => {
                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[#262626] bg-[#050505]/60 hover:bg-[#050505] transition-all p-4 flex flex-col md:flex-row md:items-start gap-4 text-xs font-mono"
                  >
                    <div className="shrink-0 flex md:flex-col md:items-start gap-2">
                      <span className="text-2xs text-slate-500 block">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-center ${
                        log.action === "CREATE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        log.action.startsWith("STATUS_") ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" :
                        log.action === "LOGIN" ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" :
                        "bg-slate-500/10 text-slate-400 border border-[#262626]"
                      }`}>
                        {log.action}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-2xs">
                        <span className="text-[#cca510] font-bold font-sans">LEDGER ID: {log.id}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">INCIDENT ID: {log.complaintId}</span>
                      </div>
                      <p className="text-xs text-slate-200 select-all leading-normal text-left font-sans">
                        {log.details}
                      </p>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Authorized Signatory: <span className="text-slate-400 font-sans">{log.actor}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
