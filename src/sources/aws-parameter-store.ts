
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

	public async load() {
		const params: Params[] = [ ];
		const promises: Promise<Params>[] = [ ];

		// First, fire off all of the load requests

		for (let i = 0; i < this.params.length; i++) {
			promises.push(this.loadIndividualKey(this.params[i]));
		}

		for (let i = 0; i < this.paramPaths.length; i++) {
			promises.push(this.loadPath(this.paramPaths[i]));
		}

		// Next, start unboxing the results as they come in a processing them

		for (let i = 0; i < promises.length; i++) {
			const result = await this.unboxSafe(promises[i]);

			if (result) {
				const keys = Object.keys(result);

				for (let j = 0; j < keys.length; j++) {
					const key = keys[j];
					const value = result[key];

					if (! params[key]) {
						params[key] = value;
					}

					else {
						logDebug(`AwsParameterStoreSource: Ignoring duplicate key param=${key}`);
					}
				}
			}
		}

		return params;
	}

	private loadIndividualKey(param: string) : Promise<Params> {
		logDebug(`AwsParameterStoreSource: Loading individual parameter param=${param}`);

		return new Promise((resolve, reject) => {
			const params: SSM.GetParameterRequest = {
				Name: param,
				WithDecryption: true
			};

			this.client.getParameter(params, (error, data) => {
				if (error) {
					logDebug(`AwsParameterStoreSource: Failed to load individual parameter param=${param} error=${error.code}`);

					return reject(error);
				}

				logDebug(`AwsParameterStoreSource: Loaded individual parameter param=${param}`);
				resolve({ [data.Parameter.Name]: data.Parameter.Value });
			});
		});
	}

	private async loadPath(path: string) : Promise<Params> {
		logDebug(`AwsParameterStoreSource: Loading all parameters in path path=${path}`);

		const params: Params = { };

		let nextToken: string;

		do {
			const result = await this.makeGetParamsByPathCall(path, nextToken);

			nextToken = result.NextToken;

			result.Parameters.forEach((param) => {
				params[param.Name] = param.Value;
			});
		}
		while (nextToken);

		logDebug(`AwsParameterStoreSource: Finished loading parameters in path path=${path}`);

		return params;
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
