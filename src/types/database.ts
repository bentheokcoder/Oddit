export interface AudioFile {
  id: string;
  user_id: string | null;
  original_filename: string;
  storage_path: string;
  file_size: number;
  duration: number | null;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  audio_file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_storage_path: string | null;
  processed_file_size: number | null;
  processing_options: {
    remove_silence: boolean;
    silence_threshold: number;
    master_audio: boolean;
  };
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProcessingJobWithFile extends ProcessingJob {
  audio_file: AudioFile;
}
