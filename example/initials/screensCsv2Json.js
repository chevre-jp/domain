const fs = require('fs');
const csvSync = require('csv-parse/lib/sync'); // requiring sync module

const file = `${__dirname}/screens.csv`;
let data = fs.readFileSync(file);

const csvDate = csvSync(data);

const screens = csvDate.map((data, i) => {
    const numSeats = Number(data[7]);
    console.log(numSeats);

    return {
        "containsPlace": [
            {
                "branchCode": "Default",
                "name": {
                    "ja": "デフォルトセクション",
                    "en": "Default Section"
                },
                "containsPlace": [...Array(numSeats)].map((_, i) => {
                    return {
                        "branchCode": `0000${i + 1}`.slice(-4),
                        "typeOf": "Seat"
                    }
                })
                ,
                "typeOf": "ScreeningRoomSection"
            }
        ],
        "address": {
            "ja": "",
            "en": ""
        },
        "branchCode": `000${i + 1}`.slice(-3),
        "name": {
            "ja": data[3],
            "en": data[4]
        },
        "typeOf": "ScreeningRoom"
    };
});

fs.writeFileSync(`${__dirname}/screens.json`, JSON.stringify(screens, null, '    '));

console.log('json created');