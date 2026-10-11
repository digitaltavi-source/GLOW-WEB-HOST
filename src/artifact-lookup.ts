import * as z from 'zod/v4';
export const ArtifactLookupSchema=z.object({
 mission_id:z.string().regex(/^NM-[a-f0-9]{12}$/),
 artifact_sha256:z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
