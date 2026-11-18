package com.ccadro.payment.mapper;

import com.ccadro.payment.entity.B2bContract;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import static org.assertj.core.api.Assertions.assertThat;

class ContractMapperTest {
    final ContractMapper mapper = Mappers.getMapper(ContractMapper.class);

    @Test void legacyContractsWithNullCreditKeepZeroBalancesAndSealNumber() {
        var contract = new B2bContract();
        contract.setCreditLimitVnd(null);
        contract.setUsedCreditVnd(null);
        contract.setESealNumber("SEAL-001");
        var response = mapper.toResponse(contract);
        assertThat(response.getCreditLimitVnd()).isZero();
        assertThat(response.getUsedCreditVnd()).isZero();
        assertThat(response.getAvailableCreditVnd()).isZero();
        assertThat(response.getESealNumber()).isEqualTo("SEAL-001");
    }

    @Test void overdrawnCreditIsNeverExposedAsNegativeAvailableBalance() {
        var contract = new B2bContract();
        contract.setCreditLimitVnd(100L);
        contract.setUsedCreditVnd(150L);
        var response = mapper.toResponse(contract);
        assertThat(response.getUsedCreditVnd()).isEqualTo(150L);
        assertThat(response.getAvailableCreditVnd()).isZero();
    }
}
