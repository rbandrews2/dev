export default function CertificatePanel({ courseId }: { courseId: string }) {
  return (
    <div className="border rounded-xl p-4 bg-black/70">
      <h3 className="text-lg font-semibold text-white">Certificate</h3>
      <p className="text-sm text-muted-foreground">
        Certificate available after successful completion.
      </p>
    </div>
  );
}
