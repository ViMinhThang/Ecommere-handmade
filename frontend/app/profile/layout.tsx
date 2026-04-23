"use client"

import { ProfileSidebar } from "@/components/dashboard/profile-sidebar"
import { CustomerNavBar } from "@/components/layout/customer-nav-bar"
import { CustomerFooter } from "@/components/layout/customer-footer"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerNavBar />
      
      <main className="flex-1 pt-24 lg:pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto w-full px-8 flex flex-col md:flex-row gap-10 lg:gap-14">
          <ProfileSidebar />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  )
}
