import { MovieForm } from "../_components/movie-form";

export default function NewMoviePage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">افزودن فیلم</h1>
        <p className="text-sm text-muted-foreground">اطلاعات فیلم جدید را ثبت کنید.</p>
      </div>
      <MovieForm />
    </div>
  );
}
