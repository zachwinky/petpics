import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { isAdmin } from '@/lib/admin';
import DashboardNavbar from './DashboardNavbar';

export default async function DashboardNavWrapper() {
  const session = await auth();

  let userData = null;

  if (session?.user?.id) {
    const userId = parseInt(session.user.id);
    if (!isNaN(userId)) {
      const user = await getUserById(userId);
      if (user) {
        userData = {
          name: user.name ?? null,
          email: user.email,
          isAdmin: isAdmin(user.email),
        };
      }
    }
  }

  return <DashboardNavbar user={userData} />;
}
