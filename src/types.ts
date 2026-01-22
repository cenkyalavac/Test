export interface InlineTag {
  tag_id: string;
  tag_type: string;
  content: string;
  attributes?: Record<string, any>;
}

export interface SegmentMetadata {
  match_quality?: number;
  confirmation_status?: string;
  segment_status?: string;
  priority?: number;
  context?: string;
  domain?: string;
  custom_attributes?: Record<string, any>;
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
  source_inline_tags?: InlineTag[];
  target_inline_tags?: InlineTag[];
  metadata?: SegmentMetadata;
  xliff_version?: string;
  variant?: string;
  match_percentage?: number;
}
