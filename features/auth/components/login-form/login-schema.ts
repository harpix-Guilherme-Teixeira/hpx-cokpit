import { z } from "zod";

export const esquemaLogin = z.object({
  email: z.email({ error: "E-mail inválido" }).min(1, { error: "Campo obrigatório" }),
  senha: z.string().min(1, { error: "Campo obrigatório" }),
});

export type EsquemaLogin = z.infer<typeof esquemaLogin>;
