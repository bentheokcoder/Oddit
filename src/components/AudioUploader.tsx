import { useState, useCallback } from 'react';
import { Upload, FileAudio } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function AudioUploader({ onFileSelect, isUploading }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));

    if (audioFile) {
      onFileSelect(audioFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 transition-all duration-200
        ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 bg-white'}
        ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400 hover:bg-gray-50'}
      `}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`
          p-6 rounded-full transition-all duration-200
          ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
        `}>
          {isUploading ? (
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileAudio className="w-12 h-12 text-gray-600" />
          )}
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isUploading ? 'Uploading your podcast...' : 'Drop your podcast audio here'}
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports MP3, WAV, AAC, M4A, OGG, FLAC (max 100MB)
          </p>
        </div>

        <label className={`
          inline-flex items-center px-6 py-3 rounded-lg font-medium
          transition-all duration-200 cursor-pointer
          ${isUploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
          }
        `}>
          <Upload className="w-5 h-5 mr-2" />
          Select Audio File
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
