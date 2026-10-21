import { notFound } from 'next/navigation';
import BoardDev, { type BoardDevParams } from './board-dev';

const KEYS = ['ingestMs', 'firstTokenMs', 'wordMs', 'latencyMs'] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const sp = await searchParams;
  const params: BoardDevParams = {};
  for (const k of KEYS) {
    const raw = sp[k];
    if (raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) params[k] = n;
  }
  if (sp.ask) params.ask = sp.ask;
  if (sp.model) params.model = sp.model;
  if (sp.fresh === '1') params.fresh = true;
  if (sp.keys === '1') params.keys = true;
  if (sp.showcase === '1') params.showcase = true;
  return <BoardDev params={params} />;
}
