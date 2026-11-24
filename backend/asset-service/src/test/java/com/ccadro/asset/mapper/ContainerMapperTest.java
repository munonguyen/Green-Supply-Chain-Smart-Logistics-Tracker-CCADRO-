package com.ccadro.asset.mapper;

import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.entity.Container;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ContainerMapperTest {
    private final ContainerMapper mapper = Mappers.getMapper(ContainerMapper.class);
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void creationPreservesSealNumberFromTheExistingJsonContract() throws Exception {
        var request = objectMapper.readValue("""
                {"containerCode":"DEMU0000037","containerType":"REEFER_40FT",
                 "esealNumber":"DEMO-SEAL-3"}
                """, ContainerCreateRequest.class);
        assertEquals("DEMO-SEAL-3", mapper.toEntity(request).getESealNumber());
    }

    @Test
    void responsePreservesAllSealFieldsFromTheEntity() throws Exception {
        var entity = Container.builder().containerCode("DEMU0000037")
                .eSealNumber("DEMO-SEAL-3").eSealStatus("LOCKED_SECURE")
                .eSealIntegrityPct(100).build();
        var response = mapper.toResponse(entity);
        assertEquals("DEMO-SEAL-3", response.getESealNumber());
        assertEquals("LOCKED_SECURE", response.getESealStatus());
        assertEquals(100, response.getESealIntegrityPct());
        var json = objectMapper.valueToTree(response);
        assertEquals("DEMO-SEAL-3", json.get("esealNumber").asText());
        assertEquals(100, json.get("esealIntegrityPct").asInt());
    }
}
