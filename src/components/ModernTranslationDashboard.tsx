import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Download, Filter } from 'lucide-react';
import type { Segment } from '../types';

interface SegmentWithMatch extends Segment {
  match_percentage?: number;
}

interface FilterOptions {
  minMatch: number;
  maxMatch: number;
  status: string[];
  variant: string[];
}

interface DashboardStats {
  totalSegments: number;
  averageMatch: number;
  translatedCount: number;
  needsReviewCount: number;
  fuzzyMatchCount: number;
  perfectMatchCount: number;
}

export const ModernTranslationDashboard: React.FC<{ segments: SegmentWithMatch[]; qaResults?: any }> = ({ segments, qaResults }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    minMatch: 0,
    maxMatch: 100,
    status: [],
    variant: [],
  });

  const [showFilters, setShowFilters] = useState(false);

  // Calculate statistics
  const stats = useMemo((): DashboardStats => {
    const filtered = segments.filter(seg => {
      const match = seg.match_percentage || 0;
      const status = seg.status || 'unknown';
      const variant = seg.variant || 'standard';
      const statusOk = filterOptions.status.length === 0 || filterOptions.status.includes(status);
      const variantOk = filterOptions.variant.length === 0 || filterOptions.variant.includes(variant);
      return match >= filterOptions.minMatch && match <= filterOptions.maxMatch && statusOk && variantOk;
    });

    const translated = filtered.filter(s => s.status === 'translated').length;
    const needsReview = filtered.filter(s => s.status === 'needs-review').length;
    const fuzzy = filtered.filter(s => (s.match_percentage || 0) > 50 && (s.match_percentage || 0) < 100).length;
    const perfect = filtered.filter(s => (s.match_percentage || 0) === 100).length;

    const avgMatch = filtered.length > 0
      ? Math.round(filtered.reduce((sum, s) => sum + (s.match_percentage || 0), 0) / filtered.length)
      : 0;

    return {
      totalSegments: filtered.length,
      averageMatch: avgMatch,
      translatedCount: translated,
      needsReviewCount: needsReview,
      fuzzyMatchCount: fuzzy,
      perfectMatchCount: perfect,
    };
  }, [segments, filterOptions]);

  // Match distribution chart data
  const matchDistribution = useMemo(() => {
    const bins = [
      { range: '0-25%', count: 0, color: '#ef4444' },
      { range: '25-50%', count: 0, color: '#f97316' },
      { range: '50-75%', count: 0, color: '#eab308' },
      { range: '75-100%', count: 0, color: '#22c55e' },
      { range: '100%', count: 0, color: '#0ea5e9' },
    ];

    segments.forEach(seg => {
      const match = seg.match_percentage || 0;
      if (match === 100) bins[4].count++;
      else if (match >= 75) bins[3].count++;
      else if (match >= 50) bins[2].count++;
      else if (match >= 25) bins[1].count++;
      else bins[0].count++;
    });

    return bins;
  }, [segments]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    segments.forEach(seg => {
      dist[seg.status] = (dist[seg.status] || 0) + 1;
    });
    return Object.entries(dist).map(([status, count]) => ({ status, count }));
  }, [segments]);

  // Variant distribution
  const variants = useMemo(() => {
    const uniqueVariants = [...new Set(segments.map(s => s.variant || 'standard'))];
    return uniqueVariants;
  }, [segments]);

  const handleExport = (format: 'json' | 'csv') => {
    const filtered = segments.filter(seg => {
      const match = seg.match_percentage || 0;
      return match >= filterOptions.minMatch && match <= filterOptions.maxMatch;
    });

    if (format === 'json') {
      const data = JSON.stringify(filtered, null, 2);
      downloadFile(data, 'segments.json', 'application/json');
    } else {
      const csv = convertToCSV(filtered);
      downloadFile(csv, 'segments.csv', 'text/csv');
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: SegmentWithMatch[]): string => {
    const headers = ['ID', 'Source', 'Target', 'Status', 'Match %', 'Variant'];
    const rows = data.map(seg => [
      seg.segment_id,
      seg.source_text.substring(0, 50),
      seg.target_text.substring(0, 50),
      seg.status,
      seg.match_percentage || 'N/A',
      seg.variant || 'standard',
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Translation QA Dashboard</h1>
        <p className="text-slate-400">Advanced quality analysis with match percentage filtering</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Total Segments"
          value={stats.totalSegments}
          icon="📊"
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Avg Match %"
          value={`${stats.averageMatch}%`}
          icon="📈"
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Translated"
          value={stats.translatedCount}
          icon="✓"
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Needs Review"
          value={stats.needsReviewCount}
          icon="⚠"
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          title="Fuzzy Match"
          value={stats.fuzzyMatchCount}
          icon="~"
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Perfect Match"
          value={stats.perfectMatchCount}
          icon="✨"
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Filter size={20} /> Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-slate-400 hover:text-white transition"
          >
            {showFilters ? '▼' : '▶'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-slate-400">Min Match %</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filterOptions.minMatch}
                onChange={(e) => setFilterOptions({ ...filterOptions, minMatch: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="text-white font-semibold">{filterOptions.minMatch}%</span>
            </div>
            <div>
              <label className="text-sm text-slate-400">Max Match %</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filterOptions.maxMatch}
                onChange={(e) => setFilterOptions({ ...filterOptions, maxMatch: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="text-white font-semibold">{filterOptions.maxMatch}%</span>
            </div>
            <div>
              <label className="text-sm text-slate-400">Variants</label>
              <select
                multiple
                value={filterOptions.variant}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  variant: Array.from(e.target.selectedOptions, o => o.value)
                })}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
              >
                {variants.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('json')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
              >
                <Download size={16} /> JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
              >
                <Download size={16} /> CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Match Distribution */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Match Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={matchDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="range" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Bar dataKey="count" fill="#3b82f6">
                {matchDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.count}`}
                outerRadius={80}
                fill="#3b82f6"
                dataKey="count"
              >
                {statusDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#6366f1'][index % 4]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segments Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Segments</h3>
          {segments.length > 10 && (
            <p className="text-sm text-slate-400">Showing 10 of {segments.length} segments</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Source</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Target</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Match %</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Variant</th>
              </tr>
            </thead>
            <tbody>
              {segments.filter(seg => {
                const match = seg.match_percentage || 0;
                return match >= filterOptions.minMatch && match <= filterOptions.maxMatch;
              }).slice(0, 10).map((segment, idx) => (
                <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/30 transition">
                  <td className="px-6 py-3 text-sm text-slate-300">{segment.segment_id}</td>
                  <td className="px-6 py-3 text-sm text-slate-400 truncate max-w-xs">{segment.source_text.substring(0, 50)}</td>
                  <td className="px-6 py-3 text-sm text-slate-400 truncate max-w-xs">{segment.target_text.substring(0, 50)}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(segment.status)}`}>
                      {segment.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${getMatchColor(segment.match_percentage || 0)}`}
                          style={{ width: `${segment.match_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-slate-300 min-w-fit">{segment.match_percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-400">{segment.variant || 'standard'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QA Results Section */}
      {qaResults && (
        <div className="mt-8 p-6 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/20 rounded-lg">
          <h2 className="text-2xl font-bold text-blue-300 mb-4">QA Check Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <p className="text-blue-300 text-sm font-medium">Total Issues</p>
              <p className="text-3xl font-bold text-blue-400">{qaResults.total_issues}</p>
            </div>
            {qaResults.summary?.by_severity?.error !== undefined && (
              <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                <p className="text-red-300 text-sm font-medium">Errors</p>
                <p className="text-3xl font-bold text-red-400">{qaResults.summary.by_severity.error || 0}</p>
              </div>
            )}
            {qaResults.summary?.by_severity?.warning !== undefined && (
              <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                <p className="text-yellow-300 text-sm font-medium">Warnings</p>
                <p className="text-3xl font-bold text-yellow-400">{qaResults.summary.by_severity.warning || 0}</p>
              </div>
            )}
            {qaResults.summary?.by_severity?.info !== undefined && (
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <p className="text-green-300 text-sm font-medium">Infos</p>
                <p className="text-3xl font-bold text-green-400">{qaResults.summary.by_severity.info || 0}</p>
              </div>
            )}
          </div>

          {/* Issues by Type */}
          {qaResults.summary?.by_type && Object.keys(qaResults.summary.by_type).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Issues by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(qaResults.summary.by_type).map(([type, count]: [string, any]) => (
                  <div key={type} className="bg-slate-700/30 p-3 rounded-lg border border-slate-600/50 text-center">
                    <p className="text-slate-400 text-xs font-medium uppercase">{type.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Issues List */}
          {qaResults.issues && qaResults.issues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">
                Issue Details (Showing first 20 of {qaResults.issues.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {qaResults.issues.slice(0, 20).map((issue: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    issue.severity === 'error' ? 'bg-red-900/20 border-red-500/30' :
                    issue.severity === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                    'bg-blue-900/20 border-blue-500/30'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          issue.severity === 'error' ? 'bg-red-500/30 text-red-300' :
                          issue.severity === 'warning' ? 'bg-yellow-500/30 text-yellow-300' :
                          'bg-blue-500/30 text-blue-300'
                        }`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                          {issue.check_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">Seg #{issue.segment_id}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 mb-1">{issue.message}</p>
                    {(issue.source_text || issue.target_text) && (
                      <div className="text-xs text-slate-400 space-y-1">
                        {issue.source_text && <p><strong>Source:</strong> {issue.source_text.substring(0, 80)}</p>}
                        {issue.target_text && <p><strong>Target:</strong> {issue.target_text.substring(0, 80)}</p>}
                      </div>
                    )}
                    {issue.details && Object.keys(issue.details).length > 0 && (
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-600/30">
                        {Object.entries(issue.details).map(([key, value]: [string, any]) => (
                          <p key={key}><strong>{key}:</strong> {String(value).substring(0, 60)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium opacity-90">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </div>
      <div className="text-3xl opacity-30">{icon}</div>
    </div>
  </div>
);

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    translated: 'bg-green-500/20 text-green-300',
    'needs-review': 'bg-amber-500/20 text-amber-300',
    'needs-translation': 'bg-red-500/20 text-red-300',
    reviewed: 'bg-blue-500/20 text-blue-300',
    draft: 'bg-gray-500/20 text-gray-300',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-300';
};

const getMatchColor = (percentage: number): string => {
  if (percentage === 100) return 'bg-blue-500';
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};
