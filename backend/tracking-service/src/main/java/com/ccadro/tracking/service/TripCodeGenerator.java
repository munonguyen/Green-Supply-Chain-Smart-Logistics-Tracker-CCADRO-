package com.ccadro.tracking.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/** Creates readable, company-scoped trip references with a collision-resistant suffix. */
public final class TripCodeGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int MAX_COMPANY_CODE_LENGTH = 10;
    private static final int RANDOM_SUFFIX_LENGTH = 20;
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private TripCodeGenerator() {}

    public static String generate(String companyCode) {
        String normalizedCompanyCode = companyCode == null
                ? ""
                : companyCode.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");

        if (normalizedCompanyCode.isBlank()) {
            normalizedCompanyCode = "GEN";
        } else if (normalizedCompanyCode.length() > MAX_COMPANY_CODE_LENGTH) {
            normalizedCompanyCode = normalizedCompanyCode.substring(0, MAX_COMPANY_CODE_LENGTH);
        }

        String date = LocalDate.now(BUSINESS_TIME_ZONE).format(DATE_FORMAT);
        String randomSuffix = UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, RANDOM_SUFFIX_LENGTH)
                .toUpperCase(Locale.ROOT);

        return "CT" + normalizedCompanyCode + "-" + date + "-" + randomSuffix;
    }
}
