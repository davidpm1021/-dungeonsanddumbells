import { useState, useEffect } from 'react';
import { usePageView } from '../hooks/useAnalytics';

export default function AdminAnalytics() {
  usePageView('AdminAnalytics');

  const [summary, setSummary] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, engagementRes] = await Promise.all([
          fetch(`/api/analytics/summary?days=${days}`),
          fetch(`/api/analytics/user-engagement?days=${days}`),
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (engagementRes.ok) setEngagement(await engagementRes.json());
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [days]);

  return (
    <div className="min-h-screen bg-[#0a0118] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Analytics Dashboard</h1>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-[#1a0a2e] border border-amber-500/30 rounded px-4 py-2 text-amber-200"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Session Stats */}
            {engagement && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Sessions"
                  value={engagement.sessions?.total || 0}
                  icon="📊"
                />
                <StatCard
                  label="Avg Duration"
                  value={`${Math.round((engagement.sessions?.averageDurationSeconds || 0) / 60)}m`}
                  icon="⏱️"
                />
                <StatCard
                  label="Returning Users"
                  value={engagement.returningUsers?.count || 0}
                  icon="🔄"
                />
                <StatCard
                  label="Events/Session"
                  value={engagement.sessions?.averageEventsPerSession || 0}
                  icon="📈"
                />
              </div>
            )}

            {/* Event Breakdown */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Pages */}
                <Card title="Top Pages">
                  {summary.topPages?.length > 0 ? (
                    <ul className="space-y-2">
                      {summary.topPages.map((page, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">{page.page || 'Unknown'}</span>
                          <span className="text-amber-400">{page.views} views</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No page views recorded</p>
                  )}
                </Card>

                {/* Feature Usage */}
                <Card title="Feature Usage">
                  {summary.featureUsage?.length > 0 ? (
                    <ul className="space-y-2">
                      {summary.featureUsage.map((feature, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">{feature.feature || 'Unknown'}</span>
                          <span className="text-green-400">{feature.uses} uses</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No feature usage recorded</p>
                  )}
                </Card>

                {/* Quest Engagement */}
                <Card title="Quest Engagement">
                  {engagement?.questEngagement?.length > 0 ? (
                    <ul className="space-y-2">
                      {engagement.questEngagement.map((item, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300 capitalize">{item.action}</span>
                          <span className="text-purple-400">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No quest activity recorded</p>
                  )}
                </Card>

                {/* Health Activity */}
                <Card title="Health Activities">
                  {engagement?.healthEngagement?.length > 0 ? (
                    <ul className="space-y-2">
                      {engagement.healthEngagement.map((item, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300 capitalize">{item.activity_type}</span>
                          <span className="text-blue-400">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No health activities recorded</p>
                  )}
                </Card>
              </div>
            )}

            {/* Errors */}
            {summary?.errors?.length > 0 && (
              <Card title="Recent Errors" className="border-red-500/30">
                <ul className="space-y-3">
                  {summary.errors.map((error, i) => (
                    <li key={i} className="text-sm">
                      <div className="text-red-400 font-mono text-xs truncate">
                        {error.error_message}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {error.count} occurrences
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Daily Sessions Chart (simple text representation) */}
            {summary?.dailySessions?.length > 0 && (
              <Card title="Daily Activity">
                <div className="space-y-2">
                  {summary.dailySessions.slice(0, 7).map((day, i) => (
                    <div key={i} className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 w-24">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex-1 bg-[#1a0a2e] rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-amber-500/60"
                          style={{
                            width: `${Math.min(100, (day.sessions / Math.max(...summary.dailySessions.map(d => d.sessions))) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-amber-400 w-16 text-right">{day.sessions} sessions</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-[#1a0a2e]/50 border border-amber-500/20 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-2xl font-bold text-amber-400">{value}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-[#1a0a2e]/50 border border-amber-500/20 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-amber-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}
