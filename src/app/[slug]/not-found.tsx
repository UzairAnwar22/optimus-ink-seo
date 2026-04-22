export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="text-center">
        <div className="text-6xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
        <p className="text-gray-500 mb-6">This profile doesn&apos;t exist or hasn&apos;t been published yet.</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}
