import { BoardRoute } from '@/components/board/board-route';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { boardId } = await params;
  const sp = await searchParams;
  const mock = process.env.NODE_ENV !== 'production' && sp.api === 'mock';
  return <BoardRoute boardId={boardId} mock={mock} />;
}
