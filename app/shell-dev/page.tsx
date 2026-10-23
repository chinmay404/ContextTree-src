import { notFound } from 'next/navigation';
import { LandingV3 } from '@/components/shell/landing/LandingV3';
import { SignInV3 } from '@/components/shell/signin/SignInV3';

/**
 * The V3 landing page and sign-in sheet without the NEXT_PUBLIC_BOARD_V3 flag, for visual checks and e2e (`?screen=landing`
 * or `?screen=signin`). Dev only: 404s in production, like /board-dev.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { screen } = await searchParams;
  if (screen === 'signin') return <SignInV3 />;
  if (screen === 'landing') return <LandingV3 />;
  notFound();
}
