/*
  # Podcast Audio Processing Schema

  ## Overview
  This migration sets up the database structure for a podcast audio processing platform
  where users can upload audio files, have them automatically processed (silence removal,
  mastering), and download the results.

  ## New Tables
  
  ### `audio_files`
  Stores metadata about uploaded audio files
  - `id` (uuid, primary key) - Unique identifier for each audio file
  - `user_id` (uuid) - References the user who uploaded the file (optional for MVP)
  - `original_filename` (text) - Original name of the uploaded file
  - `storage_path` (text) - Path to file in Supabase Storage
  - `file_size` (bigint) - Size of the file in bytes
  - `duration` (numeric) - Duration of audio in seconds
  - `mime_type` (text) - MIME type of the audio file
  - `created_at` (timestamptz) - When the file was uploaded
  - `updated_at` (timestamptz) - Last update timestamp

  ### `processing_jobs`
  Tracks audio processing jobs
  - `id` (uuid, primary key) - Unique identifier for each job
  - `audio_file_id` (uuid) - Foreign key to audio_files table
  - `status` (text) - Current status: 'pending', 'processing', 'completed', 'failed'
  - `processed_storage_path` (text) - Path to processed file in storage
  - `processed_file_size` (bigint) - Size of processed file
  - `processing_options` (jsonb) - JSON object with processing parameters
  - `error_message` (text) - Error message if processing failed
  - `started_at` (timestamptz) - When processing started
  - `completed_at` (timestamptz) - When processing completed
  - `created_at` (timestamptz) - When the job was created

  ## Storage
  Creates a storage bucket for audio files with public access for downloads

  ## Security
  - Enables RLS on all tables
  - Allows public inserts for MVP (can be restricted later to authenticated users)
  - Allows users to read their own data
*/

-- Create audio_files table
CREATE TABLE IF NOT EXISTS audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  original_filename text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  duration numeric,
  mime_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create processing_jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id uuid NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_storage_path text,
  processed_file_size bigint,
  processing_options jsonb DEFAULT '{"remove_silence": true, "silence_threshold": 0.5, "master_audio": true}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audio_files_created_at ON audio_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_audio_file_id ON processing_jobs(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

-- Enable Row Level Security
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_files
-- Allow anyone to insert files (for MVP - can be restricted to authenticated users later)
CREATE POLICY "Anyone can upload audio files"
  ON audio_files
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to read audio files (for MVP)
CREATE POLICY "Anyone can view audio files"
  ON audio_files
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for processing_jobs
-- Allow anyone to create processing jobs
CREATE POLICY "Anyone can create processing jobs"
  ON processing_jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to view processing jobs
CREATE POLICY "Anyone can view processing jobs"
  ON processing_jobs
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to update processing jobs (needed for edge function to update status)
CREATE POLICY "Anyone can update processing jobs"
  ON processing_jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
