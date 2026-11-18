package com.ccadro.notification.service;

import com.ccadro.notification.configuration.EmailProperties;
import com.ccadro.notification.dto.request.SendEmailRequest;
import com.ccadro.notification.dto.response.EmailDispatchResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;

class TransactionalEmailServiceTest {

    @Test
    void evidenceWithAmbiguousAcknowledgementRequiresReviewInsteadOfAutomaticResend() {
        for (boolean timeout : new boolean[]{false, true}) {
            EmailProperties props = new EmailProperties();
            props.setBrevoApikey("local-key");
            props.setMode("LIVE");
            var builder = RestClient.builder().baseUrl("https://api.brevo.com");
            var server = MockRestServiceServer.bindTo(builder).build();
            var expectation = server.expect(requestTo("https://api.brevo.com/v3/smtp/email"));
            if (timeout) expectation.andRespond(withException(new java.net.SocketTimeoutException("read timeout")));
            else expectation.andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
            var request = new SendEmailRequest();
            request.setCategory("PAYMENT_EVIDENCE");
            request.setToEmail("review@example.com");
            request.setSubject("Payment evidence");
            request.setHtmlContent("<p>Archived evidence</p>");
            assertEquals("REVIEW_REQUIRED", new TransactionalEmailService(props, builder.build()).sendEmail(request).getStatus());
            server.verify();
        }
    }

    @Test
    void sendEmail_runsInSandboxModeWhenApiKeyMissing() {
        EmailProperties props = new EmailProperties();
        props.setMode("AUTO");
        props.setBrevoApikey("");

        TransactionalEmailService service = new TransactionalEmailService(props, RestClient.builder());

        assertFalse(service.isLiveProviderConfigured());
        SendEmailRequest req = new SendEmailRequest();
        req.setToEmail("customer@ccadro.com");
        req.setSubject("Xác nhận hợp đồng CCADRO");
        req.setHtmlContent("<p>Đã ký hợp đồng</p>");

        EmailDispatchResponse res = service.sendEmail(req);
        assertEquals("SANDBOX", res.getMode());
        assertEquals("SIMULATED_NO_API_KEY", res.getStatus());
        assertEquals("customer@ccadro.com", res.getToEmail());
    }

    @Test
    void sendEmail_callsBrevoApiWhenLiveKeyConfigured() {
        EmailProperties props = new EmailProperties();
        props.setMode("AUTO");
        props.setBrevoUrl("https://api.brevo.com");
        props.setBrevoApikey("test-brevo-key");
        props.setSenderEmail("noreply@ccadro.com");
        props.setSenderName("CCADRO");

        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "test-brevo-key"))
                .andRespond(withSuccess("{\"messageId\":\"<msg-123@brevo.com>\"}", MediaType.APPLICATION_JSON));

        TransactionalEmailService service = new TransactionalEmailService(props, builder.build());
        assertTrue(service.isLiveProviderConfigured());

        SendEmailRequest req = new SendEmailRequest();
        req.setToEmail("hub_mgr_dinhbang@ccadro.com");
        req.setToName("Trần Minh Quang");
        req.setSubject("Hóa đơn VAT #INV-001");
        req.setHtmlContent("<strong>Thanh toán thành công</strong>");

        EmailDispatchResponse res = service.sendEmail(req);
        assertEquals("LIVE", res.getMode());
        assertEquals("SENT", res.getStatus());
        assertEquals("<msg-123@brevo.com>", res.getMessageId());
        server.verify();
    }
}

