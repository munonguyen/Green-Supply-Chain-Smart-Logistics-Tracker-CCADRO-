package com.ccadro.notification.service;
import com.ccadro.notification.dto.request.PaymentEvidenceRequest;
import com.ccadro.notification.dto.request.SendEmailRequest;
import com.ccadro.notification.dto.response.EmailDispatchResponse;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class PaymentEvidenceEmailTest {
 @Test void rejectsTamperedEvidenceBeforePersisting() {
  var jdbc=mock(JdbcTemplate.class);var inbox=new PaymentEvidenceInbox(jdbc);
  var request=new PaymentEvidenceRequest("a@example.com","receipt","{}","0".repeat(64),"<p>hello</p>","0".repeat(64));
  assertThrows(ResponseStatusException.class,()->inbox.accept(UUID.randomUUID(),request));verifyNoInteractions(jdbc);
 }
 @Test void sandboxRemainsQueuedAndProviderFailureIsRetried() {
  var jdbc=mock(JdbcTemplate.class);var email=mock(TransactionalEmailService.class);var worker=new PaymentEvidenceEmailWorker(jdbc,email,null,new ObjectMapper());
  worker.deliver();verifyNoInteractions(jdbc);
  when(email.isLiveProviderConfigured()).thenReturn(true);
  var row=new HashMap<String,Object>();row.put("event_id",UUID.randomUUID());row.put("attempts",0);
  row.put("recipient_email","a@example.com");row.put("subject","receipt");row.put("html_content","<p>saved</p>");row.put("snapshot_json","{}");row.put("snapshot_sha256","a");row.put("html_sha256","b");
  when(jdbc.queryForList(anyString())).thenReturn(List.of(row));
  when(email.sendEmail(any())).thenThrow(new IllegalStateException("provider unavailable"));
  worker.deliver();
  assertTrue(mockingDetails(jdbc).getInvocations().stream().anyMatch(i->Arrays.toString(i.getRawArguments()).contains("UPDATE payment_email_inbox SET status=?")));
 }
 @Test void successfulProviderAcceptanceIncludesStoredAttachmentsAndAudit() {
  var jdbc=mock(JdbcTemplate.class);var email=mock(TransactionalEmailService.class);var worker=new PaymentEvidenceEmailWorker(jdbc,email,null,new ObjectMapper());
  when(email.isLiveProviderConfigured()).thenReturn(true);
  var row=new HashMap<String,Object>();row.put("event_id",UUID.randomUUID());row.put("attempts",0);row.put("recipient_email","a@example.com");row.put("subject","receipt");row.put("html_content","<p>saved</p>");row.put("snapshot_json","{}");row.put("snapshot_sha256","a");row.put("html_sha256","b");
  when(jdbc.queryForList(anyString())).thenReturn(List.of(row));
  when(email.sendEmail(any())).thenAnswer(inv->{SendEmailRequest r=inv.getArgument(0);assertEquals(1,r.getAttachments().size());
    assertTrue(r.getAttachments().get(0).get("name").endsWith(".zip"));
    assertEquals(row.get("event_id").toString(),r.getIdempotencyKey());
    try(var zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(Base64.getDecoder().decode(r.getAttachments().get(0).get("content"))))) {
      assertEquals("evidence.json",zip.getNextEntry().getName());
      assertEquals("{}",new String(zip.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
    }return EmailDispatchResponse.builder().mode("LIVE").status("SENT").messageId("<provider-id>").build();});
  worker.deliver();
  assertTrue(mockingDetails(jdbc).getInvocations().stream().anyMatch(i->i.getRawArguments()[0].toString().contains("status='PROVIDER_ACCEPTED'")));
 }
}
