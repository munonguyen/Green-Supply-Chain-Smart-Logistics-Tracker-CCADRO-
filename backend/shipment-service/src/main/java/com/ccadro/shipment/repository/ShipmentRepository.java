package com.ccadro.shipment.repository;

import com.ccadro.shipment.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {
    Optional<Shipment> findByShipmentCode(String shipmentCode);
    List<Shipment> findByCustomerId(String customerId);
    List<Shipment> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    @Query(value = """
            SELECT s.* FROM public.shipment s
            WHERE (:includeDeleted = true OR s.is_deleted = false)
              AND (:query IS NULL OR btrim(:query) = '' OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   LIKE public.unaccent_immutable(lower(CONCAT('%', :query, '%'))) OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   % public.unaccent_immutable(lower(:query)))
            ORDER BY CASE WHEN :query IS NOT NULL AND btrim(:query) <> ''
                          THEN similarity(public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                                          COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                                          COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, ''))),
                                          public.unaccent_immutable(lower(:query)))
                          ELSE 0 END DESC,
                     s.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM public.shipment s
            WHERE (:includeDeleted = true OR s.is_deleted = false)
              AND (:query IS NULL OR btrim(:query) = '' OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   LIKE public.unaccent_immutable(lower(CONCAT('%', :query, '%'))) OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   % public.unaccent_immutable(lower(:query)))
            """,
            nativeQuery = true)
    Page<Shipment> search(@Param("query") String query,
                          @Param("includeDeleted") boolean includeDeleted,
                          Pageable pageable);

    @Query(value = """
            SELECT s.* FROM public.shipment s
            WHERE s.customer_id = :customerId
              AND (:includeDeleted = true OR s.is_deleted = false)
              AND (:query IS NULL OR btrim(:query) = '' OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   LIKE public.unaccent_immutable(lower(CONCAT('%', :query, '%'))) OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   % public.unaccent_immutable(lower(:query)))
            ORDER BY CASE WHEN :query IS NOT NULL AND btrim(:query) <> ''
                          THEN similarity(public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                                          COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                                          COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, ''))),
                                          public.unaccent_immutable(lower(:query)))
                          ELSE 0 END DESC,
                     s.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM public.shipment s
            WHERE s.customer_id = :customerId
              AND (:includeDeleted = true OR s.is_deleted = false)
              AND (:query IS NULL OR btrim(:query) = '' OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   LIKE public.unaccent_immutable(lower(CONCAT('%', :query, '%'))) OR
                   public.unaccent_immutable(lower(COALESCE(s.shipment_code, '') || ' ' || COALESCE(s.customer_id, '') || ' ' ||
                    COALESCE(s.origin_name, '') || ' ' || COALESCE(s.origin_address, '') || ' ' ||
                    COALESCE(s.destination_name, '') || ' ' || COALESCE(s.destination_address, '') || ' ' || COALESCE(s.status, '')))
                   % public.unaccent_immutable(lower(:query)))
            """,
            nativeQuery = true)
    Page<Shipment> searchByCustomer(@Param("customerId") String customerId,
                                    @Param("query") String query,
                                    @Param("includeDeleted") boolean includeDeleted,
                                    Pageable pageable);
}
