/**
 * Professional Translation QA Dashboard
 *
 * Designed for Project Managers and Linguists
 * Comprehensive metrics, reporting, and quality insights
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PolarAngleAxis, RadarChart, Radar
} from 'recharts';
import {
  FileText, TrendingUp, AlertCircle, CheckCircle, Download,
  Printer, Calendar, Users, Globe, Activity, Award, Filter
} from 'lucide-react';

interface QAMetrics {
  totalSegments: number;
  translatedSegments: number;
  untranslatedSegments: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  avgQualityScore: number;
  completionPercentage: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  issuesByCategory: Record<string, number>;
}

interface DashboardProps {
  segments: any[];
  qaIssues: any[];
  aiPredictions: any[];
  fileName: string;
}

export const ProfessionalDashboard: React.FC<DashboardProps> = ({
  segments,
  qaIssues,
  aiPredictions,
  fileName
}) => {
  const [metrics, setMetrics] = useState<QAMetrics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('json');

  useEffect(() => {
    calculateMetrics();
  }, [segments, qaIssues, aiPredictions]);

  const calculateMetrics = () => {
    const translated = segments.filter((s: any) => s.target_text && s.target_text.trim()).length;
    const untranslated = segments.length - translated;

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};
    const issuesByCategory: Record<string, number> = {};

    qaIssues.forEach((issue: any) => {
      issuesByType[issue.check_type] = (issuesByType[issue.check_type] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    });

    aiPredictions.forEach((pred: any) => {
      pred.errors?.forEach((error: any) => {
        issuesByCategory[error.category] = (issuesByCategory[error.category] || 0) + 1;
      });
    });

    const errorCount = issuesBySeverity['error'] || 0;
    const warningCount = issuesBySeverity['warning'] || 0;
    const infoCount = issuesBySeverity['info'] || 0;
    const totalIssues = errorCount + warningCount + infoCount;

    // Calculate quality score (0-100)
    // Fewer issues = higher score
    const qualityScore = Math.max(0, 100 - (totalIssues * 5) - (errorCount * 10));

    setMetrics({
      totalSegments: segments.length,
      translatedSegments: translated,
      untranslatedSegments: untranslated,
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      avgQualityScore: Math.round(qualityScore),
      completionPercentage: segments.length > 0 ? Math.round((translated / segments.length) * 100) : 0,
      issuesByType,
      issuesBySeverity,
      issuesByCategory
    });
  };

  const handleExport = () => {
    const report = {
      fileName,
      timestamp: new Date().toISOString(),
      metrics,
      segments,
      issues: qaIssues,
      predictions: aiPredictions
    };

    let content = '';
    let filename = '';

    if (exportFormat === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `qa_report_${Date.now()}.json`;
    } else if (exportFormat === 'csv') {
      // CSV export
      const headers = ['Segment ID', 'Source', 'Target', 'Issue Type', 'Severity', 'Message'];
      const rows = qaIssues.map((issue: any) => [
        issue.segment_id,
        issue.source_text?.slice(0, 50) || '',
        issue.target_text?.slice(0, 50) || '',
        issue.check_type,
        issue.severity,
        issue.message
      ]);
      content = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      filename = `qa_report_${Date.now()}.csv`;
    }

    const dataUri = 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(content);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
  };

  if (!metrics) {
    return <div className="p-6">Loading metrics...</div>;
  }

  // Prepare chart data
  const severityData = [
    { name: 'Errors', value: metrics.errorCount, fill: '#ef4444' },
    { name: 'Warnings', value: metrics.warningCount, fill: '#f59e0b' },
    { name: 'Info', value: metrics.infoCount, fill: '#3b82f6' }
  ];

  const categoryData = Object.entries(metrics.issuesByCategory).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const typeData = Object.entries(metrics.issuesByType).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const qualityRadarData = [
    { category: 'Completion', value: metrics.completionPercentage },
    { category: 'Quality', value: metrics.avgQualityScore },
    { category: 'Errors', value: Math.max(0, 100 - (metrics.errorCount * 10)) },
    { category: 'Warnings', value: Math.max(0, 100 - (metrics.warningCount * 5)) }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-lg">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{fileName}</h1>
              <p className="text-gray-600">
                {new Date().toLocaleDateString()} • {segments.length} segments • QA Report
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Printer size={18} />
              Print
            </button>
            <div className="flex gap-2 border-l border-gray-300 pl-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<CheckCircle className="text-green-600" size={24} />}
          label="Completion"
          value={`${metrics.completionPercentage}%`}
          subtext={`${metrics.translatedSegments} / ${metrics.totalSegments} segments`}
          color="green"
        />
        <MetricCard
          icon={<Award className="text-blue-600" size={24} />}
          label="Quality Score"
          value={`${metrics.avgQualityScore}/100`}
          subtext={getQualityLevel(metrics.avgQualityScore)}
          color="blue"
        />
        <MetricCard
          icon={<AlertCircle className="text-red-600" size={24} />}
          label="Total Issues"
          value={metrics.totalIssues.toString()}
          subtext={`${metrics.errorCount} errors, ${metrics.warningCount} warnings`}
          color="red"
        />
        <MetricCard
          icon={<Activity className="text-purple-600" size={24} />}
          label="Issues/Segment"
          value={(metrics.totalIssues / Math.max(1, metrics.totalSegments)).toFixed(2)}
          subtext="Average per segment"
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Severity Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Issue Severity Distribution</h2>
          {severityData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No issues found
            </div>
          )}
        </div>

        {/* Quality Radar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Quality Metrics Radar</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={qualityRadarData}>
              <PolarAngleAxis dataKey="category" />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Issues by Category */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Issues by Category</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No categorized issues
            </div>
          )}
        </div>

        {/* Issues by Type */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Top Issue Types</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No issues found
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Summary Statistics</h2>
        <div className="grid grid-cols-5 gap-4">
          <SummaryItem label="Total Segments" value={metrics.totalSegments} />
          <SummaryItem label="Translated" value={metrics.translatedSegments} color="green" />
          <SummaryItem label="Untranslated" value={metrics.untranslatedSegments} color="red" />
          <SummaryItem label="Issues Found" value={metrics.totalIssues} color="orange" />
          <SummaryItem label="Quality" value={`${metrics.avgQualityScore}%`} color="blue" />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none;
          }
          .grid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

// Helper Components

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'blue' | 'red' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color
}) => {
  const bgColors = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50'
  };

  const borderColors = {
    green: 'border-green-200',
    blue: 'border-blue-200',
    red: 'border-red-200',
    purple: 'border-purple-200'
  };

  return (
    <div className={`${bgColors[color]} border ${borderColors[color]} rounded-lg p-6`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-600">{subtext}</p>
    </div>
  );
};

interface SummaryItemProps {
  label: string;
  value: string | number;
  color?: 'green' | 'red' | 'orange' | 'blue';
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, color = 'gray' }) => {
  const colors = {
    green: 'text-green-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600'
  };

  return (
    <div className="text-center p-4 border border-gray-200 rounded-lg">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
};

const renderLabel = (entry: any) => {
  if (entry.value === 0) return '';
  const percent = Math.round((entry.value / (entry.value + 1)) * 100);
  return `${entry.name}: ${entry.value}`;
};

function getQualityLevel(score: number): string {
  if (score >= 95) return 'Excellent';
  if (score >= 85) return 'Very Good';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Review';
}

export default ProfessionalDashboard;
