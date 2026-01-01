import { CourseForm } from "../_components/course-form";
import { createCourseAction } from "../actions";

export default function NewCoursePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Course</h1>
        <p className="text-sm text-muted-foreground">Start a new course draft.</p>
      </div>
      <CourseForm action={createCourseAction} submitLabel="Create Course" redirectTo="/admin/courses" />
    </div>
  );
}
