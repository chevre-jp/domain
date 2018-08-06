/**
 * 劇場検索
 *
 * @ignore
 */
import * as mongoose from 'mongoose';
import * as chevre from '../lib/index';

mongoose.connect(process.env.MONGOLAB_URI);
chevre.Models.Theater.findOne({ _id: '001' }, (err, theater) => {
    // tslint:disable-next-line:no-console
    console.log(err, theater);
    // mongoose.disconnect();
});
