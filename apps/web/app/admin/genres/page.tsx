import { GenresPanel } from "./_components/genres-panel";

export default function AdminGenresPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ژانرها</h1>
        <p className="text-sm text-muted-foreground">مدیریت لیست ژانرهای فیلم.</p>
      </div>
      <GenresPanel />
    </div>
  );
}
