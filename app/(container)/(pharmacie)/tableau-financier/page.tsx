import TableauFinancierServer from "@/components/TableauFinancierServer";

export default async function TableauFinancierPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    clinique?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tableau Financier</h1>
      <TableauFinancierServer searchParams={params} />
    </div>
  );
}
