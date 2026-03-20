import FichesServer from "./FichesServer";
import FichesClient from "./FichesClient";

export const dynamic = "force-dynamic";

export default async function Fiches({
  params,
}: {
  params: Promise<{ fichesId: string }>;
}) {
  const { fichesId } = await params;

  return (
    <FichesServer fichesId={fichesId}>
      {(data) => <FichesClient fichesId={fichesId} serverData={data} />}
    </FichesServer>
  );
}
