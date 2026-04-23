"use client"

import { useSelectedLayoutSegment } from "next/navigation"
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen bg-background'>
      <Sidebar />
      <div className='flex-1 flex flex-col min-w-0'>
        <Header />
        <main className='flex-1 px-6 py-7 lg:px-8'>
          <div className="mx-auto w-full max-w-[1300px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
