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
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        return cycle.devBugsCount > 0;
      });
  }, [allCycles, assignedBugs]);

  const totalPages = Math.max(1, Math.ceil(devCycles.length / pageSize));
  const paginatedCycles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return devCycles.slice(start, start + pageSize);
  }, [devCycles, currentPage, pageSize]);

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
          marginBottom: '20px',
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
        </div>

        {/* Results Count, View Mode Switcher, and Per Page Bar (Image 1 Unified Model) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          {/* Left: Shown Entries Counter */}
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Showing {devCycles.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, devCycles.length)}`} of {devCycles.length} {devCycles.length === 1 ? 'cycle' : 'cycles'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher: Table vs Grid */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '7px',
              border: '1px solid var(--color-border)',
              gap: '2px',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 9px', height: '28px', fontSize: '11.5px', gap: '4px', borderRadius: '5px' }}
                title="Table View"
              >
                <TableIcon size={13} />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 9px', height: '28px', fontSize: '11.5px', gap: '4px', borderRadius: '5px' }}
                title="Grid View"
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
            </div>

            {/* Per-Page Picker Pills (Matching Image 1) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <span>Per page:</span>
              {[10, 20, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: pageSize === size ? 'linear-gradient(135deg, #1d68f2 0%, #1155d7 100%)' : '#ffffff',
                    color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                    border: pageSize === size ? '1px solid #1155d7' : '1px solid var(--color-border)',
                    boxShadow: pageSize === size ? '0 2px 6px rgba(17, 85, 215, 0.35)' : 'none',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: '700',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '28px', padding: '0 8px', fontSize: '12px', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', padding: '0 4px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '28px', padding: '0 8px', fontSize: '12px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Section: Loading, Empty, Grid View, or Responsive Table */}
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
        ) : viewMode === 'grid' ? (
          /* Grid View Option */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}>
            {paginatedCycles.map((cycle) => (
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
                  background: '#ffffff',
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
                    textDecoration: 'none',
                  }}
                >
                  <span>View Assigned Defects</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          /* High-Density Modern & 100% Responsive Table View */
          <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-xs)',
            background: '#ffffff',
          }}>
            <div style={{
              overflowX: 'auto',
              width: '100%',
              WebkitOverflowScrolling: 'touch',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>S.No</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Cycle Name</th>
                    <th style={{ padding: '12px 14px', width: '90px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Project</th>
                    <th style={{ padding: '12px 14px', width: '120px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 14px', width: '140px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Assigned Defects</th>
                    <th style={{ padding: '12px 14px', width: '130px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCycles.map((cycle, index) => {
                    const serialNumber = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr
                        key={cycle.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Serial Number */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {serialNumber}
                        </td>

                        {/* Name & Description */}
                        <td style={{ padding: '12px 14px' }}>
                          <Link
                            href={`/developer/cycles/${cycle.id}/bugs`}
                            style={{
                              fontWeight: '700',
                              color: 'var(--color-text)',
                              textDecoration: 'none',
                              fontSize: '13px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{cycle.name}</span>
                          </Link>
                          {cycle.description && (
                            <p style={{
                              fontSize: '11.5px',
                              color: 'var(--color-text-muted)',
                              margin: '2px 0 0',
                              lineHeight: '1.3',
                              maxWidth: '420px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {cycle.description}
                            </p>
                          )}
                        </td>

                        {/* Project */}
                        <td style={{ padding: '12px 14px' }}>
                          {cycle.project ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '2.5px 7px',
                              borderRadius: '5px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#4f46e5',
                            }}>
                              {cycle.project.key}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: cycle.status === 'IN_PROGRESS' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: cycle.status === 'IN_PROGRESS' ? '#7c3aed' : '#2563eb',
                            whiteSpace: 'nowrap',
                          }}>
                            {cycle.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Assigned Defects */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              color: '#4f46e5',
                            }}>
                              <Bug size={13} />
                              {cycle.devBugsCount}
                            </span>
                            {cycle.criticalCount > 0 && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                              }}>
                                {cycle.criticalCount} crit
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Button */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link
                            href={`/developer/cycles/${cycle.id}/bugs`}
                            className="btn btn-sm btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '11.5px',
                              padding: '5px 12px',
                              borderRadius: '7px',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none',
                            }}
                          >
                            <span>View Defects</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Pagination Bar if multiple pages */}
        {!loading && devCycles.length > pageSize && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            paddingTop: '16px',
          }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm"
              style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text-secondary)', padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="btn btn-secondary btn-sm"
              style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
