/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TRANSLATIONS } from "../utils/lang.js";
import { Shield, Sparkles, Languages, Landmark } from "lucide-react";

interface HeaderProps {
  language: "en" | "ta";
  setLanguage: (lang: "en" | "ta") => void;
  currentTab: "citizen" | "official";
  setCurrentTab: (tab: "citizen" | "official") => void;
}

export default function Header({
  language,
  setLanguage,
  currentTab,
  setCurrentTab,
}: HeaderProps) {
  const t = TRANSLATIONS[language];

  return (
    <header className="border border-[#262626] bg-[#0a0a0a] rounded-2xl px-4 py-3 md:px-8 m-4 md:mx-8 md:my-4 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Government Emblem & Branding */}
        <div className="flex items-center gap-3">
          {/* Custom vector representation of Tamil Nadu Gopuram Emblem */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#262626] bg-[#050505] p-1 shadow-md">
            {/* Inner Gopuram design */}
            <div className="flex flex-col items-center justify-center">
              <Landmark className="h-6 w-6 text-[#cca510]" />
              <div className="absolute bottom-1.5 text-[7px] font-bold text-[#cca510]/80 tracking-widest uppercase">
                TN
              </div>
            </div>
            {/* Ring elements */}
            <div className="absolute inset-0.5 rounded-full border border-dashed border-[#262626] animate-[spin_60s_linear_infinite]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-widest text-[#cca510] md:text-2xs uppercase">
                {t.tamilNaduGovt}
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl flex items-center gap-2">
              {t.title}
              <span className="rounded bg-gradient-to-r from-amber-500 to-yellow-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                v2.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight md:text-xs">
              {t.subtitle} • <span className="text-[#cca510]/80 font-sans italic text-[9px]">{t.motto}</span>
            </p>
          </div>
        </div>

        {/* Tab Selection & Language Toggle */}
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          
          {/* Console Mode Switches */}
          <div className="inline-flex rounded-lg bg-[#050505] p-1 border border-[#262626]">
            <button
              id="citizen-tab-btn"
              onClick={() => setCurrentTab("citizen")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                currentTab === "citizen"
                  ? "bg-[#262626] text-white shadow-inner border-b-2 border-[#cca510]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.citizenTab}
            </button>
            <button
              id="official-tab-btn"
              onClick={() => setCurrentTab("official")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                currentTab === "official"
                  ? "bg-[#262626] text-white shadow-inner border-b-2 border-[#cca510]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-[#cca510]" />
              {t.officialTab}
            </button>
          </div>

          {/* Bilingual Selector */}
          <button
            id="lang-toggle-btn"
            onClick={() => setLanguage(language === "en" ? "ta" : "en")}
            className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#050505] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#cca510]/40 hover:text-[#cca510] transition-colors"
          >
            <Languages className="h-3.5 w-3.5 text-[#cca510]" />
            <span className="font-mono uppercase">{language === "en" ? "தமிழ்" : "English"}</span>
          </button>
          
        </div>
      </div>
    </header>
  );
}
