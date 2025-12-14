import { restoreDatabase } from "@/lib/actions/sauvegardActions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await restoreDatabase(formData);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
