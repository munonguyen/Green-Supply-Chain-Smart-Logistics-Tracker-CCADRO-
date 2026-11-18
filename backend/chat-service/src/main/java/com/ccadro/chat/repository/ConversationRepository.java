package com.ccadro.chat.repository;

import com.ccadro.chat.entity.Conversation;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

@Repository
public class ConversationRepository {
    private final MongoTemplate mongo;

    public ConversationRepository(MongoTemplate mongo) { this.mongo = mongo; }

    public Conversation findByIdAndMember(String id, String username) {
        return mongo.findOne(Query.query(Criteria.where("_id").is(id)
                .and("members").is(username)), Conversation.class);
    }

    public List<Conversation> findByMember(String username) {
        return mongo.find(Query.query(Criteria.where("members").is(username))
                .with(Sort.by(Sort.Direction.DESC, "createdAt", "_id")).limit(200), Conversation.class);
    }

    public Conversation insert(Conversation conversation) { return mongo.insert(conversation); }

    /** Mongo @Version protects simultaneous membership changes. */
    public Conversation save(Conversation conversation) { return mongo.save(conversation); }
}
