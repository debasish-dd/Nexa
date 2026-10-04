
import { getPool } from "../../db/pool";

export interface UserSearchRow {
    id: string;
    username: string;
    avatar_url: string | null;
    sort_key: string;
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
