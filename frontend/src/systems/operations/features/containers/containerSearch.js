import { normalizeElasticText } from '../../../../utils/elasticSearch';
import { CONTAINER_STATUSES, CONTAINER_TYPES } from './containerPresentation';
import { signalFreshness } from './ContainerConnection';

export const CONTAINER_SEARCH_GROUPS = [
  { label: 'Hồ sơ container', fields: [
    ['code', 'Mã container', ['containerCode']],
    ['iso', 'Mã loại ISO', ['isoType']],
    ['owner', 'Chủ sở hữu', ['ownerName']],
    ['company', 'Đơn vị phụ trách (tên / mã)', ['responsibleCompanyName', 'responsibleCompanyCode']]
  ] },
  { label: 'Phân công', fields: [
    ['shipment', 'Mã vận đơn', ['assignedShipmentCode']],
    ['plate', 'Biển số xe', ['vehicleLicensePlate']],
    ['driver', 'Tài xế (tên / điện thoại)', ['driverName', 'driverPhone']]
  ] },
  { label: 'Hành trình', fields: [
    ['origin', 'Điểm đi', ['originName']],
    ['destination', 'Điểm đến', ['destinationName']],
    ['location', 'Vị trí ghi nhận', ['lastLocationName']]
  ] },
  { label: 'Thiết bị và chứng từ', fields: [
    ['device', 'Thiết bị giám sát', ['telematicsModel']],
    ['seal', 'Số niêm phong', ['eSealNumber', 'esealNumber']],
    ['csc', 'CSC (quốc gia / tham chiếu / ACEP)', ['cscApprovalCountry', 'cscApprovalReference', 'cscAcepProgramNumber']],
    ['recipient', 'Người nhận ePOD', ['epodRecipient']]
  ] }
];

export const EMPTY_CONTAINER_FILTERS = Object.fromEntries([
  ...CONTAINER_SEARCH_GROUPS.flatMap(({ fields }) => fields.map(([key]) => [key, ''])),
  ['type', ''], ['signal', ''], ['assignment', ''], ['payloadMin', ''], ['payloadMax', '']
]);

const containsTokens = (values, query) => {
  const texts = values.filter((value) => value != null).map(normalizeElasticText);
  return normalizeElasticText(query).split(' ').filter(Boolean).every((token) => {
    const compact = token.replace(/[^a-z0-9]/g, '');
    return texts.some((text) => text.includes(token) ||
      (compact && text.replace(/[^a-z0-9]/g, '').includes(compact)));
  });
};

export function matchesContainerSearch(container, query, filters, now) {
  const values = CONTAINER_SEARCH_GROUPS.flatMap(({ fields }) =>
    fields.flatMap(([, , keys]) => keys.map((key) => container[key])));
  values.push(container.containerType, CONTAINER_TYPES[container.containerType],
    container.status, CONTAINER_STATUSES[container.status]?.label, container.cscInspectionScheme,
    container.cscManufactureDate, container.cscNextExaminationDate, container.tareWeightTons,
    container.maxPayloadTons, container.cubicCapacityM3, container.driverLicense,
    container.vehicleTypeLabel, container.eSealStatus, container.esealStatus,
    container.completedAt, container.createdAt);
  if (!containsTokens(values, query)) return false;
  if (filters.type && container.containerType !== filters.type) return false;
  if (filters.signal && signalFreshness(container.lastPositionReceivedAt, now).key !== filters.signal) return false;
  const linked = Boolean(container.assignedShipmentId && container.assignedVehicleId && container.assignedDriverId);
  if (filters.assignment && linked !== (filters.assignment === 'linked')) return false;
  if (filters.payloadMin !== '' && (container.maxPayloadTons == null || Number(container.maxPayloadTons) < Number(filters.payloadMin))) return false;
  if (filters.payloadMax !== '' && (container.maxPayloadTons == null || Number(container.maxPayloadTons) > Number(filters.payloadMax))) return false;
  return CONTAINER_SEARCH_GROUPS.every(({ fields }) =>
    fields.every(([key, , keys]) => containsTokens(keys.map((name) => container[name]), filters[key])));
}
