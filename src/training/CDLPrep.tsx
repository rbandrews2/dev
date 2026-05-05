import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CourseDetailContent } from "@/pages/training/CourseDetail";

export default function CDLModule() {
  return (
    <div className="min-h-screen text-yellow-100 pb-14">
      <section className="max-w-6xl mx-auto px-4 pt-6 space-y-4">
        <Link to="/training" className="inline-flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100">
          <ArrowLeft className="w-4 h-4" /> Back to Training Center
        </Link>
        <CourseDetailContent courseId="cdl_prep" />
      </section>
    </div>
  );
}
