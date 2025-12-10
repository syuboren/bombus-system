export interface Candidate {
  id: string;
  name: string;
  position: string;
  interviewDate: string;
  status: 'completed' | 'pending';
  audioUrl?: string;
  duration?: string;
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
  transcript: TranscriptSegment[];
  emotions: EmotionData[];
  skills: SkillScore[];
  aiScores: AIScores;
}

