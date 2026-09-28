import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashHistory, EntryForm, TodayStats } from "@/components/finance/FinanceParts";

export const Route = createFileRoute("/_authenticated/payinout")({
  head: () => ({
    meta: [
      { title: "PAY-IN / PAY-OUT — RenToPlay" },
      { name: "description", content: "Catat PAY-IN dan PAY-OUT kasir selama shift berjalan." },
      { property: "og:title", content: "PAY-IN / PAY-OUT — RenToPlay" },
      { property: "og:description", content: "Form cepat pencatatan uang masuk dan keluar kasir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayInOutPage,
});

function PayInOutPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">PAY-IN / PAY-OUT</h1>
      </header>
      <TodayStats />
      <Tabs defaultValue="in">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="in">PAY-IN</TabsTrigger>
          <TabsTrigger value="out">PAY-OUT</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="in" className="mt-4"><EntryForm direction="in" /></TabsContent>
        <TabsContent value="out" className="mt-4"><EntryForm direction="out" /></TabsContent>
        <TabsContent value="riwayat" className="mt-4"><CashHistory /></TabsContent>
      </Tabs>
    </div>
  );
}
