import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { RedirectIfAuthed } from '@/components/require-auth'
import { ChatPage } from '@/pages/chat-page'
import { ExplorePage } from '@/pages/explore-page'
import { JobDetailsPage } from '@/pages/job-details-page'
import { LoginPage } from '@/pages/login-page'
import { MessagesPage } from '@/pages/messages-page'
import { MyGigsPage } from '@/pages/my-gigs-page'
import { PostJobPage } from '@/pages/post-job-page'
import { ProfilePage } from '@/pages/profile-page'

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <div className="min-h-dvh bg-background sm:py-6">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:border sm:border-border sm:shadow-xl">
          <RedirectIfAuthed to="/explore">
            <LoginPage />
          </RedirectIfAuthed>
        </div>
      </div>
    ),
  },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/explore" replace /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/jobs/:id', element: <JobDetailsPage /> },
      { path: '/post-job', element: <PostJobPage /> },
      { path: '/my-gigs', element: <MyGigsPage /> },
      { path: '/messages', element: <MessagesPage /> },
      { path: '/messages/:threadId', element: <ChatPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/explore" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
