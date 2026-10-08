import axios from "axios";
import { enquirySchema, newsletterSchema, type EnquiryFormInput, type NewsletterInput } from "@shared/enquiry";

const api = axios.create({ timeout: 10000 });

export interface ApiFailure {
  message: string;
  fieldErrors?: Partial<Record<string, string[]>>;
}

function toFailure(err: unknown, fallback: string): ApiFailure {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return { message: "Couldn't reach the server. Check your connection and try again." };
    }
    const data = err.response.data as { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
    return { message: data?.error ?? fallback, fieldErrors: data?.fieldErrors };
  }
  return { message: fallback };
}

/**
 * Submits an enquiry. Validates with the same shared zod schema the server uses before
 * sending, so obviously-invalid input never leaves the browser — but the server re-validates
 * independently and is the only check that actually matters for correctness/security.
 */
export async function submitEnquiry(
  input: EnquiryFormInput
): Promise<{ ok: true; id: string } | { ok: false; error: ApiFailure }> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }
  try {
    const { data } = await api.post<{ ok: true; id: string }>("/api/enquiries", parsed.data);
    return data;
  } catch (err) {
    return { ok: false, error: toFailure(err, "Something went wrong. Please try again.") };
  }
}

export async function subscribeNewsletter(
  input: NewsletterInput
): Promise<{ ok: true; alreadySubscribed: boolean } | { ok: false; error: ApiFailure }> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: "Enter a valid email address.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }
  try {
    const { data } = await api.post<{ ok: true; alreadySubscribed: boolean }>("/api/newsletter", parsed.data);
    return data;
  } catch (err) {
    return { ok: false, error: toFailure(err, "Something went wrong. Please try again.") };
  }
}
