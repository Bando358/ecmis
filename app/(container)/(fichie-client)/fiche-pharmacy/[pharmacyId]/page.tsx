import FichePharmacyServer from "./FichePharmacyServer";
import FichePharmacyClient from "./FichePharmacy";

// Forcer le rendu dynamique : empêche Next.js de servir un cache stale
export const dynamic = "force-dynamic";

export default async function FichePharmacy({
  params,
}: {
  params: Promise<{ pharmacyId: string }>;
}) {
  const { pharmacyId } = await params;

  return (
    <FichePharmacyServer pharmacyId={pharmacyId}>
      {(serverData) => (
        <FichePharmacyClient params={params} serverData={serverData} />
      )}
    </FichePharmacyServer>
  );
}
