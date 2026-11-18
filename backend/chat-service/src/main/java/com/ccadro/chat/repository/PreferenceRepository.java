package com.ccadro.chat.repository;

import com.ccadro.chat.entity.Preference;
import java.util.List;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
public class PreferenceRepository {
    private final MongoTemplate mongo;

    public PreferenceRepository(MongoTemplate mongo) { this.mongo = mongo; }

    public List<Preference> findByUsername(String username) {
        return mongo.find(Query.query(Criteria.where("username").is(username)).limit(200), Preference.class);
    }

    public void upsert(String id, String username, String conversationId, Boolean pinned, Boolean muted) {
        Update update = new Update().setOnInsert("username", username).setOnInsert("conversationId", conversationId);
        if (pinned != null) update.set("pinned", pinned);
        if (muted != null) update.set("muted", muted);
        mongo.upsert(Query.query(Criteria.where("_id").is(id)), update, Preference.class);
    }
}
