
export const lowercase = (key: string) : string => {
	return key.toLowerCase();
};

export const uppercase = (key: string) : string => {
	return key.toUpperCase();
};

export const lastSegment = (key: string) : string => {
	return key.split('/').pop();
};
