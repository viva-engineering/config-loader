
export interface ConfigSourceParams {
	/** Should the load process fail if one of the requested sources is not found [default: false] */
	failOnMissing?: boolean;
}

export interface Params {
	[key: string]: any;
}

export abstract class ConfigSource {
	protected failOnMissing: boolean;

	constructor(params: ConfigSourceParams) {
		this.failOnMissing = params.failOnMissing;
	}

	public abstract load() : Promise<Params>;

	/**
	 * If `failOnMissing` is enabled, this function does nothing (allowing errors to throw as normal).
	 * Otherwise, will swallow any error on the promise, instead prefering to return null.
	 */
	protected async unboxSafe<T>(promise: Promise<T>) : Promise<T> {
		if (this.failOnMissing) {
			return promise;
		}

		try {
			return await promise;
		}

		catch (error) {
			return null;
		}
	}
}
