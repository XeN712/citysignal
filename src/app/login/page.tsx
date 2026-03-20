import { Suspense } from 'react'
import LoginForm from './LoginForm'

// Skeleton affiché pendant le chargement du composant client
function LoginSkeleton() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-32 bg-gray-800 rounded-xl" />
          <div className="h-12 bg-gray-800 rounded-xl" />
          <div className="h-12 bg-gray-800 rounded-xl" />
          <div className="h-12 bg-red-900/30 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
