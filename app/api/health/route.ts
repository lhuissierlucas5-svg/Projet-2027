import { supabase } from "../../../lib/supabase";
export const dynamic = "force-dynamic";
export async function GET() {
 const {error} = await supabase.from("candidates").select("id").limit(1);
 return Response.json({status:error ? "unavailable" : "ok",commit:process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}, {status:error ? 503 : 200,headers:{"Cache-Control":"no-store"}});
}
