package com.ccadro.notification.controller;
import com.ccadro.notification.dto.request.PaymentEvidenceRequest;
import com.ccadro.notification.service.PaymentEvidenceInbox;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import java.util.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@RestController @RequestMapping("/internal/payment-evidence")
public class PaymentEvidenceController {
 private final PaymentEvidenceInbox inbox;
 private final String token;
 public PaymentEvidenceController(PaymentEvidenceInbox inbox,@Value("${ccadro.internal-token:}") String token){this.inbox=inbox;this.token=token;}
 private void authorize(String supplied){
  if(token.isBlank() || supplied==null || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8)))
    throw new ResponseStatusException(HttpStatus.FORBIDDEN);
 }
 @PutMapping("/{id}")
 public Map<String,Object> accept(@PathVariable UUID id,@RequestHeader(value="X-Internal-Token",required=false) String supplied,@Valid @RequestBody PaymentEvidenceRequest r){
  authorize(supplied);return inbox.accept(id,r);
 }
 @PostMapping("/{id}/retry")
 public void retry(@PathVariable UUID id,@RequestHeader(value="X-Internal-Token",required=false) String supplied){authorize(supplied);inbox.retry(id);}
 @GetMapping("/{id}")
 public Map<String,Object> status(@PathVariable UUID id,@RequestHeader(value="X-Internal-Token",required=false) String supplied){authorize(supplied);return inbox.status(id);}
}
