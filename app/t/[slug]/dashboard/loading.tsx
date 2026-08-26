import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />

      <Card className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} padded={false} className="flex items-center justify-between px-6 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
