/* eslint-disable-next-line no-unused-vars */
import dotenv from 'dotenv/config';
import ora from 'ora';
import prompts from 'prompts';
import _ from 'underscore';
import {ZoomAPI} from './zoom.js';

const zoom = new ZoomAPI();

async function onError(error = null, num = 1001) {
	if (error) {
		console.log(`\n❌ [${num}] Error: ${error}\n`);
		process.exit(num);
	}
}

function timeStringToFloat(time) {
	var hoursMinutes = time.split(/[.:]/);
	var hours = parseInt(hoursMinutes[0], 10);
	var minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
	return hours + minutes / 60;
}

const spinner = ora({
	text: `Checking Zoom Access Token`
}).start();

try {
	await zoom.init();
	spinner.succeed();
} catch (e) {
	spinner.fail();
	await onError('Error with the Access Token.', 500);
}

const time = await prompts({
	type: 'date',
	name: 'date',
	message: 'From (YYYY-MM-DD):',
	initial: new Date(),
	mask: 'YYYY-MM-DD'
});

const from = new Date(time.date).toISOString().split('T')[0];
const date = new Date(time.date);
date.setDate(date.getDate() + 30);
const to = date.toISOString().split('T')[0];

spinner.start('Fetching webinar data');

try {
	await zoom.listWebinars(from, to);
	spinner.succeed();
} catch (e) {
	spinner.fail();
	if (e.response.data.code === 300) {
		await onError(
			`The request can only be queried for a month that falls within the last six months.`,
			404
		);
	} else {
		await onError(e, 500);
	}
}

if (zoom.webinars.length > 0) {
	const report = new Object();
	report.dates = [];
	report.month = new Date(time.date).getMonth() + 1;
	report.year = new Date(time.date).getFullYear();

	const dates = [];
	for (const i in zoom.webinars) {
		const iDate = new Date(zoom.webinars[i].start_time)
			.toISOString()
			.split('T')[0];
		const iWebinarMinutes = timeStringToFloat(zoom.webinars[i].duration);
		const iWebinars = 1;
		const iParticipants = parseInt(zoom.webinars[i].participants);
		dates.push({
			date: iDate,
			webinar_minutes: iWebinarMinutes,
			webinars: iWebinars,
			new_users: '',
			participants: iParticipants
		});
	}

	const groupDates = _.groupBy(dates, 'date');
	const groupKeys = _.keys(groupDates);

	for (const i in groupKeys) {
		const cur = groupKeys[i];
		const obj = new Object();

		obj.date = groupDates[cur][i].date;
		if (!_.isNumber(obj.webinar_minutes)) obj.webinar_minutes = 0;
		if (!_.isNumber(obj.webinars)) obj.webinars = 0;
		if (!_.isNumber(obj.new_users)) obj.new_users = 0;
		if (!_.isNumber(obj.participants)) obj.participants = 0;

		for (const j in groupDates[cur]) {
			obj.webinar_minutes =
				obj.webinar_minutes +
				parseFloat(groupDates[cur][j].webinar_minutes.toFixed(2));
			obj.webinars =
				obj.webinars + parseFloat(groupDates[cur][j].webinars.toFixed(2));
			obj.participants =
				obj.participants +
				parseFloat(groupDates[cur][j].participants.toFixed(2));
		}
		report.dates.push(obj);
	}

	console.log(
		`\n\nGet daily webinar usage report: \n\n\n${JSON.stringify(
			report,
			null,
			2
		)}\n\n`
	);
	process.exit(0);
} else {
	await onError('No data found.');
}
