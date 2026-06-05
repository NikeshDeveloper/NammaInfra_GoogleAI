/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header.js";
import CitizenPortal from "./components/CitizenPortal.js";
import CommandCenter from "./components/CommandCenter.js";
import { Complaint } from "./types.js";
import { TRANSLATIONS } from "./utils/lang.js";
import { Loader2, Landmark, Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [currentTab, setCurrentTab] = useState<"citizen" | "official">("citizen");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const t = TRANSLATIONS[language];

  // Fetch complaints list from express backend
  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (e) {
      console.error("Failed to load complaints from API server:", e);
    } finally {
      setLoading(false);
    }
  };

  // Poll server for live real-time sync every 5 seconds
  useEffect(() => {
    fetchComplaints();
    
    const interval = setInterval(() => {
      fetchComplaints();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#ffffff] antialiased">
      
      {/* 1. OFFICIAL TAMIL NADU GOVTECH HEADER HEADER */}
      <Header
        language={language}
        setLanguage={setLanguage}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* 2. REALTIME STATE BROADCAST BANNER */}
      <div className="bg-[#0a0a0a] px-4 py-2 border-b border-[#262626] flex items-center justify-between gap-4 md:px-8">
        <div className="flex items-center gap-2 font-mono text-[9px] text-[#cca510]/90 tracking-wide uppercase">
          <Radio className="h-3 w-3 text-red-500 animate-pulse" />
          Chennai Command Telemetry: Secure Link Connected
        </div>
        <div className="text-[9px] font-mono text-slate-500 uppercase hidden sm:block">
          Grid: UTC+5:30 • Live Streams Enabled
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#cca510]" />
            <p className="text-xs font-mono tracking-widest text-[#cca510]/80 uppercase">Loading Civic OS Nodes...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentTab === "citizen" ? (
              <motion.div
                key="citizen-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
              >
                <CitizenPortal
                  language={language}
                  complaints={complaints}
                  setComplaints={setComplaints}
                  fetchComplaints={fetchComplaints}
                />
              </motion.div>
            ) : (
              <motion.div
                key="official-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
              >
                <CommandCenter
                  language={language}
                  complaints={complaints}
                  setComplaints={setComplaints}
                  fetchComplaints={fetchComplaints}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* 4. TACTICAL FOOTER STATS */}
      <footer className="border-t border-[#262626] bg-[#0a0a0a] py-4 text-center text-2xs text-slate-600 font-mono uppercase tracking-widest mt-auto">
        <div className="mx-auto max-w-7xl px-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 NIC Tamil Nadu • Municipal Administration & Water Supply Dept</span>
          <span className="text-[#cca510]/60">Powered by Gemini 3.5 Flash Automated Classification</span>
        </div>
      </footer>

    </div>
  );
}
