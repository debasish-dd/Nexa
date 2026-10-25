import {
  Bell,
  Bookmark,
  Compass,
  House,
  MessageCircle,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/feed", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];

// Phones only have room for four items plus a centre "+" slot (reserved for
// "Create post" once posting exists). Everything else stays on the sidebar.
export const MOBILE_NAV_HREFS = ["/feed", "/communities", "/messages", "/profile"];