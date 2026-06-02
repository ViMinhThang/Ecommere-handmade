import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { PublicVoucherSection } from "@/components/storefront/public-promotions-section";

export default function VouchersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />
      <main className="pt-24">
        <PublicVoucherSection />
      </main>
      <CustomerFooter />
    </div>
  );
}
