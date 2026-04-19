"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueFirNumber = void 0;
const ApiError_1 = require("./ApiError");
const createSevenDigitCandidate = () => String(Math.floor(1_000_000 + Math.random() * 9_000_000));
const generateUniqueFirNumber = async (db, maxAttempts = 40) => {
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
    throw new ApiError_1.ApiError(500, "Unable to allocate a unique 7-digit FIR number. Please retry.");
};
exports.generateUniqueFirNumber = generateUniqueFirNumber;
