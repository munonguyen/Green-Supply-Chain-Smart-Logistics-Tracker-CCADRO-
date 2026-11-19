package com.ccadro.asset.application.port;

import java.util.List;

/** Storage representation of certifications, independent of the serialization library. */
public interface DriverCertificationCodec {
    List<String> decode(String storedValue);
    String encode(List<String> certifications);
}
