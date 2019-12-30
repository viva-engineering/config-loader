
import { logDebug } from '../logger';
import { ConfigSource, ConfigSourceParams, Params } from './source';
import * as SSM from 'aws-sdk/clients/ssm';

const pageSize = 10;

export interface AwsParameterStoreParameters extends ConfigSourceParams {
	/** Any additional configuration overrides to provide to the SSM client */
	config?: SSM.ClientConfiguration;

	/** Individual parameters to be loaded from AWS SSM Parameter Store */
	params?: string[];

	/** Paths containing parameters to be loaded from AWS SSM Parameter Store */
	paramPaths?: string[];
}

export class AwsParameterStoreSource extends ConfigSource {
	private readonly client: SSM;
	private readonly params: string[];
	private readonly paramPaths: string[];

	constructor(params: AwsParameterStoreParameters) {
		super(params);

		const config: SSM.ClientConfiguration = {
			apiVersion: '2014-11-06'
		};

		if (params.config) {
			Object.assign(config, params.config);
		}

		logDebug(`AwsParameterStoreSource: Creating AWS SSM client`);

		this.client = new SSM(config);
		this.params = params.params || [ ];
		this.paramPaths = params.paramPaths || [ ];
	}

	public load() {
		// 
	}

	private loadIndividualKeys() {
		// 
	}

	private loadPath() {
		// 
	}

	private makeGetParamsByPathCall(path: string, nextToken?: string) : Promise<SSM.GetParametersByPathResult> {
		logDebug(`AwsParameterStoreSource: Loading parameters by path path=${path} nextToken=${nextToken}`);

		return new Promise((resolve, reject) => {
			const params: SSM.GetParametersByPathRequest = {
				Path: path,
				Recursive: true,
				MaxResults: pageSize,
				WithDecryption: true
			};

			if (nextToken) {
				params.NextToken = nextToken;
			}

			this.client.getParametersByPath(params, (error, data) => {
				if (error) {
					logDebug(`AwsParameterStoreSource: Error encountered loading parameters by path path=${path} nextToken=${nextToken}`);

					return reject(error);
				}

				logDebug(`AwsParameterStoreSource: Finished loading parameters by path path=${path} nextToken=${nextToken}`);
				resolve(data);
			});
		});
	}
}

/**
 * Reads configuration from AWS SSM Parameter Store and imports the key/value pair into an environment variable
 *
 * @param path The key(s) in parameter store to read from.
 */
export const importEnvironmentFromAwsParameterStore = async (keys: string[]) : Promise<void> => {
	logDebug('importEnvironmentFromAwsParameterStore started');

	const client = getClient();

	for (let i = 0; i < keys.length; i++) {
		try {
			await importParameter(client, keys[i]);
		}

		catch (error) {
			logDebug(`Failed to load config from parameter store param ${keys[i]}: ${error.stack}`);
		}
	}
};

/**
 * Reads configuration from AWS SSM Parameter Store and imports the key/value pairs into environment variables
 *
 * @param path The path(s) in parameter store to read from.
 */
export const importEnvironmentFromAwsParameterStoreByPath = async (paths: string[]) : Promise<void> => {
	logDebug('importEnvironmentFromAwsParameterStoreByPath started');

	const client = getClient();

	for (let i = 0; i < paths.length; i++) {
		try {
			await importParametersByPath(client, paths[i]);
		}

		catch (error) {
			logDebug(`Failed to load config from parameter store path ${paths[i]}: ${error.stack}`);
		}
	}

	logDebug('importEnvironmentFromAwsParameterStoreByPath finished');
};

const importParameter = async (client: SSM, param: string) : Promise<void> => {
	logDebug(`importParameter started param=${param}`);

	return new Promise((resolve, reject) => {
		const params: SSM.GetParameterRequest = {
			Name: param,
			WithDecryption: true
		};

		client.getParameter(params, (error, data) => {
			if (error) {
				logDebug(`importParameter call finished with error param=${param}`);

				return reject(error);
			}

			const name = data.Parameter.Name.split('/').pop();

			storeParam(name, data.Parameter.Value);
			logDebug(`importParameter finished param=${param}`);
			resolve();
		});
	});
};

const importParametersByPath = async (client: SSM, path: string) : Promise<void> => {
	logDebug(`importParametersByPath started path=${path}`);

	let nextToken: string;

	do {
		const result = await makeGetParamsCall(client, path, nextToken);

		nextToken = result.NextToken;

		result.Parameters.forEach((param) => {
			storeParam(param.Name, param.Value, path);
		});
	}
	while (nextToken);

	logDebug(`importParametersByPath finished path=${path}`);
};
