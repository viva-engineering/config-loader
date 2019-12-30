
const debug = !! process.env.debug_config_loader;

export const logDebug = (message: string) => {
	if (debug) {
		console.debug(`${(new Date).toISOString()} [config-loader] - ${message}`);
	}
};
