import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder) => {
    // conversations

    pgm.createTable("conversations", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        type: {
            type: "varchar(10)",
            notNull: true,
        },
    })

    pgm.addConstraint("conversations", "conversations_type_check", {
        check: `type IN ('dm', 'gc')`,
    });

    // dm_pairs
    pgm.createTable("dm_pairs", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        user1_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },
        user2_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },

        conversation_id: {
            type: "uuid",
            notNull: true,
            references: "conversations",
            onDelete: "CASCADE",
        },
    })

    pgm.addConstraint("dm_pairs", "dm_pairs_users_different", {
        check: "user1_id <> user2_id",
    });

    pgm.addConstraint("dm_pairs", "dm_pairs_unique_users", {
        unique: ["user1_id", "user2_id"],
    });

    pgm.addConstraint("dm_pairs", "dm_pairs_unique_conversation", {
        unique: "conversation_id",
    });

    // groups

    pgm.createTable("groups", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        conversation_id: {
            type: "uuid",
            notNull: true,
            references: "conversations",
            onDelete: "CASCADE",
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },

        admin_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "RESTRICT",
        },
        name: {
            type: "varchar(100)",
            notNull: true,
        },

        description: {
            type: "text",
        },

        group_profile: {
            type: "text",
            notNull: true,
            default: "default_url",
        },
    });

    pgm.addConstraint("groups", "groups_unique_conversation", {
        unique: "conversation_id",
    });

    //   messages

    pgm.createTable("messages", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        created_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },

        edited_at: {
            type: "timestamp with time zone",
        },

        conversation_id: {
            type: "uuid",
            notNull: true,
            references: "conversations",
            onDelete: "CASCADE",
        },
        deleted_at: {
            type: "timestamp with time zone",
        },

        content: {
            type: "text",
            notNull: true,
        },

        sender_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },
    });


    //   conversation_participants

    pgm.createTable("conversation_participants", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },

        conversation_id: {
            type: "uuid",
            notNull: true,
            references: "conversations",
            onDelete: "CASCADE",
        },

        user_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },
        joined_at: {
            type: "timestamp with time zone",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },

        role: {
            type: "varchar(20)",
            notNull: true,
            default: "member",
        },

        last_read_message_id: {
            type: "uuid",
            references: "messages",
            onDelete: "SET NULL",
        },
    });

    pgm.addConstraint(
        "conversation_participants",
        "conversation_participants_unique_user",
        {
            unique: ["conversation_id", "user_id"],
        },
    );

    pgm.addConstraint(
        "conversation_participants",
        "conversation_participants_role_check",
        {
            check: `role IN ('member', 'mod', 'admin')`,
        },
    );

    
    pgm.createIndex("messages", "conversation_id");

    pgm.createIndex(
        "messages",
        ["conversation_id", "created_at"],
    );

    pgm.createIndex(
        "conversation_participants",
        "user_id",
    );

    pgm.createIndex(
        "dm_pairs",
        ["user1_id", "user2_id"],
    );
    pgm.createIndex(
        "dm_pairs",
        "conversation_id",
    );

}

export const down = (pgm: MigrationBuilder) => {
    
    pgm.dropTable("conversation_participants");
    pgm.dropTable("messages");
    pgm.dropTable("groups");
    pgm.dropTable("dm_pairs");
    pgm.dropTable("conversations");
};