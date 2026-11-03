package com.ccadro.identity.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ccadro")
public class CcadroProperties {

    private Routing routing = new Routing();
    private Deviation deviation = new Deviation();
    private Carbon carbon = new Carbon();
    private Demerit demerit = new Demerit();
    private Security security = new Security();

    public static class Routing {
        private String provider = "mock";
        private String baseUrl = "http://router.project-osrm.org";
        private int connectTimeoutMs = 5000;
        private int readTimeoutMs = 10000;

        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public int getConnectTimeoutMs() { return connectTimeoutMs; }
        public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
        public int getReadTimeoutMs() { return readTimeoutMs; }
        public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
    }

    public static class Deviation {
        private double yellowMeters = 50.0;
        private double redMeters = 200.0;
        private int consecutivePointsRequired = 3;

        public double getYellowMeters() { return yellowMeters; }
        public void setYellowMeters(double yellowMeters) { this.yellowMeters = yellowMeters; }
        public double getRedMeters() { return redMeters; }
        public void setRedMeters(double redMeters) { this.redMeters = redMeters; }
        public int getConsecutivePointsRequired() { return consecutivePointsRequired; }
        public void setConsecutivePointsRequired(int consecutivePointsRequired) { this.consecutivePointsRequired = consecutivePointsRequired; }
    }

    public static class Carbon {
        private double defaultTonneKmFactor = 0.080000;
        private double distanceAdjustmentFactor = 1.05;
        private boolean applyDafOnActualGps = false;
        private String factorVersion = "GLEC_v3.0";

        public double getDefaultTonneKmFactor() { return defaultTonneKmFactor; }
        public void setDefaultTonneKmFactor(double defaultTonneKmFactor) { this.defaultTonneKmFactor = defaultTonneKmFactor; }
        public double getDistanceAdjustmentFactor() { return distanceAdjustmentFactor; }
        public void setDistanceAdjustmentFactor(double distanceAdjustmentFactor) { this.distanceAdjustmentFactor = distanceAdjustmentFactor; }
        public boolean isApplyDafOnActualGps() { return applyDafOnActualGps; }
        public void setApplyDafOnActualGps(boolean applyDafOnActualGps) { this.applyDafOnActualGps = applyDafOnActualGps; }
        public String getFactorVersion() { return factorVersion; }
        public void setFactorVersion(String factorVersion) { this.factorVersion = factorVersion; }
    }

    public static class Demerit {
        private int warningThreshold = 10;
        private int reviewRequiredThreshold = 20;

        public int getWarningThreshold() { return warningThreshold; }
        public void setWarningThreshold(int warningThreshold) { this.warningThreshold = warningThreshold; }
        public int getReviewRequiredThreshold() { return reviewRequiredThreshold; }
        public void setReviewRequiredThreshold(int reviewRequiredThreshold) { this.reviewRequiredThreshold = reviewRequiredThreshold; }
    }

    public static class Security {
        private String jwtSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        private long jwtExpirationMs = 86400000;

        public String getJwtSecret() { return jwtSecret; }
        public void setJwtSecret(String jwtSecret) { this.jwtSecret = jwtSecret; }
        public long getJwtExpirationMs() { return jwtExpirationMs; }
        public void setJwtExpirationMs(long jwtExpirationMs) { this.jwtExpirationMs = jwtExpirationMs; }
    }

    public Routing getRouting() { return routing; }
    public void setRouting(Routing routing) { this.routing = routing; }
    public Deviation getDeviation() { return deviation; }
    public void setDeviation(Deviation deviation) { this.deviation = deviation; }
    public Carbon getCarbon() { return carbon; }
    public void setCarbon(Carbon carbon) { this.carbon = carbon; }
    public Demerit getDemerit() { return demerit; }
    public void setDemerit(Demerit demerit) { this.demerit = demerit; }
    public Security getSecurity() { return security; }
    public void setSecurity(Security security) { this.security = security; }
}
