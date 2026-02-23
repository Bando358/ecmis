import FichePharmacyServer from "./FichePharmacyServer";
import FichePharmacyClient from "./FichePharmacy";

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
