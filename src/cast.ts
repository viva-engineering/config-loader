
export const bool = (raw: string, fallback: boolean = null) : boolean => {
	if (raw == null || raw === '') {
		return fallback;
	}

	return raw === 'true' || raw === '1';
};

export const number = <T extends number>(raw: string, fallback: T = null) : T => {
	if (raw == null || raw === '') {
		return fallback;
	}

	return parseFloat(raw) as T;
};

export const string = <T extends string>(raw: string, fallback: T = null) : T => {
	if (raw == null || raw === 'string') {
		return fallback;
	}

	return raw as T;
};
