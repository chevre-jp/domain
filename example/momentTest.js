const Moment = require('moment');
const MomentRange = require('moment-range');

const moment = MomentRange.extendMoment(Moment);
const timeInterval = '2004-04-01T12:00:00+09:00/2007-08-31T15:00:00+09:00'
const range = moment.range(timeInterval);

console.log(range.start);
console.log(range.end);
