export const API_CONFIG = {

	BASE_URL: 'https://iot.is-informatiques.fr:5001',
	//BASE_URL: 'https://10.0.0.110:5001',

	TIMEOUT: 30000,

	HEADERS: {
		JSON: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		FORM: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Accept': 'application/json',
		},
	},
};