export interface Candidate {
  id: string;
  jobId?: string; // Added
  name: string;
  position: string; // This maps to job title usually
  interviewDate?: string; // Optional now
  status: 'completed' | 'pending' | 'new' | string; // Relaxed type
  stage?: 'Collected' | 'Invited' | 'Offered' | 'Rejected'; // Added
  scoringStatus?: 'Pending' | 'Scoring' | 'Scored'; // Added

  // Legacy/Demo fields
  audioUrl?: string;
  duration?: string;
  rescheduleNote?: string;
}

export interface InterviewInvitation {
  id: string;
  candidateId: string;
  jobId: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  proposedSlots: string[];
  message?: string;
  replyDeadline?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  interviewerId?: string;
  round: number;
  interviewAt: string;
  location?: string;
  evaluationJson?: string; // Detailed scores
  result: 'Pending' | 'Pass' | 'Hold' | 'Fail';
  remark?: string;
  createdAt: string;
}

export interface InvitationDecision {
  id: string;
  candidateId: string;
  decision: 'Invited' | 'Rejected' | 'Offered'; // Extending for final decision too
  decidedBy?: string;
  reason?: string;
  decidedAt: string;
}

export interface TranscriptSegment {
  time: string;
  text: string;
  speaker: 'interviewer' | 'candidate';
}

export interface EmotionData {
  time: string;
  confidence: number;
  anxiety: number;
  enthusiasm: number;
}

export interface SkillScore {
  name: string;
  score: number;
}

export interface AIScores {
  keywordMatch: number;
  semanticAnalysis: number;
  jdMatch: number;
  overall: number;
}

export interface CandidateDetail extends Candidate {
  // Demo fields
  transcript?: TranscriptSegment[];
  emotions?: EmotionData[];
  skills?: SkillScore[];
  aiScores?: AIScores;

  // New Workflow fields
  invitation?: InterviewInvitation;
  interviews?: Interview[];
  decision?: InvitationDecision;
}
