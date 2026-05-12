'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

type Document = {
  id: string;
  type: string;
  filename: string;
  status: string;
  uploadedAt: string;
};

const documentTypes = [
  { label: 'FSSAI', value: 'FSSAI' },
  { label: 'GST', value: 'GST' },
  { label: 'Bank', value: 'BANK' },
];

export default function RestaurantDocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [type, setType] = useState('FSSAI');
  const [filename, setFilename] = useState('');
  const [s3Key, setS3Key] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/restaurants/${params.id}/documents`);
      setDocuments(response.data);
      setError('');
    } catch (err) {
      setError('Unable to load documents.');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [params.id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFilename(file.name);
      setS3Key(`documents/${params.id}/${type.toLowerCase()}/${file.name}`);
      setMessage('');
      setError('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!filename) {
      setError('Please choose a file or enter a filename.');
      return;
    }

    try {
      await api.post(`/restaurants/${params.id}/documents`, {
        type,
        filename,
        s3Key: s3Key || `documents/${params.id}/${type.toLowerCase()}/${filename}`,
      });
      setFilename('');
      setS3Key('');
      setMessage('Document uploaded successfully.');
      fetchDocuments();
    } catch (err) {
      setError('Unable to upload document.');
    }
  };

  return (
    <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Restaurant Documents</h1>
              <p className="mt-2 text-slate-600">Upload compliance and bank documents for restaurant {params.id}.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.back()} className="rounded-2xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button onClick={() => router.push(`/restaurants/${params.id}`)} className="rounded-2xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
                Restaurant
              </button>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Upload document</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Document type</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                >
                  {documentTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">File</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Filename</span>
                <input
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                  placeholder="Enter filename or choose a file"
                />
              </label>
              <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">
                Upload document
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Uploaded documents</h2>
            {documents.length === 0 ? (
              <p className="mt-4 text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {documents.map((document) => (
                  <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{document.type}</p>
                        <p className="text-sm text-slate-500">{document.filename}</p>
                      </div>
                      <div className="space-y-1 text-right text-sm text-slate-500">
                        <p>Status: {document.status}</p>
                        <p>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
