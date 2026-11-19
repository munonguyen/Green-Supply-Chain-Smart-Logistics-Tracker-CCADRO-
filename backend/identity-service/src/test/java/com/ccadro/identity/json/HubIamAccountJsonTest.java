package com.ccadro.identity.json;

import com.ccadro.identity.entity.HubIamAccount;
import com.ccadro.identity.mapper.HubIamAccountMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import static org.assertj.core.api.Assertions.assertThat;

@JsonTest
class HubIamAccountJsonTest {
    @Autowired
    ObjectMapper json;

    @Test
    void accountResponseHasNoCredentialFieldEvenWithoutJacksonIgnoreRules() throws Exception {
        HubIamAccount account = HubIamAccount.builder().username("hub_manager")
                .functionalRole("HUB_MANAGER").assignedHubCode("HUB-DINHBANG-BN")
                .passwordHash("never-expose-this-hash").build();
        var response = Mappers.getMapper(HubIamAccountMapper.class).toResponse(account);
        JsonNode document = json.valueToTree(response);
        assertThat(document.path("username").asText()).isEqualTo("hub_manager");
        assertThat(document.path("assignedHubCode").asText()).isEqualTo("HUB-DINHBANG-BN");
        assertThat(document.has("passwordHash")).isFalse();
        assertThat(document.has("password")).isFalse();
        ObjectMapper plain = new ObjectMapper().findAndRegisterModules();
        assertThat(plain.writeValueAsString(response)).doesNotContain("never-expose-this-hash");
    }
}
