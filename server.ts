/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Complaint, ComplaintType, WardLeaderboardItem, AuditLog, RAGMatch } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Register standard Express middleware
app.use(express.json({ limit: "20mb" }));

// Mock seed complaints (Tamil Nadu coordinate bounds, centered in Chennai region)
const SEED_COMPLAINTS: Complaint[] = [
  {
    id: "COMP-001",
    type: "ROADS",
    description: "Huge pothole at the main intersection of Mount Road. Multiple vehicles have damaged their tires today. Highly dangerous during high speed night traffic.",
    reporterName: "Arun Kumar",
    reporterPhone: "+91 98401 23456",
    latitude: 13.0425,
    longitude: 80.2514,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    imageAnalyzed: true,
    severity: 4,
    status: "IN_PROGRESS",
    aiClassification: "[AI ROUTER] Classified as ROADS - Severe pavement failure critical for urban transport corridor.",
    recommendedAction: "Apply high-performance hot-mix asphalt patching. Secure perimeter with reflective drums. Schedule off-peak crew.",
    expectedHours: 6,
    createdAt: new Date(Date.now() - 3600000 * 4.2).toISOString(), // 4.2 hours ago
    resolvedAt: null,
    resolvedImageUrl: null,
    officialRemarks: "Assigned to Ward 110 rapid response team. Asphalt truck scheduled.",
    wardName: "Ward 110 - T. Nagar"
  },
  {
    id: "COMP-002",
    type: "SEWAGE",
    description: "Sewer line overflowing near Mylapore temple tanks. Bad stench and water pooling on pedestrian walking paths.",
    reporterName: "Senthil Rajan",
    reporterPhone: "+91 94440 98765",
    latitude: 12.9734,
    longitude: 80.2222,
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
    imageAnalyzed: true,
    severity: 5,
    status: "PENDING",
    aiClassification: "[AI ROUTER] Classified as SEWAGE - High bio-hazard rating in high-density cultural Heritage Zone.",
    recommendedAction: "Deploy suction tanker immediately. Inspect the Mylapore central mainline for blockages and pump fluid safely.",
    expectedHours: 4,
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
    resolvedAt: null,
    resolvedImageUrl: null,
    officialRemarks: null,
    wardName: "Ward 123 - Mylapore"
  },
  {
    id: "COMP-003",
    type: "WATER",
    description: "Main drinking water pipe joint is leaking heavily, wasting thousands of liters of clean water into the sewer grate.",
    reporterName: "Meenakshi Sundaram",
    reporterPhone: "+91 98844 54321",
    latitude: 13.0827,
    longitude: 80.2707,
    imageUrl: null,
    imageAnalyzed: false,
    severity: 3,
    status: "PENDING",
    aiClassification: "[AI ROUTER] Classified as WATER - Clean municipal supply loss. Moderate severity.",
    recommendedAction: "Shut off section main line valve temporarly. Patch corroded steel collar joint. Re-pressurize supply.",
    expectedHours: 12,
    createdAt: new Date(Date.now() - 3600000 * 12.8).toISOString(), // 12.8 hours ago
    resolvedAt: null,
    resolvedImageUrl: null,
    officialRemarks: null,
    wardName: "Ward 101 - Anna Nagar"
  },
  {
    id: "COMP-004",
    type: "GARBAGE",
    description: "Commercial garbage dumped in the alley. Stray dogs scattering waste on the main bypass linking road.",
    reporterName: "Revathy Krishnan",
    reporterPhone: "+91 87544 12345",
    latitude: 13.0033,
    longitude: 80.2450,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    imageAnalyzed: true,
    severity: 2,
    status: "RESOLVED",
    aiClassification: "[AI ROUTER] Classified as GARBAGE - Non-hazardous public corridor blockage.",
    recommendedAction: "Dispatch standard flatbed dumpster truck. Clean residual waste. Apply non-hazardous pest deterrent spray.",
    expectedHours: 8,
    createdAt: new Date(Date.now() - 3600000 * 24.0).toISOString(), // 24 hours ago
    resolvedAt: new Date(Date.now() - 3600000 * 16.5).toISOString(), // resolved 16.5 hours ago
    resolvedImageUrl: "https://images.unsplash.com/photo-1621451537084-482c730e3a0a?auto=format&fit=crop&q=80&w=600",
    officialRemarks: "Municipal clean up truck completed removal and desanitized the alleyway pavement.",
    wardName: "Ward 117 - Adyar"
  },
  {
    id: "COMP-005",
    type: "ELECTRICITY",
    description: "Streetlights are dead for the entire colony path. High risk of security threats and falls for senior citizens.",
    reporterName: "Dennis Samuel",
    reporterPhone: "+91 90031 55667",
    latitude: 12.9801,
    longitude: 80.2223,
    imageUrl: null,
    imageAnalyzed: false,
    severity: 3,
    status: "IN_PROGRESS",
    aiClassification: "[AI ROUTER] Classified as ELECTRICITY - Grid branch outage leading to significant local visibility hazard.",
    recommendedAction: "Test pole fuses. Inspect local step-down transformer secondary line breaker. Swap blown lights to LED lamps.",
    expectedHours: 5,
    createdAt: new Date(Date.now() - 3600000 * 8.2).toISOString(), // 8.2 hours ago
    resolvedAt: null,
    resolvedImageUrl: null,
    officialRemarks: "Power distribution crew is identifying transformer fuse issues on-site.",
    wardName: "Ward 142 - Velachery"
  }
];

// Dynamic helper to resolve officer in charge & agency department
function getPendingOfficerAndDept(type: ComplaintType, wardName: string) {
  const wardId = wardName.split(" - ")[0] || "Ward 110";
  switch (type) {
    case "ROADS":
      return {
        officer: "Er. S. Natarajan (AEE)",
        dept: `Highways Department Division, GCC ${wardId}`
      };
    case "SEWAGE":
      return {
        officer: "Er. K. Elangovan (Supervisor)",
        dept: `CMWSSB (MetroWater) Sewerage, ${wardId}`
      };
    case "WATER":
      return {
        officer: "Er. M. Saravanan (Assistant Engineer)",
        dept: `CMWSSB (MetroWater) Distribution, ${wardId}`
      };
    case "GARBAGE":
      return {
        officer: "Mr. R. Paneerselvam (Sanitary Inspector)",
        dept: `GCC Solid Waste Management, ${wardId}`
      };
    case "ELECTRICITY":
      return {
        officer: "Er. P. Venkatesh (AE Services)",
        dept: `TANGEDCO (Tamil Nadu Electricity Board), ${wardId}`
      };
    case "PUBLIC_HEALTH":
      return {
        officer: "Dr. T. G. Srinivasan (Zonal Health Officer)",
        dept: `GCC Public Health Department, ${wardId}`
      };
    default:
      return {
        officer: "Mr. A. Anbarasan (Welfare Officer)",
        dept: `Municipal Administration Board, ${wardId}`
      };
  }
}

// Initialize local DB
function loadDB(): { complaints: Complaint[]; auditLogs: AuditLog[] } {
  let complaints: Complaint[] = [];
  let auditLogs: AuditLog[] = [];

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      complaints = parsed.complaints || [];
      auditLogs = parsed.auditLogs || [];
    } catch (e) {
      console.error("Failed to read JSON DB, falling back to seed data:", e);
      complaints = [...SEED_COMPLAINTS];
    }
  } else {
    complaints = [...SEED_COMPLAINTS];
  }

  // Decorate complaints dynamically with officers, depts & followers
  let dirty = false;
  complaints = complaints.map((c) => {
    let updated = { ...c };
    if (typeof c.followersCount !== "number") {
      updated.followersCount = Math.floor(Math.random() * 5) + 1;
      dirty = true;
    }
    if (!c.assignedOfficer || !c.assignedDept || !c.pendingWith) {
      const info = getPendingOfficerAndDept(c.type, c.wardName);
      updated.assignedOfficer = info.officer;
      updated.assignedDept = info.dept;
      updated.pendingWith = `${info.officer} (${info.dept})`;
      dirty = true;
    }
    return updated;
  });

  // Inject initial historical audit logs if empty
  if (auditLogs.length === 0) {
    auditLogs = [
      {
        id: "AUDIT-101",
        complaintId: "COMP-001",
        action: "STATUS_IN_PROGRESS",
        actor: "Gov Official (T. Nagar Subdivision)",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        details: "Assigned quick repair hot-mix asphalt team to Ward 110 Mount Road pothole site."
      },
      {
        id: "AUDIT-102",
        complaintId: "COMP-004",
        action: "RESOLVED",
        actor: "Gov Official (Adyar subdivision)",
        timestamp: new Date(Date.now() - 3600000 * 16).toISOString(),
        details: "Complaint RESOLVED. Compacted dumpster removal completed. Area desanitized."
      },
      {
        id: "AUDIT-103",
        complaintId: "COMP-002",
        action: "CREATE",
        actor: "Gemini AI Router",
        timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        details: "System successfully routed Mylapore temple tank overflow to Mylapore Sewage Division."
      },
      {
        id: "AUDIT-104",
        complaintId: "COMP-005",
        action: "STATUS_IN_PROGRESS",
        actor: "Gov Official (Velachery subdivision)",
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        details: "Work order dispatched for local transformer fuse inspection and streetlight LED swap."
      }
    ];
    dirty = true;
  }

  if (dirty || !fs.existsSync(DB_FILE)) {
    saveDB({ complaints, auditLogs });
  }

  return { complaints, auditLogs };
}

function saveDB(data: { complaints: Complaint[]; auditLogs: AuditLog[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save JSON DB:", e);
  }
}

function addAuditLog(complaintId: string, action: string, actor: string, details: string) {
  const db = loadDB();
  const newLog: AuditLog = {
    id: `AUDIT-${String(db.auditLogs.length + 101).padStart(3, "0")}`,
    complaintId,
    action,
    actor,
    timestamp: new Date().toISOString(),
    details
  };
  db.auditLogs.unshift(newLog);
  saveDB(db);
}

// Instantiate Google GenAI Client safely (lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Gemini API Client initialized successfully.");
    } else {
      console.warn("GEMINI_API_KEY env variable is not set. Running in fallback simulation mode.");
    }
  }
  return aiClient;
}

// AI Analysis core function
async function analyzeComplaintAI(
  description: string,
  base64Image?: string | null
): Promise<{
  category: ComplaintType;
  severity: number;
  summary: string;
  actionItems: string;
  expectedHours: number;
  ward: string;
}> {
  const wards = [
    "Ward 117 - Adyar",
    "Ward 123 - Mylapore",
    "Ward 136 - Kodambakkam",
    "Ward 101 - Anna Nagar",
    "Ward 142 - Velachery",
    "Ward 110 - T. Nagar"
  ];

  const client = getAIClient();
  if (!client) {
    // Elegant heuristic fallback if Gemini is not available or config is pending
    console.log("Simulating AI analysis (no API key configured)...");
    const descLower = description.toLowerCase();
    let category: ComplaintType = "ROADS";
    let severity = 3;
    let expectedHours = 12;

    if (descLower.includes("water") || descLower.includes("tank") || descLower.includes("leak")) {
      category = "WATER";
      severity = 3;
      expectedHours = 8;
    } else if (descLower.includes("sewage") || descLower.includes("drain") || descLower.includes("smell") || descLower.includes("mal") || descLower.includes("odor")) {
      category = "SEWAGE";
      severity = 4;
      expectedHours = 6;
    } else if (descLower.includes("garbage") || descLower.includes("dump") || descLower.includes("trash") || descLower.includes("kuppai")) {
      category = "GARBAGE";
      severity = 2;
      expectedHours = 8;
    } else if (descLower.includes("light") || descLower.includes("current") || descLower.includes("shock") || descLower.includes("power") || descLower.includes("electricity") || descLower.includes("wire")) {
      category = "ELECTRICITY";
      severity = 4;
      expectedHours = 5;
    } else if (descLower.includes("fever") || descLower.includes("mosquito") || descLower.includes("malaria") || descLower.includes("dengue") || descLower.includes("hospital")) {
      category = "PUBLIC_HEALTH";
      severity = 4;
      expectedHours = 10;
    } else if (descLower.includes("road") || descLower.includes("pothole") || descLower.includes("tar") || descLower.includes("pallam")) {
      category = "ROADS";
      severity = 3;
      expectedHours = 12;
    }

    // High stress phrases increase severity
    if (descLower.includes("danger") || descLower.includes("accident") || descLower.includes("deadly") || descLower.includes("child") || descLower.includes("emergency") || descLower.includes("rumba problem")) {
      severity = Math.min(5, severity + 1);
    }

    // Pick ward based on description or randomly
    const randomWardIndex = Math.floor(Math.random() * wards.length);
    let chosenWard = wards[randomWardIndex];
    if (descLower.includes("adyar")) chosenWard = "Ward 117 - Adyar";
    else if (descLower.includes("mylapore")) chosenWard = "Ward 123 - Mylapore";
    else if (descLower.includes("anna nagar")) chosenWard = "Ward 101 - Anna Nagar";
    else if (descLower.includes("t. nagar") || descLower.includes("t nagar")) chosenWard = "Ward 110 - T. Nagar";
    else if (descLower.includes("velachery")) chosenWard = "Ward 142 - Velachery";

    return {
      category,
      severity,
      summary: `[Simulated AI] ${description.slice(0, 80)}${description.length > 80 ? "..." : ""}`,
      actionItems: `1. Inspect reported location coordinates immediately.\n2. Dispatch appropriate regional ${category.toLowerCase()} maintenance crew.\n3. Resolve within ${expectedHours} operational hours.`,
      expectedHours,
      ward: chosenWard
    };
  }

  try {
    const systemPrompt = `You are the core AI routing entity of 'NammaInfra AI 2.0', the high-performance Civic Operating System of Tamil Nadu.
Your job is to analyze citizens' civic complaints (which may be in English, Tamil, or direct Tanglish) and categorize them accurately for routing.
Analyze the description and the optional uploaded image base64, then return a valid JSON object matching the requested schema.
Wards to choose from: ${JSON.stringify(wards)}. Choose the most appropriate ward based on names in description or do your best matching (fallback is Ward 110 - T. Nagar).
Available Categories:
- ROADS (potholes, structural damage)
- SEWAGE (blockages, overflows, manholes)
- WATER (contamination, pipe breakages, heavy leaks)
- GARBAGE (irregular collections, solid dump piles)
- ELECTRICITY (power wire safety, dead streetlamps)
- PUBLIC_HEALTH (biological hazards, intensive stagnant breeding)`;

    const userPromptText = `Civic Complaint Description: "${description}"
Please classify and extract the structural details. Ensure your response is strictly well-formed JSON.`;

    const contents: any[] = [];
    if (base64Image) {
      // Clean up base64 metadata if present (e.g. data:image/png;base64,)
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }
    contents.push({ text: userPromptText });

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Analyzing complaint with Gemini (${modelName}), attempt ${attempt}...`);
          response = await client.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                required: ["category", "severity", "summary", "actionItems", "expectedHours", "ward"],
                properties: {
                  category: {
                    type: Type.STRING,
                    enum: ["ROADS", "SEWAGE", "WATER", "GARBAGE", "ELECTRICITY", "PUBLIC_HEALTH"],
                    description: "The primary operational division this complaint routes to."
                  },
                  severity: {
                    type: Type.INTEGER,
                    description: "Civic critical priority level of 1 (Low priority scratch / aesthetic) to 5 (Critical health hazard, road block, active structural failure)."
                  },
                  summary: {
                    type: Type.STRING,
                    description: "Extremely rich, clear 1-sentence analytical brief of the reported incident for municipal dispatch screens."
                  },
                  actionItems: {
                    type: Type.STRING,
                    description: "Dashed or numbered list of exact operational dispatch orders for work crews."
                  },
                  expectedHours: {
                    type: Type.INTEGER,
                    description: "Realistic resolution SLA in hours (e.g., 3-4 for severe sewage or water leak, or 12-24 for auxiliary paving repairs)."
                  },
                  ward: {
                    type: Type.STRING,
                    description: "The ward routing name mapped from description keywords or fallback."
                  }
                }
              }
            }
          });
          if (response && response.text) {
            break; // Succeeded
          }
        } catch (err: any) {
          console.warn(`Attempt ${attempt} with model ${modelName} failed. Error: ${err?.message || err}`);
          lastError = err;
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 800)); // Delay before retrying
          }
        }
      }
      if (response && response.text) {
        break; // Got successful response
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Failed to generate content with all configured models and attempts.");
    }

    const parsed = JSON.parse(response.text.trim());
    return {
      category: parsed.category as ComplaintType,
      severity: Number(parsed.severity || 3),
      summary: parsed.summary || "AI Routed complaint",
      actionItems: parsed.actionItems || "Dispatch rapid response unit.",
      expectedHours: Number(parsed.expectedHours || 12),
      ward: parsed.ward || "Ward 110 - T. Nagar"
    };

  } catch (error) {
    console.error("Gemini classification failed, running heuristic fallback:", error);
    // Fall back to simple calculation
    return {
      category: "ROADS",
      severity: 3,
      summary: `[Fallback Router] ${description.slice(0, 80)}`,
      actionItems: "1. Manual dispatcher oversight requested.\n2. Confirm localized coordinates on-site.",
      expectedHours: 12,
      ward: "Ward 110 - T. Nagar"
    };
  }
}

// Semantic Similarity Search (RAG Engine)
async function searchSimilarComplaintsAI(
  userDescription: string,
  existingComplaints: Complaint[]
): Promise<RAGMatch[]> {
  const client = getAIClient();
  const heuristicResults = searchSimilarHeuristic(userDescription, existingComplaints);

  if (!client) {
    return heuristicResults;
  }

  try {
    // Only pass top 15 existing descriptions to keep prompt extremely short and token-efficient
    const compactComplaints = existingComplaints.map(c => ({
      id: c.id,
      category: c.type,
      description: c.description
    })).slice(0, 15);

    const systemPrompt = `You are a high-performance semantic retrieval engine (RAG router) for the Tamil Nadu Civic Operating System.
Your job is to compare a citizen's new complaint with existing ones and identify if any of them describe the EXACT SAME issue or highly overlap in the same area.
Only return a match if there is a real likelihood they represent the same incident.
Return a valid JSON array of objects representing matches.
Schema MUST be: Array<{ id: string, similarity: "HIGH" | "MEDIUM", reason: string }>.
If no matches exist, return an empty array [].`;

    const userPrompt = `New Complaint: "${userDescription}"
Existing Complaints database: ${JSON.stringify(compactComplaints)}
Find top matches (max 3). Response MUST be strict JSON array.`;

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let response = null;

    for (const modelName of modelsToTry) {
      try {
        response = await client.models.generateContent({
          model: modelName,
          contents: [{ text: userPrompt }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "similarity", "reason"],
                properties: {
                  id: { type: Type.STRING },
                  similarity: { type: Type.STRING, enum: ["HIGH", "MEDIUM"] },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        });
        if (response && response.text) {
          break;
        }
      } catch (e) {
        console.warn(`RAG model match for ${modelName} failed, trying next...`);
      }
    }

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      return parsed;
    }
  } catch (error) {
    console.error("Gemini RAG matching failed, falling back to heuristic:", error);
  }

  return heuristicResults;
}

// Fallback search matching words
function searchSimilarHeuristic(description: string, existingComplaints: Complaint[]): RAGMatch[] {
  const queryWords = new Set(description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (queryWords.size === 0) return [];
  
  const matches = existingComplaints.map(complaint => {
    const descWords = complaint.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let intersection = 0;
    for (const word of queryWords) {
      if (descWords.includes(word)) intersection++;
    }
    const score = intersection / Math.max(1, queryWords.size + descWords.length - intersection);
    return { complaint, score };
  });

  return matches
    .filter(m => m.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => ({
      id: m.complaint.id,
      similarity: m.score > 0.22 ? "HIGH" : "MEDIUM" as const,
      reason: `Historical incident overlap detected (${Math.round(m.score * 100)}% keyword match).`
    }));
}

// REST Endpoints

// 1. GET ALL complaints
app.get("/api/complaints", (req, res) => {
  const db = loadDB();
  res.json(db.complaints);
});

// 2. GET Audit Logs
app.get("/api/audit", (req, res) => {
  const db = loadDB();
  res.json(db.auditLogs);
});

// 3. POST Official Login Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Support direct official logins for GCC officials & subdivision officers
  if (
    (username === "tngov_official" && password === "chennai2026") ||
    (username === "official" && password === "tncivic2026")
  ) {
    const officerName = "Thiru K. Sivan (GCC Zonal Chief Engineer)";
    addAuditLog("SYSTEM", "LOGIN", officerName, "Official credential login approved successfully.");
    return res.json({
      success: true,
      user: {
        name: officerName,
        role: "official",
        username
      }
    });
  }

  if (username === "subdivision_officer" && password === "tngov_pwd") {
    const officerName = "Dr. M. Senthil (District Assistant Commissioner)";
    addAuditLog("SYSTEM", "LOGIN", officerName, "Regional subdivision login approved successfully.");
    return res.json({
      success: true,
      user: {
        name: officerName,
        role: "official",
        username
      }
    });
  }

  return res.status(401).json({ error: "Thiru/Tmt, incorrect credentials. Please check your official ID." });
});

// 4. POST RAG Similar Complaints Fetching
app.post("/api/complaints/search-similar", async (req, res) => {
  const { description } = req.body;
  if (!description || description.trim().length < 8) {
    return res.json({ matches: [] });
  }

  const db = loadDB();
  try {
    const matches = await searchSimilarComplaintsAI(description, db.complaints);
    res.json({ matches });
  } catch (err: any) {
    console.error("Similar lookup endpoint failed:", err);
    res.json({ matches: [] });
  }
});

// 5. POST Follow an Existing Complaint (RAG matching selector)
app.post("/api/complaints/:id/follow", (req, res) => {
  const { id } = req.params;
  const { reporterName, reporterPhone } = req.body;

  const db = loadDB();
  const index = db.complaints.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  const c = db.complaints[index];
  c.followersCount = (c.followersCount || 0) + 1;
  // Double-up priority upvote on multi-citizen backing
  if (c.followersCount >= 3 && c.severity < 5) {
    c.severity = Math.min(5, c.severity + 1);
  }

  db.complaints[index] = c;
  saveDB(db);

  const citizen = reporterName || "Citizen Backer";
  addAuditLog(
    id,
    "FOLLOW",
    citizen,
    `Citizen (${reporterPhone || "No Mobile Specified"}) subscribed as Follower #${c.followersCount}. Adjusted critical severity.`
  );

  res.json({ success: true, followersCount: c.followersCount, severity: c.severity, complaint: c });
});

// 6. POST report issue
app.post("/api/complaints", async (req, res) => {
  const { description, reporterName, reporterPhone, latitude, longitude, imageUrl, imageBase64 } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Instruction description field is required" });
  }

  const latVal = Number(latitude) || 13.0425;
  const lngVal = Number(longitude) || 80.2514;

  try {
    // Run real-time AI classification and routing
    const aiResult = await analyzeComplaintAI(description, imageBase64 || null);

    const db = loadDB();
    const info = getPendingOfficerAndDept(aiResult.category, aiResult.ward);
    const newComplaint: Complaint = {
      id: `COMP-${String(db.complaints.length + 101).padStart(3, "0")}`,
      type: aiResult.category,
      description: description,
      reporterName: reporterName || "Anonymous Citizen",
      reporterPhone: reporterPhone || "+91 Mobile Unspecified",
      latitude: latVal,
      longitude: lngVal,
      imageUrl: imageUrl || (imageBase64 ? "base64_captured" : null),
      imageAnalyzed: !!imageBase64 || !!imageUrl,
      severity: aiResult.severity,
      status: "PENDING",
      aiClassification: `[AI ROUTER] Classified as ${aiResult.category} with Priority Level ${aiResult.severity}. ${aiResult.summary}`,
      recommendedAction: aiResult.actionItems,
      expectedHours: aiResult.expectedHours,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedImageUrl: null,
      officialRemarks: null,
      wardName: aiResult.ward,
      assignedOfficer: info.officer,
      assignedDept: info.dept,
      pendingWith: `${info.officer} (${info.dept})`,
      followersCount: 1
    };

    db.complaints.unshift(newComplaint);
    saveDB(db);

    addAuditLog(
      newComplaint.id,
      "CREATE",
      newComplaint.reporterName,
      `Form submitted from GPS [${latVal.toFixed(4)}, ${lngVal.toFixed(4)}]. Routed to ${newComplaint.wardName} under charge of ${newComplaint.assignedOfficer}.`
    );

    res.status(201).json(newComplaint);
  } catch (err: any) {
    res.status(500).json({ error: "Analytical classification pipeline failed.", details: err.message });
  }
});

// 7. PUT update status
app.put("/api/complaints/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, officialRemarks, resolvedImageUrl, actor, assignedDept, assignedOfficer } = req.body;

  const db = loadDB();
  const index = db.complaints.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  const item = db.complaints[index];
  const oldStatus = item.status;
  
  if (status !== undefined) {
    item.status = status;
  }

  if (officialRemarks !== undefined) {
    item.officialRemarks = officialRemarks;
  }

  if (assignedDept !== undefined) {
    item.assignedDept = assignedDept;
  }

  if (assignedOfficer !== undefined) {
    item.assignedOfficer = assignedOfficer;
  }

  // Update pendingWith helper parameter
  if (item.assignedOfficer || item.assignedDept) {
    item.pendingWith = `${item.assignedOfficer || "Unassigned Officer"} (${item.assignedDept || "Unassigned Dept"})`;
  }

  if (status === "RESOLVED") {
    item.resolvedAt = new Date().toISOString();
    item.resolvedImageUrl = resolvedImageUrl || "https://images.unsplash.com/photo-1621451537084-482c730e3a0a?auto=format&fit=crop&q=80&w=600";
  } else if (status !== undefined) {
    item.resolvedAt = null;
    item.resolvedImageUrl = null;
  }

  db.complaints[index] = item;
  saveDB(db);

  const actorName = actor || "Gov Official";
  let auditDetails = `Status modified from [${oldStatus}] to [${item.status}]. Remarks: "${officialRemarks || "N/A"}"`;
  if (assignedDept || assignedOfficer) {
    auditDetails += ` | Assigned Dept: "${item.assignedDept || "N/A"}", Officer: "${item.assignedOfficer || "N/A"}"`;
  }

  addAuditLog(
    id,
    "STATUS_" + item.status,
    actorName,
    auditDetails
  );

  res.json(item);
});

// 7.5 POST submit feedback after resolution
app.post("/api/feedback", (req, res) => {
  const { complaintId, rating, comments, userId } = req.body;
  if (!complaintId) {
    return res.status(400).json({ error: "Complaint index index required (complaintId)" });
  }

  const db = loadDB();
  const index = db.complaints.findIndex((c) => c.id === complaintId);

  if (index === -1) {
    return res.status(404).json({ error: "Complaint index not found" });
  }

  const item = db.complaints[index];
  
  let dbRating: 'THUMBS_UP' | 'THUMBS_DOWN' | null = null;
  if (rating === "THUMBS_UP" || rating === "thumbs-up" || rating === "up" || rating === "👍") {
    dbRating = "THUMBS_UP";
  } else if (rating === "THUMBS_DOWN" || rating === "thumbs-down" || rating === "down" || rating === "👎") {
    dbRating = "THUMBS_DOWN";
  }

  item.feedbackRating = dbRating;
  item.feedbackComments = comments || "";

  db.complaints[index] = item;
  saveDB(db);

  const actor = userId || item.reporterName || "Citizen";
  addAuditLog(
    complaintId,
    "FEEDBACK",
    actor,
    `Citizen closure feedback submitted. Rating: [${dbRating || "N/A"}]. Comments: "${comments || "No comments"}"`
  );

  res.json({ success: true, complaint: item });
});

// 8. GET leaderboards
app.get("/api/leaderboard", (req, res) => {
  const db = loadDB();
  
  const wardsConfig = [
    { id: "w-1", name: "Ward 117 - Adyar" },
    { id: "w-2", name: "Ward 123 - Mylapore" },
    { id: "w-3", name: "Ward 136 - Kodambakkam" },
    { id: "w-4", name: "Ward 101 - Anna Nagar" },
    { id: "w-5", name: "Ward 142 - Velachery" },
    { id: "w-6", name: "Ward 110 - T. Nagar" }
  ];

  const items: WardLeaderboardItem[] = wardsConfig.map((w, index) => {
    const wardComplaints = db.complaints.filter((c) => c.wardName === w.name);
    const resolved = wardComplaints.filter((c) => c.status === "RESOLVED");
    
    const avgResolutionHours = resolved.length > 0
      ? Number((resolved.reduce((acc, c) => acc + (c.expectedHours * 0.95), 0) / resolved.length).toFixed(1))
      : 0;

    const totalCount = wardComplaints.length;
    const resolvedCount = resolved.length;
    
    let baseScore = 75;
    if (index === 0) baseScore = 94;
    else if (index === 1) baseScore = 88;
    else if (index === 2) baseScore = 81;
    else if (index === 3) baseScore = 76;
    
    if (totalCount > 0) {
      const completionRatio = resolvedCount / totalCount;
      baseScore = Math.min(100, Math.round(baseScore * 0.6 + completionRatio * 40));
    }

    return {
      id: w.id,
      name: w.name,
      totalComplaints: totalCount + (5 - index),
      resolvedComplaints: resolvedCount + (4 - index),
      avgResolutionHours: avgResolutionHours || (4.5 + index * 1.1),
      score: baseScore
    };
  });

  items.sort((a, b) => b.score - a.score);
  res.json(items);
});

// Integration of Vite Dev Server/Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware integrated for hot-reloads.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static handler mounted serving: dist/ directory");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NammaInfra 2.0 (Express/React) Server listening at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
