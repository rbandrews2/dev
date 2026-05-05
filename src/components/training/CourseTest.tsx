export default function CourseTest({ courseId }: { courseId: string }) {
  return (
    <div className="border rounded-xl p-4 bg-black/60">
      <h3 className="text-lg font-semibold text-white">Final Test</h3>
      <p className="text-sm text-muted-foreground">
        Complete the assessment to unlock certification.
      </p>
    </div>
  );
}
