package com.ccadro.tracking.configuration;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ccadro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CcadroProperties {

    private Routing routing = new Routing();
    private Deviation deviation = new Deviation();
    private Reroute reroute = new Reroute();
    private Carbon carbon = new Carbon();
    private Demerit demerit = new Demerit();
    private Security security = new Security();
    private Arrival arrival = new Arrival();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Routing {
        private String provider = "mock";
        private String baseUrl = "http://router.project-osrm.org";
        private int connectTimeoutMs = 5000;
        private int readTimeoutMs = 10000;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Deviation {
        private double yellowMeters = 50.0;
        private double redMeters = 200.0;
        private int consecutivePointsRequired = 3;
        private double maxValidSpeedKmh = 150.0;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reroute {
        private long cooldownSeconds = 300L;
        private double minimumBenefitRatio = 0.1000;
        private double detourSavingsEstimateRatio = 0.82;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Carbon {
        private double defaultTonneKmFactor = 0.080000;
        private double distanceAdjustmentFactor = 1.05;
        private boolean applyDafOnActualGps = false;
        private String factorVersion = "GLEC_v3.0";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Demerit {
        private int warningThreshold = 10;
        private int reviewRequiredThreshold = 20;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Security {
        private String jwtSecret = "";
        private long jwtExpirationMs = 86400000;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Arrival {
        private double arrivalRadiusMeters = 250.0;
        private double approachingRadiusMeters = 2000.0;
    }
}
