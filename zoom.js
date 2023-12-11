import axios from 'axios';

const AUTH = 'https://zoom.us/oauth';
const API = 'https://api.zoom.us/v2';

export class ZoomAPI {
	constructor() {
		this.webinars = [];
	}

	async init() {
		await this.getAccessToken();
	}

	async getAccessToken() {
		let oauthToken = Buffer.from(
			`${process.env.clientID}:${process.env.clientSecret}`
		).toString('base64');

		let res = await axios({
			method: 'post',
			url: `${AUTH}/token?grant_type=account_credentials&account_id=${process.env.accountID}`,
			headers: {Authorization: `Basic ${oauthToken}`}
		});

		this.access_token = res.data.access_token;
		this.header = {
			Authorization: `Bearer ${res.data.access_token}`,
			'Content-Type': 'application/json'
		};
	}

	async listWebinars(from, to, token) {
		let res = await axios({
			method: 'get',
			url: `${API}/metrics/webinars`,
			headers: this.header,
			params: {
				page_size: 300,
				next_page_token: token ? token : null,
				from,
				to,
				type: 'past'
			}
		});

		this.webinars = this.webinars.concat(res.data.webinars);

		if (res.data.next_page_token) {
			return await this.listWebinars(from, to, res.data.next_page_token);
		} else {
			return this.webianrs;
		}
	}
}
