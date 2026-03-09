import { useState, useEffect } from 'react';
import { Headphones } from 'lucide-react';
import { AudioUploader } from './components/AudioUploader';
import { ProcessingStatus } from './components/ProcessingStatus';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import type { ProcessingJobWithFile } from './types/database';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [jobs, setJobs] = useState<ProcessingJobWithFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();

    const interval = setInterval(() => {
      loadJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select(`
          *,
          audio_file:audio_files(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data as ProcessingJobWithFile[]);
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const audioDuration = await getAudioDuration(file);

      const { data: audioFile, error: dbError } = await supabase
        .from('audio_files')
        .insert({
          original_filename: file.name,
          storage_path: filePath,
          file_size: file.size,
          duration: audioDuration,
          mime_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const { error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          audio_file_id: audioFile.id,
          status: 'pending',
        });

      if (jobError) throw jobError;

      await loadJobs();
      triggerProcessing(audioFile.id);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        resolve(0);
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  const triggerProcessing = async (audioFileId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-audio`;

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_file_id: audioFileId }),
      });
    } catch (err) {
      console.error('Error triggering processing:', err);
    }
  };

  const handleDownload = async (job: ProcessingJobWithFile) => {
    if (!job.processed_storage_path) return;

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(job.processed_storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed-${job.audio_file.original_filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Headphones className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Podcast Audio Processor
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional audio mastering with automatic silence removal.
            Upload your podcast and let AI do the heavy lifting.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-12">
          <AudioUploader onFileSelect={handleFileSelect} isUploading={isUploading} />
        </div>

        <ProcessingStatus jobs={jobs} onDownload={handleDownload} />
      </div>
    </div>
  );
}

export default App;
