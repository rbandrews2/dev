import { getCourseMaterial } from "@/data/courseMaterials";
import CourseTest from "./CourseTest";
import CertificatePanel from "./CertificatePanel";
import VideoLibrary from "./VideoLibrary";

export default function CourseContent({ courseId }: { courseId: string }) {
  const course = getCourseMaterial(courseId);
  if (!course) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">{course.title}</h1>
      <p className="text-muted-foreground">{course.description}</p>

      <section>
        <h2 className="text-xl font-semibold text-white">Study Material</h2>
        <div className="prose prose-invert max-w-none space-y-4">
          {course.study.map((section) => (
            <article key={section.title} className="space-y-2">
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Videos</h2>
        <VideoLibrary topics={course.videoTopics} />
      </section>

      {course.requiresTest && <CourseTest courseId={courseId} />}
      {course.certificateEligible && <CertificatePanel courseId={courseId} />}
    </div>
  );
}
