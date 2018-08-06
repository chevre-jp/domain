"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 劇場検索
 *
 * @ignore
 */
const mongoose = require("mongoose");
const chevre = require("../lib/index");
mongoose.connect(process.env.MONGOLAB_URI);
chevre.Models.Theater.findOne({ _id: '001' }, (err, theater) => {
    // tslint:disable-next-line:no-console
    console.log(err, theater);
    // mongoose.disconnect();
});
