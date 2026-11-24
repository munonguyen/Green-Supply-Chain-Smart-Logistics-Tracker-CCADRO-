import { formatDecimalVi, unwrapApiData } from '../../../../utils/formatters';

export const unwrap = unwrapApiData;
export const number = (n, digits = 1) => formatDecimalVi(n, digits, '—');
export const money = (n) => `${number(n, 0)} đ`;

export const familyOf = (vehicle) =>
  vehicle?.fuelType === 'DIESEL'
    ? 'DIESEL'
    : ['GASOLINE', 'PETROL'].includes(vehicle?.fuelType)
      ? 'GASOLINE'
      : null;

export const compatibleFamily = (vehicle, fuel) => familyOf(vehicle) === fuel.family;

export function computeVehicleAnnualStats(vehicle, fuels) {
  const p = vehicle.profile;
  const fuel = p ? fuels.find((f) => f.code === p.selectedFuelCode) : null;
  const consumption = Number(p?.consumptionPer100Km);
  const annualKm = Number(p?.annualKm);
  const covered = Boolean(p && fuel && consumption > 0 && annualKm > 0);
  if (!covered) {
    return {
      fuel,
      covered: false,
      annualKm: annualKm > 0 ? annualKm : null,
      annualLiters: null,
      annualPhysicalCo2Kg: null,
      annualFossilCo2Kg: null,
      annualCostVnd: null
    };
  }
  const annualLiters = (annualKm / 100) * consumption;
  const annualPhysicalCo2Kg =
    vehicle.annualPhysicalCo2Kg != null
      ? Number(vehicle.annualPhysicalCo2Kg)
      : annualLiters * Number(fuel.physicalCo2KgPerLiter);
  const annualFossilCo2Kg =
    vehicle.annualFossilCo2Kg != null
      ? Number(vehicle.annualFossilCo2Kg)
      : annualLiters * Number(fuel.fossilCo2KgPerLiter);
  const annualCostVnd = annualLiters * Number(fuel.priceRegion1);
  return {
    fuel,
    covered: true,
    annualKm,
    annualLiters,
    annualPhysicalCo2Kg,
    annualFossilCo2Kg,
    annualCostVnd
  };
}

