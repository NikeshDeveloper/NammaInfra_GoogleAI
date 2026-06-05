/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComplaintType = 'ROADS' | 'SEWAGE' | 'WATER' | 'GARBAGE' | 'ELECTRICITY' | 'PUBLIC_HEALTH';

export type ComplaintStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Complaint {
  id: string;
  type: ComplaintType;
  description: string;
  reporterName: string;
  reporterPhone: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  imageAnalyzed?: boolean;
  severity: number; // 1 to 5
  status: ComplaintStatus;
  aiClassification: string;
  recommendedAction: string;
  expectedHours: number;
  createdAt: string;
  resolvedAt: string | null;
  resolvedImageUrl: string | null;
  officialRemarks: string | null;
  wardName: string;
  pendingWith?: string;
  assignedOfficer?: string;
  assignedDept?: string;
  followersCount?: number;
  feedbackRating?: 'THUMBS_UP' | 'THUMBS_DOWN' | null;
  feedbackComments?: string | null;
}

export interface AuditLog {
  id: string;
  complaintId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export interface RAGMatch {
  id: string;
  similarity: "HIGH" | "MEDIUM";
  reason: string;
}

export interface WardLeaderboardItem {
  id: string;
  name: string;
  totalComplaints: number;
  resolvedComplaints: number;
  avgResolutionHours: number;
  score: number; // 0 to 100 efficiency score
}

export interface AIAnalysisResult {
  category: ComplaintType;
  severity: number;
  summary: string;
  actionItems: string;
  expectedHours: number;
  ward: string;
}
