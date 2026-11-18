package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.ContractSlaEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class PaymentEvidenceServiceTest {
 @Test void archivesContractPaymentAndExactBytesWithStableEventId() throws Exception {
  var jdbc=mock(JdbcTemplate.class);var contracts=mock(B2bContractRepository.class);var sla=mock(ContractSlaEventRepository.class);
  var mapper=new ObjectMapper().findAndRegisterModules();
  var service=new PaymentEvidenceService(jdbc,mapper,contracts,sla,new EvidenceProperties());
  var tx=PaymentTransaction.builder().transactionCode("PAY-1").invoiceNumber("INV-1").shipmentCode("SH-1")
    .customerId("C1").customerName("<script>alert(1)</script>").createdByUsername("alice").receiptEmail("alice@example.com")
    .paidAt(Instant.parse("2026-11-16T00:00:00Z")).totalAmountVnd(108000L).paymentStatus("PAID").build();
  var contract=B2bContract.builder().contractNumber("HD-1").customerId("C1").contractStatus("SIGNED_ACTIVE").build();
  when(contracts.findTopByShipmentCodeOrderByCreatedAtDesc("SH-1")).thenReturn(Optional.of(contract));
  when(sla.findByContractNumberOrderByCreatedAtDesc("HD-1")).thenReturn(List.of());
  service.capture(tx);service.capture(tx);
  var all=mockingDetails(jdbc).getInvocations().stream().filter(i->i.getMethod().getName().equals("update")).toList();
  assertEquals(2,all.size());
  Object[] args=all.get(0).getRawArguments();Object[] values=(Object[])args[1];
  assertEquals(((Object[])all.get(1).getRawArguments()[1])[0],values[0]);
  String snapshot=(String)values[4],html=(String)values[6];
  assertEquals(PaymentEvidenceService.sha256(snapshot),values[5]);
  assertEquals(PaymentEvidenceService.sha256(html),values[7]);
  assertTrue(snapshot.contains("HD-1"));assertTrue(snapshot.contains("108000"));
  assertFalse(html.contains("<script>"));assertTrue(html.contains("&lt;script&gt;"));
  assertTrue(args[0].toString().contains("ON CONFLICT(transaction_code) DO NOTHING"));
 }
 @Test void downloadRequiresOwnerOrExactAdminRole() {
  var jdbc=mock(JdbcTemplate.class);
  when(jdbc.queryForList(anyString(),eq("PAY-1"))).thenReturn(List.of(Map.of("owner_username","alice","delivery_status","PENDING")));
  var service=new PaymentEvidenceService(jdbc,new ObjectMapper(),mock(B2bContractRepository.class),mock(ContractSlaEventRepository.class),new EvidenceProperties());
  assertThrows(ResponseStatusException.class,()->service.get("PAY-1","bob","ROLE_ADMINISTRATOR"));
  assertDoesNotThrow(()->service.get("PAY-1","alice","ROLE_CUSTOMER"));
 }
}
