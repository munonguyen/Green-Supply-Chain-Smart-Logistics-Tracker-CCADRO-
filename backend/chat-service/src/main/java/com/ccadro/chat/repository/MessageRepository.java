package com.ccadro.chat.repository;

import com.ccadro.chat.entity.Message;
import com.ccadro.chat.util.MessageCursor;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
public class MessageRepository {
    private final MongoTemplate mongo;

    public MessageRepository(MongoTemplate mongo) { this.mongo = mongo; }

    public Message findLatest(String conversationId) {
        return mongo.findOne(Query.query(Criteria.where("conversationId").is(conversationId))
                .with(Sort.by(Sort.Direction.DESC, "createdAt", "_id")).limit(1), Message.class);
    }

    public long countUnread(String conversationId, String username) {
        return mongo.count(Query.query(Criteria.where("conversationId").is(conversationId)
                .and("readBy").ne(username)), Message.class);
    }

    /** Read limit + 1 to detect another page without another count query. */
    public List<Message> findPage(String conversationId, MessageCursor.Position cursor, int limit) {
        Criteria criteria = Criteria.where("conversationId").is(conversationId);
        if (cursor != null) {
            criteria = new Criteria().andOperator(criteria, new Criteria().orOperator(
                    Criteria.where("createdAt").lt(cursor.createdAt()),
                    Criteria.where("createdAt").is(cursor.createdAt()).and("_id").lt(cursor.messageId())));
        }
        return mongo.find(Query.query(criteria).with(Sort.by(Sort.Direction.DESC, "createdAt", "_id"))
                .limit(limit + 1), Message.class);
    }

    public Message insert(Message message) { return mongo.insert(message); }
    public Message findById(String id) { return mongo.findById(id, Message.class); }

    public Message findByIdAndConversation(String messageId, String conversationId) {
        return mongo.findOne(Query.query(Criteria.where("_id").is(messageId)
                .and("conversationId").is(conversationId)), Message.class);
    }

    public long markReadThrough(String conversationId, String username, Message through) {
        var boundary = new Criteria().orOperator(Criteria.where("createdAt").lt(through.getCreatedAt()),
                Criteria.where("createdAt").is(through.getCreatedAt()).and("_id").lte(through.getId()));
        return mongo.updateMulti(Query.query(new Criteria().andOperator(
                        Criteria.where("conversationId").is(conversationId), boundary)),
                new Update().addToSet("readBy", username), Message.class).getModifiedCount();
    }

    public boolean updateReaction(String conversationId, String messageId, String username,
            String emoji, boolean active) {
        var update = new Update();
        if (active) update.addToSet("reactions." + emoji, username);
        else update.pull("reactions." + emoji, username);
        return mongo.updateFirst(Query.query(Criteria.where("_id").is(messageId)
                .and("conversationId").is(conversationId)), update, Message.class).getMatchedCount() > 0;
    }
}
