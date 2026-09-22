'use client';
import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useMemo } from 'react';
import { testingCyclesApi, bugsApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  RotateCcw,
  Bug,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Search,
} from 'lucide-react';

interface TestingCycleItem {
  id: string;
  projectId: string;
  name: string;
  cycleNumber: number;
  description?: string;
  type: string;
  status: string;
  environment: string;
  project?: {
    id: string;
    key: string;
    name: string;
  };
}

interface BugItem {
  id: string;
  issueKey: string;
  projectId: string;
  testingCycleId?: string;
  severity: string;
  priority: string;
  status: string;
}

export default function DeveloperAllCyclesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [allCycles, setAllCycles] = useState<TestingCycleItem[]>([]);
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      testingCyclesApi.list(),
      bugsApi.list({ assignedTo: user.id, limit: 100 }),
    ])
      .then(([cyclesRes, bugsRes]) => {
        const cycles: TestingCycleItem[] = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any)?.data || [];
        setAllCycles(cycles);
        setAssignedBugs(bugsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Cycles that have bugs assigned to this developer
  const devCycles = useMemo(() => {
    return allCycles
      .map((cycle) => {
        const cycleBugs = assignedBugs.filter((b) => b.testingCycleId === cycle.id);
        const criticalCount = cycleBugs.filter((b) => b.severity === 'CRITICAL' || b.priority === 'P1').length;
        return {
          ...cycle,
          devBugsCount: cycleBugs.length,
          criticalCount,
        };
      })
      .filter((cycle) => {
        if (cycle.status === 'PLANNED') return false;
        if (cycle.devBugsCount === 0) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            cycle.name.toLowerCase().includes(q) ||
            cycle.project?.name?.toLowerCase().includes(q) ||
            cycle.project?.key?.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [allCycles, assignedBugs, searchQuery]);

  return (
    <AppLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '20px',
        }}>
          <Link
            href="/developer"
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} />
            <span>Developer Console</span>
          </Link>
          <ChevronRight size={14} />
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Assigned Testing Cycles</span>
        </div>

        {/* Header Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RotateCcw size={22} style={{ color: '#0F3A56' }} />
              <span>Assigned Testing Cycles</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(15, 58, 86, 0.08)',
                color: '#0F3A56',
                border: '1px solid rgba(15, 58, 86, 0.2)',
              }}>
                {devCycles.length}
              </span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              Testing cycles across your projects that have defects assigned to you. Click any cycle to view and update its defects.
            </p>
          </div>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cycles or projects..."
              className="input"
              style={{ paddingLeft: '32px', height: '36px', fontSize: '12.5px', borderRadius: '8px' }}
            />
          </div>
        </div>

        {/* Cycles Grid */}
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading testing cycles...</p>
          </div>
        ) : devCycles.length === 0 ? (
          <div className="card" style={{ padding: '44px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <RotateCcw size={36} style={{ color: 'var(--color-text-faint)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
              No Testing Cycles Found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              No active testing cycles have defects assigned to you right now.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}>
            {devCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="card"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {cycle.project && (
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2.5px 7px',
                        borderRadius: '5px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#4f46e5',
                      }}>
                        {cycle.project.key}
                      </span>
                    )}
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: '#e0e7ff',
                      color: '#4338ca',
                    }}>
                      Cycle {cycle.cycleNumber || '01'}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#ecfdf5',
                      color: '#065f46',
                    }}>
                      {cycle.environment || 'QA'}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: cycle.status === 'IN_PROGRESS' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      color: cycle.status === 'IN_PROGRESS' ? '#7c3aed' : '#2563eb',
                      marginLeft: 'auto',
                    }}>
                      {cycle.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 8px' }}>
                    {cycle.name}
                  </h3>

                  {cycle.description && (
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                      lineHeight: '1.45',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {cycle.description}
                    </p>
                  )}
                </div>

                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bug size={16} style={{ color: '#4f46e5' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>
                      {cycle.devBugsCount} Assigned {cycle.devBugsCount === 1 ? 'Defect' : 'Defects'}
                    </span>
                  </div>

                  {cycle.criticalCount > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                      {cycle.criticalCount} Critical
                    </span>
                  )}
                </div>

                <Link
                  href={`/developer/cycles/${cycle.id}/bugs`}
                  className="btn btn-primary"
                  style={{
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>View Assigned Defects</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
