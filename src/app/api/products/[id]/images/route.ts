import { assertSameOrigin, handle, json } from "../../../../../server/http";
import { requireActor } from "../../../../../server/auth/session";
import { AppError } from "../../../../../server/errors";
import { addProductImage, listProductImages } from "../../../../../server/images/service";
import { MAX_IMAGE_BYTES } from "../../../../../server/images/validate-image";
import { assertUuid } from "../../../../../server/uuid";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    return json(await listProductImages(actor, id));
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError(422, "VALIDATION", "Envie o arquivo no campo file.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AppError(413, "IMAGE_TOO_LARGE", "A imagem passa de 8 MB.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await addProductImage(actor, id, buffer);
    return json(image, 201);
  });
}
