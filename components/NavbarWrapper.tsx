import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { isAdmin } from '@/lib/admin';
import Navbar from './Navbar';

export default async function NavbarWrapper() {
  const session = await auth();

  let userData = null;

  if (session?.user?.id) {
    const userId = parseInt(session.user.id);

    // Only query database if we have a valid integer ID
    if (!isNaN(userId)) {
      const user = await getUserById(userId);
      if (user) {
        userData = {
          name: user.name,
          email: user.email,
          creditsBalance: user.credits_balance,
          isAdmin: isAdmin(user.email),
        };
      }
    }
  }

  return <Navbar user={userData} />;
}
