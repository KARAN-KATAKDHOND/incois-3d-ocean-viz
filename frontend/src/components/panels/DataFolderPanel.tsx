import { useState, useRef } from 'react';
import { useOceanStore } from '../../stores/oceanStore';

export function DataFolderPanel() {
  const activePage = useOceanStore((s) => s.activePage);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (activePage !== 'data') return null;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading & Processing file...");
    setProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress bar moving up to 90% while waiting for backend
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        setUploadStatus(`Success: ${file.name} uploaded and processed!`);
      } else {
        setUploadStatus(`Error: ${result.message || 'Upload failed'}`);
      }
    } catch (err) {
      console.error("Upload error", err);
      clearInterval(progressInterval);
      setUploadStatus(`Error: Failed to communicate with server`);
    } finally {
      setTimeout(() => setUploading(false), 1000);
    }
  };

  return (
    <div className="absolute top-4 left-64 w-80 glass-panel animate-fade-in flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'rgba(42, 108, 176, 0.2)' }}>
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#00e5ff' }}>📂 Data Folder</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        <p className="text-xs" style={{ color: '#7ec8e3' }}>
          Upload original data files (.nc, .csv) here. The backend data-pipeline will automatically convert them into optimized formats for the 3D globe.
        </p>

        {/* Upload Zone */}
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:bg-opacity-20"
          style={{ borderColor: 'rgba(0, 229, 255, 0.3)', backgroundColor: 'rgba(0, 229, 255, 0.05)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".nc,.csv"
            onChange={handleUpload}
            disabled={uploading}
          />
          <span className="text-2xl mb-2 block">☁️</span>
          <p className="text-xs font-semibold" style={{ color: '#e0f4fa' }}>
            {uploading ? 'Uploading...' : 'Click to Upload Data'}
          </p>
          <p className="text-[10px] mt-1" style={{ color: '#7ec8e3' }}>Supports .nc, .csv</p>
        </div>

        {uploading && (
          <div className="w-full bg-gray-800 rounded-full h-2 mt-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <div 
              className="h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }}
            ></div>
          </div>
        )}

        {uploadStatus && (
          <div className="p-2 rounded text-xs" style={{ 
            backgroundColor: uploadStatus.includes('Error') ? 'rgba(255, 50, 50, 0.1)' : 'rgba(50, 255, 100, 0.1)',
            color: uploadStatus.includes('Error') ? '#ff7777' : '#77ff77' 
          }}>
            {uploadStatus}
          </div>
        )}

        <hr style={{ borderColor: 'rgba(42, 108, 176, 0.2)' }} />

        {/* Available Files Section */}
        <div>
          <h3 className="text-xs font-semibold mb-2" style={{ color: '#4b9cd3' }}>Original Data Available</h3>
          <div className="bg-black bg-opacity-30 p-3 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-300">
              <span>📄</span>
              <span>noaa_sst_real.nc</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span>📄</span>
              <span>argo_profile_real.csv</span>
            </div>
          </div>
          <p className="text-[10px] mt-2 italic" style={{ color: '#7ec8e3' }}>
            These are the original downloaded files. Upload them above to process them through the pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
