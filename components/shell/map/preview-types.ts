import type { Id, SourceType } from '@/components/board/api/types';

// TODO(controller): re-export from components/board/api/types once Task 1 lands.
// Mirrors the contract amendment (GET /boards adds `preview` to the 24 most recently updated boards).
export interface BoardPreviewCard {
  id: Id;
  kind: 'chat' | 'source';
  sourceType: SourceType | null;
  x: number;
  y: number;
  deskId: Id | null;
  pileId: Id | null;
  parentId: Id | null;
  name?: string; // chats only, up to 60 chars
}
export interface BoardPreview {
  cards: BoardPreviewCard[];
  edges: { kind: 'wire' | 'answer'; from: Id; to: Id }[];
}
