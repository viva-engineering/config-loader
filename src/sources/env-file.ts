
import { readFile } from 'fs';
import { resolve } from 'path';
import { logDebug } from '../logger';
import { ConfigSource, ConfigSourceParams, Params } from './source';

export interface EnvFileParams extends ConfigSourceParams {
	/** The files to be read as configuration */
	files: string[];

	/** The base path relative to which files will be loaded [default: process.cwd()] */
	rootPath?: string;
}

export class EnvFileSource extends ConfigSource {
	private readonly files: string[];
	private readonly rootPath: string;

	constructor(params: EnvFileParams) {
		super(params);

		this.files = params.files;
		this.failOnMissing = params.failOnMissing;
		this.rootPath = params.rootPath || process.cwd();
	}

	public async load() {
		const contents: Params[] = [ ];
		const promises = this.files.map((file) => this.loadFile(file));

		for (let i = 0; i < promises.length; i++) {
			const file = this.files[i];
			const content = await this.unboxSafe(promises[i]);

			if (content) {
				const params: Params = { };
				const lines = content.split(/\n/g);

				logDebug(`EnvFileSource: Parsing file contents file=${file} lines=${lines.length}`);

				let count = 0;

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i].trim();

					if (line && ! line.startsWith('#') && ! line.startsWith(';')) {
						const chunks = line.split(/:|=(.+)/);

						if (! params[chunks[0]]) {
							count++;
							params[chunks[0]] = chunks[1];
						}

						else {
							logDebug(`EnvFileSource: Ignoring duplicate key file=${file} param=${chunks[0]}`);
						}
					}
				}

				logDebug(`EnvFileSource: Finished parsing file contents file=${file} params=${count}`);

				contents.push(params);
			}
		}

		return contents;
	}

	/**
	 * Reads a file's contents from disk as utf8, essentially just a promisified wrapper around readFile
	 */
	private loadFile(file: string) : Promise<string> {
		const path = resolve(this.rootPath, file);

		logDebug(`EnvFileSource: Loading file contents path=${path}`);

		return new Promise((resolve, reject) => {
			readFile(path, 'utf8', (error, contents) => {
				if (error) {
					logDebug(`EnvFileSource: Error loading file contents path=${path} code=${error.code} message=${error.message}`);

					return reject(error);
				}

				logDebug(`EnvFileSource: Succeeded loading file contents path=${path}`);
				resolve(contents);
			});
		});
	}
}
