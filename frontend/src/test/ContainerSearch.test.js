import { expect, it } from 'vitest';
import { EMPTY_CONTAINER_FILTERS, matchesContainerSearch } from '../systems/operations/features/containers/containerSearch';

const now = Date.parse('2026-11-21T00:00:00Z');
const container = {
  containerCode: 'TCKU-781920-4', containerType: 'REEFER_40FT', isoType: '45R1',
  ownerName: 'Đơn vị sở hữu', responsibleCompanyName: 'Công ty vận tải',
  driverName: 'Nguyễn Văn Tài', driverPhone: '0901234567', vehicleLicensePlate: '51C-888.99',
  assignedShipmentCode: 'SHP-001', originName: 'Cảng Cát Lái', destinationName: 'Sóng Thần',
  telematicsModel: 'Tracker Model', maxPayloadTons: 26, lastPositionReceivedAt: new Date(now - 30000).toISOString()
};
const matches = (query = '', filters = {}) =>
  matchesContainerSearch(container, query, { ...EMPTY_CONTAINER_FILTERS, ...filters }, now);

it('matches accent-insensitive tokens across different fields and compact identifiers', () => {
  expect(matches('cat lai 51c88899 tai')).toBe(true);
  expect(matches('tcku7819204')).toBe(true);
  expect(matches('chu so huu')).toBe(false);
  expect(matches('don vi so huu 45R1')).toBe(true);
  expect(matches('tracker 0901234567')).toBe(true);
});

it('combines field filters with type, assignment, GPS freshness and payload range', () => {
  expect(matches('', { origin: 'cat lai', driver: 'tai', type: 'REEFER_40FT', signal: 'fresh', payloadMin: '25', payloadMax: '27', assignment: 'missing' })).toBe(true);
  expect(matches('', { driver: 'khong ton tai' })).toBe(false);
  expect(matches('', { type: 'DRY_40FT' })).toBe(false);
  expect(matches('', { signal: 'missing' })).toBe(false);
  expect(matches('', { assignment: 'linked' })).toBe(false);
  expect(matches('', { payloadMin: '27' })).toBe(false);
});

it('does not treat missing payload or an invalid GPS timestamp as valid measurements', () => {
  const missing = { ...container, maxPayloadTons: null, lastPositionReceivedAt: 'invalid' };
  expect(matchesContainerSearch(missing, '', { ...EMPTY_CONTAINER_FILTERS, payloadMax: '30' }, now)).toBe(false);
  expect(matchesContainerSearch(missing, '', { ...EMPTY_CONTAINER_FILTERS, signal: 'unknown' }, now)).toBe(true);
});
