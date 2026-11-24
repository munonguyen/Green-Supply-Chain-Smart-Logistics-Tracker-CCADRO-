export function hasCurrentSafetyPass(data, container, now = Date.now()) {
  const inspection = data?.inspection;
  const inspectedAt = Date.parse(inspection?.inspectedAt);
  return Boolean(inspection && inspection.status === 'PASSED'
    && inspection.containerType === container.containerType && data.containerType === container.containerType
    && inspection.templateVersion === data.templateVersion
    && Number.isFinite(inspectedAt) && now - inspectedAt <= 24 * 60 * 60 * 1000);
}
