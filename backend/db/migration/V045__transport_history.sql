CREATE TABLE container_transport_departure (
    round_id UUID PRIMARY KEY REFERENCES container_control_round(id),
    container_id UUID NOT NULL REFERENCES container(id),
    shipment_id UUID NOT NULL REFERENCES shipment(id),
    driver_id UUID NOT NULL REFERENCES driver(id),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    departed_at TIMESTAMPTZ NOT NULL,
    cargo JSONB NOT NULL
);

CREATE INDEX idx_transport_departure_container ON container_transport_departure(container_id);
CREATE INDEX idx_transport_departure_driver ON container_transport_departure(driver_id);
CREATE INDEX idx_transport_trip_driver ON trip(driver_id);
CREATE INDEX idx_transport_shipment_container ON shipment(container_id);
CREATE INDEX idx_transport_dispatch_container ON dispatch_order(container_id);
CREATE INDEX idx_transport_manifest_pair ON container_cargo_manifest_item(container_code, shipment_code);

CREATE FUNCTION record_container_transport_departure() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO container_transport_departure
        (round_id, container_id, shipment_id, driver_id, vehicle_id, departed_at, cargo)
    SELECT NEW.round_id, c.id, s.id, c.assigned_driver_id, c.assigned_vehicle_id, NEW.completed_at,
           COALESCE((
               SELECT jsonb_agg(jsonb_build_object('itemCode', m.item_code, 'name', m.cargo_name,
                   'category', m.cargo_category, 'weightKg', m.weight_kg, 'parcelCount', m.parcel_count)
                   ORDER BY m.item_code)
               FROM container_cargo_manifest_item m
               WHERE m.container_code = c.container_code AND m.shipment_code = s.shipment_code
                   AND NOT m.is_deleted
           ), '[]'::jsonb)
    FROM container_control_round r
    JOIN container c ON c.container_code = r.container_code
    JOIN shipment s ON s.id = c.assigned_shipment_id
    WHERE r.id = NEW.round_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER capture_transport_departure AFTER INSERT ON container_control_stage
    FOR EACH ROW WHEN (NEW.stage = 'DEPARTURE')
    EXECUTE FUNCTION record_container_transport_departure();

CREATE VIEW transport_history AS
WITH trip_history AS (
    SELECT t.id AS trip_id, t.trip_code, t.shipment_id, t.driver_id, t.vehicle_id,
           COALESCE(o.container_id, dep.container_id, s.container_id) AS container_id,
           t.status, COALESCE(t.start_time, dep.departed_at) AS departed_at,
           COALESCE(t.end_time, dep.epod_at) AS arrived_at,
           COALESCE(t.start_time, dep.departed_at, t.created_at) AS occurred_at, dep.cargo
    FROM trip t
    JOIN shipment s ON s.id = t.shipment_id
    LEFT JOIN LATERAL (
        SELECT d.container_id FROM dispatch_order d
        WHERE d.trip_id = t.id AND d.container_id IS NOT NULL
        ORDER BY d.created_at DESC, d.id LIMIT 1
    ) o ON true
    LEFT JOIN LATERAL (
        SELECT d.container_id, d.departed_at, d.cargo, r.epod_at
        FROM container_transport_departure d JOIN container_control_round r ON r.id = d.round_id
        WHERE d.shipment_id = t.shipment_id AND d.driver_id = t.driver_id AND d.vehicle_id = t.vehicle_id
          AND (COALESCE(o.container_id, s.container_id) IS NULL
               OR d.container_id = COALESCE(o.container_id, s.container_id))
        ORDER BY d.departed_at DESC, d.round_id LIMIT 1
    ) dep ON true
    WHERE NOT t.is_deleted OR t.start_time IS NOT NULL OR t.end_time IS NOT NULL
), linked_history AS (
    SELECT trip_id AS record_id, trip_id, trip_code, shipment_id, driver_id, vehicle_id,
           container_id, status, departed_at, arrived_at, occurred_at, cargo, false AS manifest_only
    FROM trip_history
    UNION ALL
    SELECT d.round_id, NULL, NULL, d.shipment_id, d.driver_id, d.vehicle_id, d.container_id,
           CASE WHEN r.epod_at IS NULL THEN 'DEPARTED' ELSE 'DELIVERED' END,
           d.departed_at, r.epod_at, d.departed_at, d.cargo, false
    FROM container_transport_departure d
    JOIN container_control_round r ON r.id = d.round_id
    WHERE NOT EXISTS (
        SELECT 1 FROM trip_history t WHERE t.shipment_id = d.shipment_id AND t.driver_id = d.driver_id
            AND t.vehicle_id = d.vehicle_id AND t.container_id = d.container_id
    )
), manifest_history AS (
    SELECT (array_agg(m.id ORDER BY m.id))[1] AS record_id, c.id AS container_id, m.shipment_code,
           MAX(m.created_at) AS occurred_at
    FROM container_cargo_manifest_item m
    JOIN container c ON c.container_code = m.container_code
    WHERE NOT m.is_deleted
    GROUP BY c.id, m.shipment_code
)
SELECT h.record_id, h.trip_id, h.trip_code, h.container_id, h.driver_id, h.vehicle_id, h.status,
       h.departed_at, h.arrived_at, h.occurred_at, h.cargo, h.manifest_only, s.shipment_code,
       s.origin_name, s.destination_name, s.cargo_weight_tons
FROM linked_history h JOIN shipment s ON s.id = h.shipment_id
UNION ALL
SELECT r.id, NULL, NULL, c.id, NULL, NULL, 'DELIVERED',
       departure.completed_at, r.epod_at, COALESCE(departure.completed_at, r.epod_at), NULL, false,
       r.shipment_code, s.origin_name, s.destination_name, s.cargo_weight_tons
FROM container_control_round r
JOIN container c ON c.container_code = r.container_code
LEFT JOIN shipment s ON s.shipment_code = r.shipment_code
LEFT JOIN container_control_stage departure ON departure.round_id = r.id AND departure.stage = 'DEPARTURE'
WHERE r.epod_at IS NOT NULL AND r.shipment_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM container_transport_departure d WHERE d.round_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM linked_history h WHERE h.container_id = c.id AND h.shipment_id = s.id)
UNION ALL
SELECT m.record_id, NULL, NULL, m.container_id, NULL, NULL, 'MANIFEST_ONLY',
       NULL, NULL, m.occurred_at, NULL, true, m.shipment_code, NULL, NULL, NULL
FROM manifest_history m
WHERE NOT EXISTS (
    SELECT 1 FROM linked_history h JOIN shipment s ON s.id = h.shipment_id
    WHERE h.container_id = m.container_id AND s.shipment_code = m.shipment_code
)
AND NOT EXISTS (
    SELECT 1 FROM container_control_round r JOIN container c ON c.container_code = r.container_code
    WHERE c.id = m.container_id AND r.shipment_code = m.shipment_code AND r.epod_at IS NOT NULL
);
