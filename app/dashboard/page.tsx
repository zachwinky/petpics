import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getUserById,
  getUserModels,
  getModelGenerationCount,
  getModelGenerations,
  getUserPendingTrainings,
  getUserActivePrintOrders,
  getUserCompletedPrintOrders,
  getOrderItemsForOrders,
} from '@/lib/db';
import type { PrintOrderItem } from '@/lib/db';
import DashboardNavWrapper from '@/components/DashboardNavWrapper';
import DashboardContent from '@/components/Dashboard/DashboardContent';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await getUserById(parseInt(session.user.id));
  if (!user) {
    redirect('/auth/signin');
  }

  // Parallel data fetch: models, trainings, and orders
  const [models, pendingTrainings, activeOrders, completedOrders] = await Promise.all([
    getUserModels(user.id),
    getUserPendingTrainings(user.id),
    getUserActivePrintOrders(user.id),
    getUserCompletedPrintOrders(user.id, 10),
  ]);

  // Get generation counts and recent images for each model
  const modelsWithCounts = await Promise.all(
    models.map(async (model) => {
      const [generationCount, generations] = await Promise.all([
        getModelGenerationCount(model.id, user.id),
        getModelGenerations(model.id, user.id),
      ]);
      const recentImages: string[] = [];
      for (const gen of generations) {
        for (const url of gen.image_urls) {
          if (recentImages.length >= 4) break;
          recentImages.push(url);
        }
        if (recentImages.length >= 4) break;
      }
      return { ...model, generationCount, recentImages };
    })
  );

  // Batch fetch order items for all orders
  const allOrderIds = [...activeOrders, ...completedOrders].map(o => o.id);
  const orderItemsMapRaw = await getOrderItemsForOrders(allOrderIds);

  // Convert Map to plain object for serialization to client component
  const orderItemsMap: Record<number, PrintOrderItem[]> = {};
  orderItemsMapRaw.forEach((items, orderId) => {
    orderItemsMap[orderId] = items;
  });

  // Prepare studio models (completed models only)
  const studioModels = models.map(m => ({
    id: m.id,
    name: m.name,
    lora_url: m.lora_url,
    trigger_word: m.trigger_word,
    pet_type: m.pet_type || 'dog',
    preview_image_url: m.preview_image_url || undefined,
  }));

  return (
    <div className="dashboard">
      <DashboardNavWrapper />
      <DashboardContent
        user={{ name: user.name ?? null, email: user.email }}
        studioModels={studioModels}
        modelsWithCounts={modelsWithCounts}
        pendingTrainings={pendingTrainings}
        activeOrders={activeOrders}
        completedOrders={completedOrders}
        orderItemsMap={orderItemsMap}
      />
    </div>
  );
}
