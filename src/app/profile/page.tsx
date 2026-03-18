import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/auth';
import UserProfile from '@/components/UserProfile';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth_token')?.value;

  if (!userId) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold">个人中心</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <UserProfile />
      </main>
    </div>
  );
}