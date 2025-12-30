
export enum TutorGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
  ACTIVE = 'ACTIVE'
}

export interface ExamQuestion {
  question: string;
  type?: 'mcq' | 'written';
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string; // للأسئلة العادية (المكتوبة)
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface Curriculum {
  id: string;
  title: string;
  content: string;
  addedAt: number;
  progress: number;
  completedTopics: string[];
  weakPoints: string[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: SearchSource[];
}

export interface SmartNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'stalled';
  title: string;
  message: string;
  timestamp: number;
}
