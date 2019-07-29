const fs = require('fs');

const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
const rows = [
    { column: 'A', min: 4, max: 22 },
    { column: 'B', min: 4, max: 22 },
    { column: 'C', min: 3, max: 23 },
    { column: 'D', min: 3, max: 23 },
    { column: 'E', min: 3, max: 23 },
    { column: 'F', min: 2, max: 24 },
    { column: 'G', min: 2, max: 24 },
    { column: 'H', min: 1, max: 24 },
    { column: 'I', min: 1, max: 24 },
    { column: 'J', min: 1, max: 24 },
    { column: 'K', min: 1, max: 24 },
    { column: 'L', min: 1, max: 24 },
    { column: 'M', min: 1, max: 24 },
    { column: 'N', min: 1, max: 24 },
    { column: 'O', min: 1, max: 24 },
    { column: 'P', min: 1, max: 24 },
    { column: 'Q', min: 1, max: 24 },
    { column: 'R', min: 1, max: 24 },
    { column: 'S', min: 4, max: 21 },
    { column: 'T', min: 4, max: 21 },
    { column: 'U', min: 4, max: 21 },
    { column: 'V', min: 1, max: 24 },
    { column: 'W', min: 1, max: 24 },
];

const seats = [];
columns.forEach((column) => {
    const row = rows.find((r) => r.column === column);

    const seatsByRow = [];
    for (let i = row.min; i <= row.max; i++) {
        seatsByRow.push(
            {
                branchCode: `${column}-${i}`,
                typeOf: 'Seat'
            }
        );
    }

    seats.push(...seatsByRow);
});

console.log(seats);
fs.writeFileSync(`${__dirname}/createSeatsResult.json`, JSON.stringify(seats, null, '    '));
