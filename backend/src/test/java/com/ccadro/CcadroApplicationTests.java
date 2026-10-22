package com.ccadro;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class CcadroApplicationTests {

    @Test
    void contextLoads() {
        assertThat(true).isTrue();
    }

    @Test
    void verifyModularMonolithStructure() {
        ApplicationModules modules = ApplicationModules.of(CcadroApplication.class);
        modules.verify();
    }
}
