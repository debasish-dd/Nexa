export interface DiscoverableGroup {
  conversationId: string;
  name: string;
  description: string | null;
  groupProfile: string | null;
  memberCount: number;
  createdAt: string;
}

export interface DiscoverablePage {
  groups: DiscoverableGroup[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}