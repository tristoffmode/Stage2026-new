export interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data?: T;
	error?: {
		code?: string;
		message?: string;
		details?: unknown;
	};
	request_id?: string;
}

export function unwrapApiData<T>(payload: unknown, fallback: T): T {
	if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
		const envelope = payload as ApiEnvelope<T>;
		return envelope.data ?? fallback;
	}

	if (payload === null || payload === undefined) {
		return fallback;
	}

	return payload as T;
}

export function isApiSuccess(payload: unknown): boolean {
	if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
		return Boolean((payload as ApiEnvelope<unknown>).success);
	}

	return true;
}

export function getApiMessage(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') return undefined;
	const body = payload as ApiEnvelope<unknown>;
	return body.message || body.error?.message;
}
