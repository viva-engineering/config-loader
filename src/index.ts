
export { ConfigSource, ConfigSourceParams, Params } from './sources/source';
export { EnvFileSource, EnvFileParams } from './sources/env-file';
export { AwsParameterStoreSource, AwsParameterStoreParameters } from './sources/aws-parameter-store';

import { bool, number, string } from './cast';
import { lowercase, uppercase } from './transform';
import { ConfigSource, ConfigSourceParams, Params } from './sources/source';

export interface LoadOptions<T> {
	/** The sources from which to load parameters */
	sources: ConfigSource[];

	/** If provided, loaded configuration will be stored on this object */
	writeTo?: T;

	/** If provided, transforms keys before storing them on the results object */
	transformKeys?: (key: string) => string;
}

/**
 * Loads configuration from the provided sources
 */
export const loadConfiguration = async <T extends object>(options: LoadOptions<T>) : Promise<T> => {
	const result = options.writeTo || { } as T;
	const loaded = await Promise.all(options.sources.map((source) => source.load()));

	for (let i = 0; i < loaded.length; i++) {
		const params = loaded[i];
		const keys = Object.keys(params);

		for (let j = 0; j < keys.length; j++) {
			const key = keys[i];
			const finalKey = options.transformKeys ? options.transformKeys(key) : key;

			if (! result[finalKey]) {
				result[finalKey] = params[key];
			}
		}
	}

	return result;
};

/**
 * Simple convienence utilities for casting string values into various other types, optionally
 * with a fallback or default value.
 */
export const cast = {
	bool,
	number,
	string
};

/**
 * Simple convienence utilites for key transformations.
 */
export const transform = {
	lowercase,
	uppercase
};
