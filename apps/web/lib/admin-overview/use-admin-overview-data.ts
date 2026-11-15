'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { recentReportPeriod } from '../reports/supervisor-report-metrics';
import {
  getAdminOverviewActivity,
  getAdminOverviewMaterialization,
  getAdminOverviewMetrics,
  getAdminOverviewPendingApprovals,
  getAdminOverviewReports,
  OverviewApiError,
  type AdminOverviewAuditEvent,
  type AdminOverviewMaterialization,
  type AdminOverviewMetrics,
  type AdminOverviewPendingApprovals,
  type AdminOverviewReportData,
} from './api';

type SectionId =
  'reports' | 'materialization' | 'approvals' | 'activity' | 'activeCards';
type SectionState<T> = {
  status: 'loading' | 'ready' | 'empty' | 'error';
  data: T | null;
  error: OverviewApiError | null;
};
type SectionData = {
  reports: AdminOverviewReportData;
  activeCards: AdminOverviewMetrics;
  materialization: AdminOverviewMaterialization;
  approvals: AdminOverviewPendingApprovals;
  activity: { items: AdminOverviewAuditEvent[] };
};

function initialState<T>(): SectionState<T> {
  return { status: 'loading', data: null, error: null };
}

function failedStateError(error: unknown): OverviewApiError {
  if (error instanceof OverviewApiError) return error;
  return new OverviewApiError(
    0,
    'UNEXPECTED_CLIENT_ERROR',
    'Unable to load this section',
    'Check your connection and try again.',
    null,
    null,
  );
}

export function useAdminOverviewData() {
  const period = useMemo(() => recentReportPeriod(7), []);
  const [reports, setReports] =
    useState<SectionState<AdminOverviewReportData>>(initialState);
  const [activeCards, setActiveCards] =
    useState<SectionState<AdminOverviewMetrics>>(initialState);
  const [materialization, setMaterialization] =
    useState<SectionState<AdminOverviewMaterialization>>(initialState);
  const [approvals, setApprovals] =
    useState<SectionState<AdminOverviewPendingApprovals>>(initialState);
  const [activity, setActivity] =
    useState<SectionState<{ items: AdminOverviewAuditEvent[] }>>(initialState);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);
  const pending = useRef(new Map<SectionId, Promise<void>>());
  const retryAfter = useRef<Record<SectionId, number | null>>({
    reports: null,
    materialization: null,
    approvals: null,
    activity: null,
    activeCards: null,
  });

  const loadSection = useCallback(
    <T extends SectionData[SectionId]>(
      id: SectionId,
      load: () => Promise<T>,
      isEmpty: (data: T) => boolean,
    ) => {
      const inFlight = pending.current.get(id);
      if (inFlight) return inFlight;
      const blockedUntil = retryAfter.current[id];
      if (blockedUntil !== null && blockedUntil > Date.now()) {
        return Promise.resolve();
      }

      const setState = {
        reports: setReports,
        materialization: setMaterialization,
        approvals: setApprovals,
        activity: setActivity,
        activeCards: setActiveCards,
      }[id] as Dispatch<SetStateAction<SectionState<T>>>;

      setState((current) => ({ ...current, status: 'loading', error: null }));
      const request = load()
        .then((data) => {
          retryAfter.current[id] = null;
          if (mounted.current) {
            setState({
              status: isEmpty(data) ? 'empty' : 'ready',
              data,
              error: null,
            });
          }
        })
        .catch((error: unknown) => {
          const apiError = failedStateError(error);
          retryAfter.current[id] = apiError.retryAt;
          if (mounted.current) {
            setState((current) => ({
              ...current,
              status: 'error',
              error: apiError,
            }));
          }
        })
        .finally(() => {
          pending.current.delete(id);
        });
      pending.current.set(id, request);
      return request;
    },
    [],
  );

  const loadActiveCards = useCallback(
    () => loadSection('activeCards', getAdminOverviewMetrics, () => false),
    [loadSection],
  );
  const loadReports = useCallback(
    () =>
      loadSection(
        'reports',
        () => getAdminOverviewReports(period),
        (data) => !data.items.length,
      ),
    [loadSection, period],
  );
  const loadMaterialization = useCallback(
    () =>
      loadSection(
        'materialization',
        getAdminOverviewMaterialization,
        (data) => data.status === null,
      ),
    [loadSection],
  );
  const loadApprovals = useCallback(
    () =>
      loadSection(
        'approvals',
        getAdminOverviewPendingApprovals,
        (data) => data.totalCount === null,
      ),
    [loadSection],
  );
  const loadActivity = useCallback(
    () =>
      loadSection(
        'activity',
        async () => {
          const result = await getAdminOverviewActivity();
          return { items: result.items };
        },
        (data) => !data.items.length,
      ),
    [loadSection],
  );

  const refreshAll = useCallback(() => {
    return Promise.all([
      loadReports(),
      loadActiveCards(),
      loadMaterialization(),
      loadApprovals(),
      loadActivity(),
    ]);
  }, [
    loadActiveCards,
    loadActivity,
    loadApprovals,
    loadMaterialization,
    loadReports,
  ]);

  useEffect(() => {
    mounted.current = true;
    void refreshAll();
    return () => {
      mounted.current = false;
    };
  }, [refreshAll]);

  const cooldownActive = [
    reports,
    activeCards,
    materialization,
    approvals,
    activity,
  ].some((section) => (section.error?.retryAt ?? 0) > now);

  useEffect(() => {
    if (!cooldownActive) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldownActive]);

  return {
    period,
    reports,
    activeCards,
    materialization,
    approvals,
    activity,
    now,
    cooldownActive,
    loadReports,
    loadActiveCards,
    loadMaterialization,
    loadApprovals,
    loadActivity,
    refreshAll,
  };
}
