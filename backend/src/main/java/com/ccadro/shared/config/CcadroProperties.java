package com.ccadro.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ccadro")
public class CcadroProperties {

    private Routing routing = new Routing();
    private Traffic traffic = new Traffic();
    private Weather weather = new Weather();
    private Deviation deviation = new Deviation();
    private Rerouting rerouting = new Rerouting();
    private Optimization optimization = new Optimization();
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

    public static class Traffic {
        private String provider = "mock";
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
    }

    public static class Weather {
        private String provider = "mock";
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
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

    public static class Rerouting {
        private double minimumBenefit = 0.10;
        private int cooldownSeconds = 300;
        private int hysteresisSeconds = 60;
        private boolean hardEventBypass = true;

        public double getMinimumBenefit() { return minimumBenefit; }
        public void setMinimumBenefit(double minimumBenefit) { this.minimumBenefit = minimumBenefit; }
        public int getCooldownSeconds() { return cooldownSeconds; }
        public void setCooldownSeconds(int cooldownSeconds) { this.cooldownSeconds = cooldownSeconds; }
        public int getHysteresisSeconds() { return hysteresisSeconds; }
        public void setHysteresisSeconds(int hysteresisSeconds) { this.hysteresisSeconds = hysteresisSeconds; }
        public boolean isHardEventBypass() { return hardEventBypass; }
        public void setHardEventBypass(boolean hardEventBypass) { this.hardEventBypass = hardEventBypass; }
    }

    public static class Optimization {
        private double carbonWeight = 0.40;
        private double timeWeight = 0.30;
        private double costDistanceWeight = 0.20;
        private double riskWeight = 0.10;
        private boolean paretoEnabled = true;

        public double getCarbonWeight() { return carbonWeight; }
        public void setCarbonWeight(double carbonWeight) { this.carbonWeight = carbonWeight; }
        public double getTimeWeight() { return timeWeight; }
        public void setTimeWeight(double timeWeight) { this.timeWeight = timeWeight; }
        public double getCostDistanceWeight() { return costDistanceWeight; }
        public void setCostDistanceWeight(double costDistanceWeight) { this.costDistanceWeight = costDistanceWeight; }
        public double getRiskWeight() { return riskWeight; }
        public void setRiskWeight(double riskWeight) { this.riskWeight = riskWeight; }
        public boolean isParetoEnabled() { return paretoEnabled; }
        public void setParetoEnabled(boolean paretoEnabled) { this.paretoEnabled = paretoEnabled; }
    }

    public static class Carbon {
        private double defaultTonneKmFactor = 0.080000;
        private double distanceAdjustmentFactor = 1.05;
        private boolean applyDafOnActualGps = false; // BRULE-11: no DAF when GPS_ACTUAL
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
    public Traffic getTraffic() { return traffic; }
    public void setTraffic(Traffic traffic) { this.traffic = traffic; }
    public Weather getWeather() { return weather; }
    public void setWeather(Weather weather) { this.weather = weather; }
    public Deviation getDeviation() { return deviation; }
    public void setDeviation(Deviation deviation) { this.deviation = deviation; }
    public Rerouting getRerouting() { return rerouting; }
    public void setRerouting(Rerouting rerouting) { this.rerouting = rerouting; }
    public Optimization getOptimization() { return optimization; }
    public void setOptimization(Optimization optimization) { this.optimization = optimization; }
    public Carbon getCarbon() { return carbon; }
    public void setCarbon(Carbon carbon) { this.carbon = carbon; }
    public Demerit getDemerit() { return demerit; }
    public void setDemerit(Demerit demerit) { this.demerit = demerit; }
    public Security getSecurity() { return security; }
    public void setSecurity(Security security) { this.security = security; }
}
