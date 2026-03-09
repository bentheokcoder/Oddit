import { Download, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface ProcessingJob {
  id: string;
  audio_file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_storage_path: string | null;
  error_message: string | null;
  created_at: string;
  audio_file: {
    original_filename: string;
    file_size: number;
  };
}

interface ProcessingStatusProps {
  jobs: ProcessingJob[];
  onDownload: (job: ProcessingJob) => void;
}

export function ProcessingStatus({ jobs, onDownload }: ProcessingStatusProps) {
  if (jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready';
      case 'failed':
        return 'Failed';
    }
  };

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Podcasts</h2>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {getStatusIcon(job.status)}

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {job.audio_file.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(job.audio_file.file_size)}
                  </p>

                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {getStatusText(job.status)}
                    </span>
                  </div>

                  {job.error_message && (
                    <p className="text-sm text-red-600 mt-2">
                      {job.error_message}
                    </p>
                  )}
                </div>
              </div>

              {job.status === 'completed' && (
                <button
                  onClick={() => onDownload(job)}
                  className="ml-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
