import { assertSameOrigin, handle, json } from "../../../../../../server/http";
import { requireActor } from "../../../../../../server/auth/session";
import { deleteProductImage, loadProductImage } from "../../../../../../server/images/service";
import { assertUuid } from "../../../../../../server/uuid";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  return handle(async () => {
    const actor = await requireActor(request);
    const { id, imageId } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    assertUuid(imageId, "Imagem não encontrada.");
    const image = await loadProductImage(actor, id, imageId);
    return new Response(new Uint8Array(image.bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id, imageId } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    assertUuid(imageId, "Imagem não encontrada.");
    return json(await deleteProductImage(actor, id, imageId));
  });
}
