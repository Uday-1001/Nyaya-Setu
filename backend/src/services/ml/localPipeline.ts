/**
 * localPipeline.ts
 *
 * Previously contained a heuristic keyword→BNS-section classifier.
 * That logic has been removed entirely — all classification MUST go
 * through the Python ML service (ml-service/).
 *
 * This module is kept as a named export so existing call-sites compile,
 * but it always throws a 503 ApiError to make it obvious when the ML
 * service is not reachable rather than silently returning a wrong section.
 */

import { ApiError } from '../../utils/ApiError';
import type { NormalizedFullPipeline } from '../../types/ml.types';

/**
 * @throws {ApiError} 503 — ML service is required; no local fallback exists.
 */
export const buildLocalFullPipelineFromText = async (
  _text: string,
): Promise<NormalizedFullPipeline> => {
  throw new ApiError(
    503,
    'The ML classification service is currently unavailable. ' +
      'Please ensure the Python ML service is running and ML_SERVICE_URL is configured. ' +
      'No local fallback is active — results require the trained BNS model.',
  );
};
