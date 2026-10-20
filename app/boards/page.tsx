import { BoardsRoute } from '@/components/board/board-route';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  // ?api=mock mounts the in-memory MockEngineApi; never honoured in production builds.
  const mock = process.env.NODE_ENV !== 'production' && sp.api === 'mock';
  return <BoardsRoute mock={mock} />;
}
