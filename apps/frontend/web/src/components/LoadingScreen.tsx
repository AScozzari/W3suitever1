export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-2xl">W3</span>
        </div>
        <h2 className="text-2xl font-bold text-gradient-brand mb-2">
          W3 Suite
        </h2>
        <p className="text-neutral-400">Caricamento piattaforma enterprise...</p>
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    </div>
  );
}