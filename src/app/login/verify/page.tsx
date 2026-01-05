export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-4 text-gray-600">
            We sent you a magic link to sign in. Click the link in your email to continue.
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <p className="text-sm text-blue-800">
            The link will expire in 24 hours. If you don&apos;t see the email, check your spam folder.
          </p>
        </div>

        <a
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          &larr; Back to login
        </a>
      </div>
    </div>
  );
}
