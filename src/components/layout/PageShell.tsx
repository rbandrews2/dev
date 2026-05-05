type PageShellProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export default function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="p-6 min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      {description && (
        <p className="text-sm text-white/70 mb-6">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
