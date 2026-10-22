package com.ccadro;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class PostgisIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Verify PostGIS extension and seed data in PostgreSQL")
    void testPostgisAndSeedData() {
        String postgisVersion = jdbcTemplate.queryForObject("SELECT PostGIS_Version()", String.class);
        assertThat(postgisVersion).isNotNull().contains("3.4");

        Integer vehicleCount = jdbcTemplate.queryForObject("SELECT count(*) FROM vehicle", Integer.class);
        assertThat(vehicleCount).isGreaterThanOrEqualTo(1);

        Integer shipmentCount = jdbcTemplate.queryForObject("SELECT count(*) FROM shipment", Integer.class);
        assertThat(shipmentCount).isGreaterThanOrEqualTo(1);

        Integer factorCount = jdbcTemplate.queryForObject("SELECT count(*) FROM emission_factor", Integer.class);
        assertThat(factorCount).isGreaterThanOrEqualTo(1);
    }
}
