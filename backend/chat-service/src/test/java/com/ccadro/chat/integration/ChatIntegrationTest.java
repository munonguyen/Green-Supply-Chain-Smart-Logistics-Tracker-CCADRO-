package com.ccadro.chat.integration;

import com.ccadro.chat.entity.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.net.ServerSocket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Real MongoDB integration; Identity HTTP contract is served by an isolated fake. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT) @AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="CHAT_TEST_MONGODB_URI", matches=".+")
class ChatIntegrationTest {
    static HttpServer identity;
    static final String DB = "ccadro_chat_test_" + UUID.randomUUID().toString().replace("-", "");
    static int socketPort;
    @org.springframework.boot.test.web.server.LocalServerPort int port;
    static final Set<String> revoked = java.util.concurrent.ConcurrentHashMap.newKeySet();
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired MongoTemplate mongo;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) throws Exception {
        identity = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        identity.createContext("/api/v1/auth/introspect", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            String user = body.contains("alice-token") ? "alice" : body.contains("bob-token") ? "bob" : body.contains("carol-token") ? "carol" : "";
            String result = user.isEmpty() || revoked.contains(user) ? "{\"result\":{\"valid\":false}}"
                    : "{\"result\":{\"valid\":true,\"username\":\"" + user + "\",\"scope\":\"ROLE_CUSTOMER\"}}";
            byte[] bytes = result.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        });
        identity.createContext("/api/v1/auth/chat-directory", exchange -> {
            byte[] bytes = "{\"result\":[{\"username\":\"alice\",\"fullName\":\"Alice\",\"role\":\"CUSTOMER\"},{\"username\":\"bob\",\"fullName\":\"Bob\",\"role\":\"DRIVER\"},{\"username\":\"carol\",\"fullName\":\"Carol\",\"role\":\"DISPATCHER\"}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        });
        identity.start();
        try (ServerSocket free = new ServerSocket(0)) { socketPort = free.getLocalPort(); }
        registry.add("ccadro.identity-url", () -> "http://127.0.0.1:" + identity.getAddress().getPort());
        registry.add("spring.data.mongodb.uri", () -> System.getenv("CHAT_TEST_MONGODB_URI"));
        registry.add("spring.data.mongodb.database", () -> DB);
        registry.add("ccadro.socket.port", () -> socketPort);
    }
    @AfterAll static void stop() { identity.stop(0); }
    @AfterEach void cleanup() {
        revoked.clear();
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), ChatSocketSession.class);
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), Message.class);
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), Conversation.class);
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), Preference.class);
        mongo.remove(new org.springframework.data.mongodb.core.query.Query(), ChatSocketSession.class);
    }
    String create(String type) throws Exception {
        return json.readTree(http.perform(post("/api/v1/chat/conversations").header("Authorization", "Bearer alice-token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\""+type+"\",\"title\":\"Test\",\"members\":[\"bob\"]}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("result").path("id").asText();
    }
    JsonNode send(String id, String key, String text) throws Exception {
        return json.readTree(http.perform(post("/api/v1/chat/conversations/"+id+"/messages")
                .header("Authorization", "Bearer alice-token").header("X-Auth-Username", "carol")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "clientMessageId", key, "messageText", text, "messageType", "TEXT", "senderUsername", "carol"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("result");
    }
    @Test void rejectsMissingRevokedAndSpoofedIdentity() throws Exception {
        http.perform(get("/api/v1/chat/conversations").header("X-Auth-Username", "alice")).andExpect(status().isUnauthorized());
        http.perform(get("/api/v1/chat/conversations").header("Authorization", "Bearer revoked-token")).andExpect(status().isUnauthorized());
    }
    @Test void isolatesMembersAndDeduplicatesDmAndMessages() throws Exception {
        String id = create("DM"); assertThat(create("DM")).isEqualTo(id);
        http.perform(get("/api/v1/chat/conversations/"+id+"/messages").header("Authorization", "Bearer carol-token"))
                .andExpect(status().isNotFound());
        http.perform(post("/api/v1/chat/conversations/"+id+"/messages").header("Authorization", "Bearer carol-token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"clientMessageId\":\"x\",\"messageText\":\"intrude\",\"messageType\":\"TEXT\"}"))
                .andExpect(status().isNotFound());
        var first = send(id,"one","Hello"); var retry = send(id,"one","Hello");
        assertThat(first.path("id").asText()).isEqualTo(retry.path("id").asText());
        assertThat(first.path("senderUsername").asText()).isEqualTo("alice");
        send(id,"two","Hello");
        assertThat(mongo.count(new org.springframework.data.mongodb.core.query.Query(),Message.class)).isEqualTo(2);
        http.perform(post("/api/v1/chat/conversations/"+id+"/messages").header("Authorization", "Bearer alice-token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"clientMessageId\":\"one\",\"messageText\":\"different\",\"messageType\":\"TEXT\"}"))
                .andExpect(status().isConflict());
    }
    @Test void paginatesAndPersistsReadReactionAndPrivatePreferences() throws Exception {
        String id=create("DM"); send(id,"one","1");send(id,"two","2");send(id,"three","3");
        String path="/api/v1/chat/conversations/"+id;
        JsonNode page=json.readTree(http.perform(get(path+"/messages?limit=2").header("Authorization","Bearer bob-token"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("result");
        assertThat(page.path("messages").size()).isEqualTo(2);
        JsonNode older=json.readTree(http.perform(get(path+"/messages").param("cursor",page.path("nextCursor").asText())
                .header("Authorization","Bearer bob-token")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("result");
        assertThat(older.path("messages").size()).isEqualTo(1);
        String msg=page.path("messages").get(1).path("id").asText();
        http.perform(put(path+"/read").header("Authorization","Bearer bob-token").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("throughMessageId",msg)))).andExpect(status().isOk());
        http.perform(put(path+"/messages/"+msg+"/reaction").header("Authorization","Bearer bob-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"emoji\":\"👍\",\"active\":true}")).andExpect(status().isOk());
        var stored=mongo.findById(msg,Message.class);
        assertThat(stored.getReadBy()).contains("bob");assertThat(stored.getReactions().get("👍")).containsExactly("bob");
        http.perform(put(path+"/preferences").header("Authorization","Bearer bob-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"pinned\":true}")).andExpect(status().isOk());
        http.perform(get("/api/v1/chat/preferences").header("Authorization","Bearer alice-token"))
                .andExpect(jsonPath("$.result.length()").value(0));
        http.perform(get("/api/v1/chat/preferences").header("Authorization","Bearer bob-token"))
                .andExpect(jsonPath("$.result[0].pinned").value(true));
    }
    @Test void onlyOwnerInvitesAndUnknownAccountsAndOversizedMessagesAreRejected() throws Exception {
        String id=create("GROUP"),path="/api/v1/chat/conversations/"+id;
        http.perform(post(path+"/members").header("Authorization","Bearer bob-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"members\":[\"carol\"]}")).andExpect(status().isForbidden());
        http.perform(post(path+"/members").header("Authorization","Bearer alice-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"members\":[\"nobody\"]}")).andExpect(status().isBadRequest());
        http.perform(post(path+"/members").header("Authorization","Bearer alice-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"members\":[\"carol\"]}")).andExpect(status().isOk());
        http.perform(get(path+"/messages").header("Authorization","Bearer carol-token")).andExpect(status().isOk());
        http.perform(post(path+"/messages").header("Authorization","Bearer alice-token").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("clientMessageId","big","messageType","TEXT","messageText","x".repeat(4001)))))
                .andExpect(status().isBadRequest());
    }
    @Test void existingDocumentsKeepTheirCollectionsTypeHintsAndResponseShape() throws Exception {
        String id = "legacy-room";
        java.util.Date created = java.util.Date.from(java.time.Instant.parse("2026-01-01T00:00:00Z"));
        mongo.getCollection("conversations").insertOne(new org.bson.Document("_id", id)
                .append("_class", "com.ccadro.chat.ChatDocuments$Conversation")
                .append("version", 0L).append("type", "GROUP").append("title", "Legacy chat")
                .append("owner", "alice").append("members", List.of("alice", "bob"))
                .append("createdAt", created));
        mongo.getCollection("messages").insertOne(new org.bson.Document("_id", "legacy-message")
                .append("_class", "com.ccadro.chat.ChatDocuments$Message")
                .append("conversationId", id).append("senderUsername", "alice")
                .append("senderName", "Alice").append("senderRole", "CUSTOMER")
                .append("messageText", "Existing history").append("messageType", "TEXT")
                .append("readBy", List.of("alice")).append("createdAt", created)
                .append("metadata", new org.bson.Document()).append("reactions", new org.bson.Document()));
        mongo.getCollection("preferences").insertOne(new org.bson.Document("_id", "legacy-preference")
                .append("_class", "com.ccadro.chat.ChatDocuments$Preference")
                .append("username", "bob").append("conversationId", id).append("pinned", true).append("muted", false));
        http.perform(get("/api/v1/chat/conversations").header("Authorization", "Bearer bob-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result[0].lastMessage.messageText").value("Existing history"))
                .andExpect(jsonPath("$.result[0].unreadCount").value(1));
        http.perform(get("/api/v1/chat/conversations/" + id + "/messages").header("Authorization", "Bearer bob-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.messages[0].metadata").isMap());
        http.perform(get("/api/v1/chat/preferences").header("Authorization", "Bearer bob-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result[0].pinned").value(true));
        // Versioned membership changes must work for documents written before package extraction.
        http.perform(post("/api/v1/chat/conversations/" + id + "/members").header("Authorization", "Bearer alice-token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"members\":[\"carol\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.version").value(1));
        send(id, "new-key", "New history");
        var latest = mongo.getCollection("messages").find(new org.bson.Document("messageText", "New history")).first();
        assertThat(latest.getString("_class")).isEqualTo("com.ccadro.chat.ChatDocuments$Message");
        assertThat(mongo.indexOps(Message.class).getIndexInfo()).anyMatch(index -> "conversation_timeline".equals(index.getName()));
    }


    @Test void socketTicketRequiresAnAuthenticatedRestSession() throws Exception {
        http.perform(post("/api/v1/chat/socket-ticket")).andExpect(status().isUnauthorized());
        String ticket = ticket("alice");
        assertThat(ticket).hasSize(43).doesNotContain("alice-token");
    }
    String ticket(String user) throws Exception {
        return json.readTree(http.perform(post("/api/v1/chat/socket-ticket").header("Authorization", "Bearer " + user + "-token"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("result").path("ticket").asText();
    }

    @Test void socketIoPersistsAuthenticatedSessionsAndPublishesOnlyConversationMembers() throws Exception {
        String id = create("DM");
        try (var alice = socket("alice"); var bob = socket("bob"); var carol = socket("carol")) {
            alice.await("ready"); bob.await("ready"); carol.await("ready");
            assertThat(mongo.count(new org.springframework.data.mongodb.core.query.Query(), ChatSocketSession.class)).isEqualTo(3);
            send(id, "socket-event", "Persist before broadcast");
            assertThat(alice.changedConversation()).isEqualTo(id);
            assertThat(bob.changedConversation()).isEqualTo(id);
            assertThat(carol.frames.poll(300, TimeUnit.MILLISECONDS)).isNull();
        }
        org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(3)).untilAsserted(() ->
                assertThat(mongo.count(new org.springframework.data.mongodb.core.query.Query(), ChatSocketSession.class)).isZero());
    }

    SocketProbe socket(String user) throws Exception {
        return new SocketProbe(user);
    }

    class SocketProbe implements AutoCloseable {
        final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        final io.socket.client.Socket client;
        SocketProbe(String user) throws Exception {
            var options = new io.socket.client.IO.Options();
            options.path = "/api/v1/chat/socket.io/";
            options.query = "ticket=" + ticket(user);
            options.transports = new String[] {"websocket"};
            options.reconnection = false;
            options.timeout = 5000;
            options.extraHeaders = Map.of("Origin", List.of("http://localhost:5173"));
            client = io.socket.client.IO.socket("http://127.0.0.1:" + socketPort, options);
            client.on("ready", ignored -> frames.offer("ready"));
            client.on("message", args -> frames.offer(args[0].toString()));
            client.on("connect_error", args -> frames.offer("connect_error:" + args[0]));
            client.connect();
        }
        String await(String type) throws Exception {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < deadline) {
                String frame = frames.poll(100, TimeUnit.MILLISECONDS);
                if (frame == null) continue;
                if (frame.startsWith("connect_error:")) throw new AssertionError(frame);
                if (frame.equals(type)) return frame;
                if (type.equals("message") && frame.contains("conversationId")) return frame;
            }
            throw new AssertionError("No Socket.IO event: " + type);
        }
        String changedConversation() throws Exception {
            return json.readTree(await("message")).path("conversationId").asText();
        }
        @Override public void close() { client.disconnect(); client.close(); }
    }
}
