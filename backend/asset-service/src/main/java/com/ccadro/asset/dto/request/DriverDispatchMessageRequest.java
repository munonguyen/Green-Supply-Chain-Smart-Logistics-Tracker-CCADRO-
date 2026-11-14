package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverDispatchMessageRequest {

    String senderName;
    String senderRole;
    String senderUsername;
    String containerCode;
    String shipmentCode;
    String messageType;

    @NotBlank(message = "messageText must not be blank")
    String messageText;

    String channel;
}

