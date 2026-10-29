
import { getPool } from "../../db/pool";

export interface UserSearchRow {
    id: string;
    username: string;
    avatar_url: string | null;
    sort_key: string;
}

export interface PublicUserProfile {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
}


const pool = getPool();

export async function searchUsers(params: {
    prefix: string;
    viewerId: string;
    limit: number;
    after?: {
        sortKey: string;
        id: string;
    };
}): Promise<UserSearchRow[]> {
    const values: unknown[] = [
        `${params.prefix}%`,
        params.viewerId,
    ];

    let cursorClause = "";

    if (params.after) {
        values.push(params.after.sortKey, params.after.id);

        cursorClause = `
      AND (lower(u.username), u.id) > ($3, $4::uuid)
    `;
    }

    values.push(params.limit + 1);

    const limitPlaceholder = `$${values.length}`;

    const result = await pool.query(
        `
      SELECT
        u.id,
        u.username,
        u.avatar_url,
        lower(u.username) AS sort_key
      FROM users u
      WHERE lower(u.username) LIKE $1
        AND u.email_verified_at IS NOT NULL
        AND u.is_banned = false
        AND u.id <> $2
        ${cursorClause}
      ORDER BY lower(u.username), u.id
      LIMIT ${limitPlaceholder}
    `,
        values
    );

    return result.rows;
}


export const findPublicUserById = async (
    userId: string,
): Promise<PublicUserProfile | null> => {
    try {
        const result = await pool.query<PublicUserProfile>(
            `
            SELECT
                id,
                username,
                display_name AS "displayName",
                avatar_url AS "avatarUrl"
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [userId],
        );

        return result.rows[0] ?? null;
    } catch (error) {
        // 22P02 = "invalid input syntax" (a malformed id in the URL).
        // Treat it as "not found" instead of crashing with a 500.
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "22P02"
        ) {
            return null;
        }
        throw error;
    }
};

