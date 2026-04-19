import { ApiError } from "./ApiError";

type FIRLookupClient = {
  fIR: {
    findUnique(args: {
      where: { firNumber: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

const createSevenDigitCandidate = () =>
  String(Math.floor(1_000_000 + Math.random() * 9_000_000));

export const generateUniqueFirNumber = async (
  db: FIRLookupClient,
  maxAttempts = 40,
): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createSevenDigitCandidate();
    const existing = await db.fIR.findUnique({
      where: { firNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new ApiError(
    500,
    "Unable to allocate a unique 7-digit FIR number. Please retry.",
  );
};
