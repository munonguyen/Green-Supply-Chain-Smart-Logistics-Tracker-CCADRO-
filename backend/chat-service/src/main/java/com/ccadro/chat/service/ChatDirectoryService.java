package com.ccadro.chat.service;

import com.ccadro.chat.client.IdentityClient;
import com.ccadro.chat.dto.ChatActor;
import com.ccadro.chat.dto.response.ContactResponse;
import com.ccadro.chat.exception.AppException;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ChatDirectoryService {
    private final IdentityClient identityClient;

    public ChatDirectoryService(IdentityClient identityClient) {
        this.identityClient = identityClient;
    }

    public List<ContactResponse> contacts(ChatActor actor) {
        return identityClient.directory(actor.authorization());
    }

    public void validateMembers(ChatActor actor, Collection<String> members) {
        var allowed = contacts(actor).stream().map(ContactResponse::username).collect(Collectors.toSet());
        if (!allowed.containsAll(members)) {
            throw AppException.invalidRequest("Thành viên phải là tài khoản đang hoạt động trong danh bạ");
        }
    }
}
