export function requireReportBranchId(reportBranchId) {
  if (!reportBranchId) {
    throw new Error('K6_REPORT_BRANCH_ID is required for report isolation');
  }
  return reportBranchId;
}

export function extractBranchItems(payload) {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function assertAccessibleReportBranch(payload, reportBranchId) {
  const branchId = requireReportBranchId(reportBranchId);
  const branches = extractBranchItems(payload);
  if (!branches.some((branch) => branch?.id === branchId)) {
    throw new Error(
      `K6_REPORT_BRANCH_ID does not identify an accessible branch: ${branchId}`,
    );
  }
  return branchId;
}
