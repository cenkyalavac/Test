/**
 * QA Results Charts Panel
 * Visualizes QA check results with charts and statistics
 */

import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { QAResults } from '../types'

interface QAChartsPanelProps {
  qaResults: QAResults
}

export function QAChartsPanel({ qaResults }: QAChartsPanelProps) {
  // Prepare severity data
  const severityData = [
    {
      name: 'Errors',
      value: qaResults.summary.by_severity?.error || 0,
      color: '#EF4444'
    },
    {
      name: 'Warnings',
      value: qaResults.summary.by_severity?.warning || 0,
      color: '#F59E0B'
    },
    {
      name: 'Info',
      value: qaResults.summary.by_severity?.info || 0,
      color: '#3B82F6'
    }
  ].filter(item => item.value > 0)

  // Prepare check type data (top 8)
  const checkTypeData = Object.entries(qaResults.summary.by_type || {})
    .map(([type, count]) => ({
      name: type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count: count as number,
      shortName: type.substring(0, 12)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4']

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg border border-red-600/50">
          <p className="text-sm font-semibold text-red-400 mb-2">Critical Errors</p>
          <p className="text-4xl font-bold text-red-300">
            {qaResults.summary.by_severity?.error || 0}
          </p>
          <p className="text-xs text-red-400/70 mt-2">Requires immediate fix</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg border border-yellow-600/50">
          <p className="text-sm font-semibold text-yellow-400 mb-2">Warnings</p>
          <p className="text-4xl font-bold text-yellow-300">
            {qaResults.summary.by_severity?.warning || 0}
          </p>
          <p className="text-xs text-yellow-400/70 mt-2">Review recommended</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border border-blue-600/50">
          <p className="text-sm font-semibold text-blue-400 mb-2">Information</p>
          <p className="text-4xl font-bold text-blue-300">
            {qaResults.summary.by_severity?.info || 0}
          </p>
          <p className="text-xs text-blue-400/70 mt-2">FYI only</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Severity Distribution Pie Chart */}
        {severityData.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Check Types Bar Chart */}
        {checkTypeData.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Issues by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={checkTypeData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="shortName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12, fill: '#94A3B8' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#FFF'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]}>
                  {checkTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mode and Checker Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <p className="text-sm font-semibold text-slate-300 mb-3">QA Mode</p>
          <p className="text-2xl font-bold text-cyan-400 capitalize">
            {qaResults.mode}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {qaResults.mode === 'fast' && 'Quick checks without spell-checking'}
            {qaResults.mode === 'balanced' && 'Recommended checks without spell-checking'}
            {qaResults.mode === 'full' && 'All checks including spell-checking'}
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <p className="text-sm font-semibold text-slate-300 mb-3">Checker Type</p>
          <p className="text-2xl font-bold text-blue-400 capitalize">
            {qaResults.checker_type || 'advanced'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {qaResults.checker_type === 'comprehensive' && 'Strict rules with false-positive prevention'}
            {qaResults.checker_type === 'advanced' && '16 advanced quality checks'}
          </p>
        </div>
      </div>

      {/* All Check Types List */}
      {Object.entries(qaResults.summary.by_type || {}).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Complete Check Summary</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(qaResults.summary.by_type || {})
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([type, count], index) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-slate-300">
                      {type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-200">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
