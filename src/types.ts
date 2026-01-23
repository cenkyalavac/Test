export interface InlineTag {
  tag_id: string;
  tag_type: string;
  content: string;
  attributes?: Record<string, string>;
}

export interface SegmentMetadata {
  match_quality?: number;
  confirmation_status?: string;
  segment_status?: string;
  priority?: number;
  context?: string;
  domain?: string;
  custom_attributes?: Record<string, string | number | boolean>;
}

export interface Segment {
  segment_id: string;
  source_text: string;
  target_text: string;
  status: string;
  source_language?: string;
  target_language?: string;
  file_path?: string;
  source_plain_text?: string;
  target_plain_text?: string;
  source_inline_tags: InlineTag[];
  target_inline_tags: InlineTag[];
  metadata?: SegmentMetadata;
  xliff_version?: string;
  variant?: string;
  match_percentage?: number;
}

// QA Check Types
export interface QAIssue {
  segment_id: string;
  check_type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source_text?: string;
  target_text?: string;
  details?: Record<string, unknown>;
}

export interface QASummary {
  total_issues: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface QAResults {
  total_issues: number;
  issues: QAIssue[];
  summary: QASummary;
  mode: 'fast' | 'balanced' | 'full';
}

// API Response Types
export type QAMode = 'fast' | 'balanced' | 'full';

export interface FileUploadRequest {
  mode?: QAMode;
  segments: Omit<Segment, 'source_inline_tags' | 'target_inline_tags'>[];
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  timestamp?: string;
}
