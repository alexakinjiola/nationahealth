import "server-only";
import { cookies } from "next/headers";
import { isLang, translate, type Lang, type MessageKey } from "./dictionaries";

export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

/** Translator for server components: `const t = await getT(); t("nav.home")`. */
export async function getT() {
  const lang = await getLang();
  return Object.assign((key: MessageKey) => translate(lang, key), { lang });
}
