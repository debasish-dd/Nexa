// What the database stores when nobody chose a group avatar.
export const NO_AVATAR_PLACEHOLDER = "default_url";

// The picture shown for such groups. Read on every call, so changing the env
// variable changes every group at once, and tests can stub it.
export const resolveGroupAvatar = (stored: string): string | null => {
    if (stored !== NO_AVATAR_PLACEHOLDER) return stored;

    return process.env.DEFAULT_GROUP_PROFILE || null;
};