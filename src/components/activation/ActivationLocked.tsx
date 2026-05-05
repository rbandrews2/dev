export default function ActivationLocked() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold text-red-500">
          Application Locked
        </h1>

        <p className="text-sm text-gray-300">
          Your app is now locked due to repeated activation failures.
        </p>

        <p className="text-sm text-gray-400">
          Please contact customer service to regain access.
        </p>
      </div>
    </div>
  );
}
