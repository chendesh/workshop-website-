import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { formatDate } from '../../utils/formatters';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWeekly = async () => {
    if (!startDate || !endDate) return toast.error('Please select both start and end dates');
    setGenerating(true);
    try {
      await api.post('/reports/weekly', { periodStart: startDate, periodEnd: endDate });
      toast.success('Weekly report generated');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate weekly report');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMonthly = async () => {
    if (!startDate || !endDate) return toast.error('Please select both start and end dates');
    setGenerating(true);
    try {
      await api.post('/reports/monthly', { periodStart: startDate, periodEnd: endDate });
      toast.success('Monthly report generated');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate monthly report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId) => {
    try {
      const res = await api.get(`/reports/download/${reportId}`);
      if (res.data.data.fileUrl) {
          window.open(res.data.data.fileUrl, '_blank');
      } else {
          toast.error("Download URL not available yet");
      }
    } catch (error) {
      // The endpoint returns binary data for download directly via res.send.
      // So if it succeeds via an API call, we need a way to trigger download in browser.
      // Easiest is to window.open the download endpoint url.
      const token = localStorage.getItem('digiwork_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:5000/api';
      // We can't easily pass headers via window.open so if auth is required, we do it via fetch.
      toast('Downloading file...');
      try {
        const response = await fetch(`${apiUrl}/reports/download/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Find filename from reports array
        const rep = reports.find(r => r.id === reportId);
        a.download = rep ? rep.fileName : 'report';
        
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        toast.error('Failed to download report');
      }
    }
  };

  const columns = [
    { key: 'type', label: 'Type', render: (val) => val === 'weekly' ? 'Weekly (Excel)' : 'Monthly (PDF)' },
    { key: 'periodStart', label: 'Period Start', render: (val) => formatDate(val) },
    { key: 'periodEnd', label: 'Period End', render: (val) => formatDate(val) },
    { key: 'generatedAt', label: 'Generated At', render: (val) => formatDate(val) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, report) => (
        <button 
          onClick={() => handleDownload(report.id)} 
          className="text-amber-500 hover:text-amber-400 flex items-center gap-1"
        >
          <Download className="w-4 h-4" /> Download
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">Reports</h1>
          <p className="text-slate-400">Generate and download structured business reports.</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
          <div>
             <label className="block text-xs text-slate-400 mb-1">Start Date</label>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onKeyDown={(e) => e.preventDefault()} className="bg-slate-900 border border-slate-600 rounded p-1.5 text-sm text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">End Date</label>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onKeyDown={(e) => e.preventDefault()} className="bg-slate-900 border border-slate-600 rounded p-1.5 text-sm text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={handleGenerateWeekly}
              disabled={generating}
              className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/50 px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={handleGenerateMonthly}
              disabled={generating}
              className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/50 px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          searchKey="type"
        />
      </div>
    </div>
  );
}
